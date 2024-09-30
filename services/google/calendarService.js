// services/google/calendarService.js

const { google } = require('googleapis');
const { googleApiConfig } = require('../../config');
const { DateTime } = require('luxon');
const logger = require('../../utils/logger');

/**
 * Obtain an authenticated Calendar client using GoogleAuth.
 * @returns {Object} - Authenticated Calendar client.
 */
async function getCalendarClient() {
    try {
        const authClient = await googleApiConfig.googleAuth.getClient();
        logger.info('Authenticated Calendar client created successfully.');
        return google.calendar({ version: 'v3', auth: authClient });
    } catch (error) {
        logger.error('Error creating Calendar client:', error);
        throw error;
    }
}

/**
 * Fetch busy times for a specific calendar and date.
 * @param {string} calendarId - Google Calendar ID.
 * @param {string} dateStr - Date in 'YYYY-MM-DD' format.
 * @returns {Array} - Array of busy time intervals.
 */
async function fetchBusyTimes(calendarId, dateStr) {
    const calendar = await getCalendarClient();
    const startOfDay = DateTime.fromISO(`${dateStr}T00:00:00`, { zone: 'Asia/Bangkok' }).toUTC().toISO();
    const endOfDay = DateTime.fromISO(`${dateStr}T23:59:59`, { zone: 'Asia/Bangkok' }).toUTC().toISO();

    const freebusyRequest = {
        requestBody: {
            timeMin: startOfDay,
            timeMax: endOfDay,
            items: [{ id: calendarId }],
        },
    };

    try {
        const freebusy = await calendar.freebusy.query(freebusyRequest);
        const busy = freebusy.data.calendars[calendarId]?.busy || [];
        return busy.map(event => ({
            start: DateTime.fromISO(event.start).setZone('Asia/Bangkok'),
            end: DateTime.fromISO(event.end).setZone('Asia/Bangkok'),
        }));
    } catch (error) {
        logger.error(`Error fetching free/busy for calendar ${calendarId}:`, error);
        return []; // Assume no busy times on error
    }
}

/**
 * Insert an event into a specific calendar.
 * @param {string} calendarId - Google Calendar ID.
 * @param {Object} event - Event object.
 * @returns {Object} - Inserted event.
 */
async function insertEvent(calendarId, event) {
    const calendar = await getCalendarClient();
    try {
        const response = await calendar.events.insert({
            calendarId,
            resource: event,
        });
        logger.info(`Inserted event into calendar ${calendarId} successfully.`);
        return response.data;
    } catch (error) {
        logger.error(`Error inserting event into calendar ${calendarId}:`, error);
        throw error;
    }
}

module.exports = {
    fetchBusyTimes,
    insertEvent,
};
