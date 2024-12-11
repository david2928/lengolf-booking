// utils/scheduler.js

const cron = require('node-cron');
const cacheService = require('../services/cache/memoryCache.js');
const { DateTime } = require('luxon');
const logger = require('./logger');


/**
 * Function to fetch and cache availability for the next 5 days.
 */
async function fetchAndCacheAvailability() {
    try {
        const today = DateTime.local().startOf('day'); // Current day at 00:00
        const dates = [];

        for (let i = 0; i < 5; i++) { // Next 5 days including today
            const date = today.plus({ days: i }).toISODate(); // 'YYYY-MM-DD'
            dates.push(date);
        }

        // Fetch availability for all dates in parallel
        await Promise.all(dates.map(date => cacheService.refreshAvailableStartTimesCache(date)));

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
