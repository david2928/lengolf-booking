const cron = require('node-cron');
const bookingService = require('../services/bookingService');
const logger = require('./logger');

/**
 * Fetch and cache availability for the next 5 days.
 */
async function fetchAndCacheAvailability() {
    try {
        await bookingService.refreshAvailabilityForNextDays(5);
        logger.info('Availability data refreshed and cached successfully for the next 5 days.');
    } catch (error) {
        logger.error('Error fetching and caching availability:', error);
    }
}

// Schedule the task to run every 2 minutes
cron.schedule('*/2 * * * *', () => {
    logger.info('Running scheduled task: fetchAndCacheAvailability');
    fetchAndCacheAvailability();
});

// Optionally, run the task immediately on server start
fetchAndCacheAvailability();

module.exports = {};
