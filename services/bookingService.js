// services/bookingService.js

const { admin, db } = require('./firebaseService'); // Import both admin and db
const { CALENDARS } = require('../config/googleApiConfig');
const calendarService = require('./google/calendarService');
const cacheService = require('./cache/redisService');
const lineNotifyService = require('./notifications/lineNotifyService');
const logger = require('../utils/logger');
const { DateTime } = require('luxon');
const { bookingConfirmationTemplate } = require('../utils/emailTemplates'); // Import the email template
const nodemailer = require('nodemailer'); // Import Nodemailer

// Configure Nodemailer transporter with your SMTP server
const transporter = nodemailer.createTransport({
    host: 'mail.len.golf',
    port: 587,
    secure: false, // Use false since port 587 doesn't use SSL
    auth: {
        user: process.env.EMAIL_USER,     // SMTP username from environment variables
        pass: process.env.EMAIL_PASSWORD, // SMTP password from environment variables
    },
    tls: {
        rejectUnauthorized: false, // Allow self-signed certificates if necessary
    },
});

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
    const closingHour = 23; // 11:00 PM
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
 * Create a booking by inserting an event into Google Calendar and saving it to Firestore.
 * @param {Object} bookingData - Booking details.
 * @returns {Object|null} - Booking details or null if failed.
 */
async function createBooking(bookingData) {
    const { date, startTime, duration, userId, userName, phoneNumber, numberOfPeople, email, loginMethod } = bookingData;

    const assignedBay = await assignBay(date, startTime, duration);

    if (!assignedBay) {
        return null; // No available bay
    }

    const calendarId = CALENDARS[assignedBay.bay];
    const bookingStart = DateTime.fromISO(`${date}T${startTime}`, { zone: 'Asia/Bangkok' });
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

        // Save booking details to Firestore
        const bookingRef = db.collection('bookings').doc(); // Auto-generate ID
        bookingData.bookingId = bookingRef.id; // Add booking ID to data
        bookingData.bay = assignedBay.bay;
        bookingData.createdAt = admin.firestore.FieldValue.serverTimestamp(); // Timestamp

        logger.info(`Saving booking to Firestore with bookingId: ${bookingData.bookingId}`);
        await bookingRef.set(bookingData);

        // Send LINE notification
        const bookingDetailsForLine = {
            customerName: userName,
            email: email,
            phoneNumber: phoneNumber,
            bookingDate: date,
            bookingStartTime: bookingStart.toFormat('HH:mm'),
            bookingEndTime: bookingEnd.toFormat('HH:mm'),
            bayNumber: assignedBay.bay,
            duration: duration,
            numberOfPeople: numberOfPeople,
        };

        await lineNotifyService.sendBookingNotification(bookingDetailsForLine);

        // Prepare booking details for email
        const bookingStartBangkok = bookingStart.setZone('Asia/Bangkok');
        const bookingEndBangkok = bookingEnd.setZone('Asia/Bangkok');

        const bookingDetailsForEmail = {
            userName: userName,
            email: email,
            date: bookingStartBangkok.toFormat('dd/MM/yyyy'),
            startTime: bookingStartBangkok.toFormat('HH:mm'),
            endTime: bookingEndBangkok.toFormat('HH:mm'),
            duration: duration,
            numberOfPeople: numberOfPeople,
        };

        // Send confirmation email
        await sendConfirmationEmail(bookingDetailsForEmail);

        logger.info(`Booking created successfully for userId: ${userId} at bay: ${assignedBay.bay}`);

        return bookingData;
    } catch (error) {
        logger.error('Error creating booking:', error);
        throw error;
    }
}

/**
 * Send a booking confirmation email to the customer.
 * @param {Object} bookingDetails - Details for the booking.
 */
async function sendConfirmationEmail(bookingDetails) {
    const { userName, email, date, startTime } = bookingDetails;

    const mailOptions = {
        from: '"LENGOLF" <notification@len.golf>', // Sender address
        to: email,
        subject: `Your Booking Confirmation for ${date} at ${startTime}`,
        html: bookingConfirmationTemplate(bookingDetails),
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Confirmation email sent to ${email}`);
    } catch (error) {
        logger.error('Error sending confirmation email:', error);
        // Decide whether to throw the error or not
        // throw error;
    }
}

/**
 * Get bookings for a specific user.
 * @param {string} userId - User ID.
 * @returns {Array} - List of bookings.
 */
async function getBookingsByUserId(userId) {
    try {
        const bookingsRef = db.collection('bookings').where('userId', '==', userId);
        const snapshot = await bookingsRef.get();

        if (snapshot.empty) {
            logger.info(`No bookings found for userId: ${userId}`);
            return [];
        }

        const bookings = [];
        snapshot.forEach(doc => {
            bookings.push({ bookingId: doc.id, ...doc.data() });
        });

        return bookings;
    } catch (error) {
        logger.error('Error fetching bookings:', error);
        throw error;
    }
}

/**
 * Update a booking.
 * @param {string} bookingId - Booking ID.
 * @param {Object} updateData - Data to update.
 * @returns {boolean} - Success status.
 */
async function updateBooking(bookingId, updateData) {
    try {
        const bookingRef = db.collection('bookings').doc(bookingId);
        await bookingRef.update(updateData);
        logger.info(`Booking ${bookingId} updated successfully`);
        return true;
    } catch (error) {
        logger.error('Error updating booking:', error);
        throw error;
    }
}

module.exports = {
    getAvailableSlots,
    getAvailableStartTimes,
    createBooking,
    getBookingsByUserId,
    updateBooking
};
