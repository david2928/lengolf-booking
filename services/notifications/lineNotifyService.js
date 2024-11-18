// services/notifications/lineNotifyService.js

const fetch = require('node-fetch');
const { LINE_NOTIFY_TOKEN } = require('../../config/googleApiConfig');
const logger = require('../../utils/logger');

/**
 * Send a booking notification to LINE Notify.
 * @param {Object} bookingDetails - Details of the booking.
 */
async function sendBookingNotification(bookingDetails) {
    const message = createLineMessage(bookingDetails);

    if (!message) {
        logger.warn('Booking details are missing or incorrect.');
        return;
    }

    const options = {
        method: 'POST',
        body: new URLSearchParams({ message }),
        headers: {
            'Authorization': `Bearer ${LINE_NOTIFY_TOKEN}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    };

    try {
        const response = await fetch('https://notify-api.line.me/api/notify', options);
        const responseText = await response.text();
        logger.info(`LINE Notify response: ${responseText}`);
    } catch (error) {
        logger.error('Error sending LINE notification:', error);
    }
}

/**
 * Create a formatted LINE message from booking details.
 * @param {Object} details - Booking details.
 * @returns {string|null} - Formatted message or null if invalid.
 */
function createLineMessage(details) {
    const { customerName, email, phoneNumber, bookingDate, bookingStartTime, bookingEndTime, bayNumber } = details;

    if (!customerName || !phoneNumber || !bookingDate || !bookingStartTime || !bookingEndTime || !bayNumber) {
        return null;
    }

    return `Booking Notification
Name: ${customerName}
Email: ${email}
Phone: ${phoneNumber}
Date: ${bookingDate}
Time: ${bookingStartTime} - ${bookingEndTime}
Bay: ${bayNumber}

This booking has been auto-confirmed. No need to re-confirm with the customer. Please double check bay selection.`;
}

module.exports = {
    sendBookingNotification,
};
