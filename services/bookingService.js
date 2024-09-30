// services/bookingService.js

const { CALENDARS } = require('../config/googleApiConfig');
const calendarService = require('./google/calendarService');
const sheetsService = require('./google/sheetsService');
const cacheService = require('./cache/redisService');
const lineNotifyService = require('./notifications/lineNotifyService');
const logger = require('../utils/logger');
const { DateTime } = require('luxon');

/**
 * Fetch busy times for all bays on a specific date.
 * @param {string} dateStr - Date in 'YYYY-MM-DD' format.
 * @returns {Object} - Mapping of bay names to their busy intervals.
 */
async function fetchAllBaysBusyTimes(dateStr) {
    const busyTimes = {};

    for (const bayName in CALENDARS) {
        const calendarId = CALENDARS[bayName];
        if (!calendarId) continue;

        const busy = await calendarService.fetchBusyTimes(calendarId, dateStr);
        busyTimes[bayName] = busy;
    }

    return busyTimes;
}

/**
 * Determine available start times with maximum durations.
 * Excludes past slots if the date is today.
 * @param {string} dateStr - Date in 'YYYY-MM-DD' format.
 * @returns {Array} - List of available start times with max durations.
 */
async function getAvailableStartTimes(dateStr) {
    const openingHour = 10; // 10:00 AM
    const closingHour = 22; // 10:00 PM
    const maxDuration = 5;  // Maximum 5 hours

    const busyTimes = await fetchAllBaysBusyTimes(dateStr);

    // Initialize availability map for each bay
    const availabilityMap = {};

    for (const bayName in busyTimes) {
        availabilityMap[bayName] = {};
        for (let hour = openingHour; hour < closingHour; hour++) {
            availabilityMap[bayName][hour] = true; // Assume available
        }

        busyTimes[bayName].forEach(event => {
            const startHour = event.start.hour;
            const endHour = event.end.hour;
            for (let hour = startHour; hour < endHour; hour++) {
                if (hour >= openingHour && hour < closingHour) {
                    availabilityMap[bayName][hour] = false;
                }
            }
        });
    }

    // Determine if the selected date is today
    const now = DateTime.now().setZone('Asia/Bangkok');
    const isToday = now.toISODate() === dateStr;

    // Determine available start times with max durations
    const availableSlots = [];

        // If the date is today, set the earliest available hour
    let earliestHour = openingHour;
    if (isToday) {
        earliestHour = now.hour + 1; // Start from the next hour
        if (now.minute > 0) {
            earliestHour += 1; // If current time is past the hour, skip to the next
        }
        if (earliestHour >= closingHour) {
            // No slots available today
            return [];
        }
    }

    for (let startHour = earliestHour; startHour < closingHour; startHour++) {
        // If the date is today, exclude slots that have already started
        if (isToday && startHour < now.hour) {
            continue;
        }

        let slotMaxDuration = 0;

        for (let duration = 1; duration <= maxDuration; duration++) {
            const endHour = startHour + duration;
            if (endHour > closingHour) break; // Exceeds closing time

            let isAvailable = false;

            // Check if any bay is available for the entire duration
            for (const bayName in availabilityMap) {
                let bayAvailable = true;
                for (let hour = startHour; hour < endHour; hour++) {
                    if (!availabilityMap[bayName][hour]) {
                        bayAvailable = false;
                        break;
                    }
                }
                if (bayAvailable) {
                    isAvailable = true;
                    break;
                }
            }

            if (isAvailable) {
                slotMaxDuration = duration;
            } else {
                break; // No longer durations available
            }
        }

        if (slotMaxDuration > 0) {
            availableSlots.push({
                startTime: `${startHour.toString().padStart(2, '0')}:00`,
                maxDuration: slotMaxDuration,
            });
        }
    }

    return availableSlots;
}

/**
 * Get available slots, checking cache first.
 * @param {string} dateStr - Date in 'YYYY-MM-DD' format.
 * @returns {Array} - Available slots.
 */
async function getAvailableSlots(dateStr) {
    const cacheKey = `available_slots_${dateStr}`;

    try {
        // Check Redis cache for available slots using getCache
        const cachedSlots = await cacheService.getCache(cacheKey);
        if (cachedSlots) {
            logger.info(`Serving slots from Redis cache for ${dateStr}`);
            return cachedSlots; // getCache already parses JSON
        }

        // If not in cache, calculate available slots from Google Calendar
        const slots = await getAvailableStartTimes(dateStr);

        // Store the available slots in Redis for 10 minutes (600 seconds) using setCache
        await cacheService.setCache(cacheKey, slots, 600);

        return slots;
    } catch (error) {
        logger.error('Error accessing Redis:', error);
        throw error;
    }
}

/**
 * Assign a bay based on availability.
 * @param {string} dateStr - Date in 'YYYY-MM-DD' format.
 * @param {string} startTime - Start time in 'HH:mm' format.
 * @param {number} duration - Duration in hours.
 * @returns {Object|null} - Assigned bay and booking details.
 */
async function assignBay(dateStr, startTime, duration) {
    const busyTimes = await fetchAllBaysBusyTimes(dateStr);
    const bookingStart = DateTime.fromISO(`${dateStr}T${startTime}`, { zone: 'Asia/Bangkok' }).toUTC();
    const bookingEnd = bookingStart.plus({ hours: duration });

    for (const bayName in CALENDARS) {
        const isAvailable = busyTimes[bayName].every(event => {
            const eventStart = event.start;
            const eventEnd = event.end;
            return bookingEnd <= eventStart || bookingStart >= eventEnd;
        });

        if (isAvailable) {
            return {
                bay: bayName,
                interval: {
                    start: bookingStart.toISO(),
                    end: bookingEnd.toISO(),
                },
            };
        }
    }

    // No available bay found
    return null;
}

/**
 * Create a booking by inserting an event into Google Calendar and sending a LINE notification.
 * @param {string} dateStr - Date in 'YYYY-MM-DD' format.
 * @param {string} startTime - Start time in 'HH:mm' format.
 * @param {number} duration - Duration in hours.
 * @param {string} userId - User ID.
 * @param {string} userName - User's name.
 * @param {string} phoneNumber - User's phone number.
 * @param {number} numberOfPeople - Number of people.
 * @param {string} email - User's email.
 * @returns {Object|null} - Booking details or null if failed.
 */
async function createBooking(dateStr, startTime, duration, userId, userName, phoneNumber, numberOfPeople, email) {
    const assignedBay = await assignBay(dateStr, startTime, duration);

    if (!assignedBay) {
        return null; // No available bay
    }

    const calendarId = CALENDARS[assignedBay.bay];
    const bookingStart = DateTime.fromISO(`${dateStr}T${startTime}`, { zone: 'Asia/Bangkok' });
    const bookingEnd = bookingStart.plus({ hours: duration });

    const event = {
        summary: `${userName} (${phoneNumber}) (${numberOfPeople}) - ${assignedBay.bay}`,
        description: `Name: ${userName}\nEmail: ${email}\nPhone: ${phoneNumber}\nPeople: ${numberOfPeople}`,
        start: {
            dateTime: bookingStart.toUTC().toISO(),
            timeZone: 'UTC',
        },
        end: {
            dateTime: bookingEnd.toUTC().toISO(),
            timeZone: 'UTC',
        },
    };

    try {
        await calendarService.insertEvent(calendarId, event);

        // Send LINE notification
        const bookingDetails = {
            customerName: userName,
            email: email,
            phoneNumber: phoneNumber,
            bookingDate: dateStr,
            bookingStartTime: bookingStart.toFormat('HH:mm'), // 11:00
            bookingEndTime: bookingEnd.toFormat('HH:mm'),     // 12:00
            bayNumber: assignedBay.bay,
            duration: duration,                             // 1
            numberOfPeople: numberOfPeople,                 // 3
        };

        await lineNotifyService.sendBookingNotification(bookingDetails);

        logger.info(`Booking created successfully for userId: ${userId} at bay: ${assignedBay.bay}`);

        return {
            bay: assignedBay.bay,
            startTime: bookingStart.toFormat('HH:mm'),
            duration: duration,
        };
    } catch (error) {
        logger.error('Error creating booking:', error);
        return null;
    }
}

module.exports = {
    getAvailableSlots,
    getAvailableStartTimes,
    createBooking,
};
