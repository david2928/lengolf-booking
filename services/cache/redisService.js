// services/cache/redisService.js

const redisClient = require('../../config/redisConfig');
const logger = require('../../utils/logger');

/**
 * Get data from Redis cache.
 * @param {string} key - The cache key.
 * @returns {Object|null} - Parsed JSON data or null.
 */
async function getCache(key) {
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        logger.error('Redis GET error:', error);
        throw error;
    }
}

/**
 * Set data in Redis cache with expiration.
 * @param {string} key - The cache key.
 * @param {Object} value - The data to cache.
 * @param {number} expirationInSeconds - Expiration time in seconds.
 */
async function setCache(key, value, expirationInSeconds) {
    try {
        await redisClient.setEx(key, expirationInSeconds, JSON.stringify(value));
    } catch (error) {
        logger.error('Redis SET error:', error);
        throw error;
    }
}

/**
 * Refresh available start times cache.
 * @param {string} dateStr - Date in 'YYYY-MM-DD' format.
 */
async function refreshAvailableStartTimesCache(dateStr) {
    try {
        const bookingService = require('../bookingService'); // Import here to avoid circular dependency
        const availableSlots = await bookingService.getAvailableStartTimes(dateStr);
        const cacheKey = `available_slots_${dateStr}`;
        await setCache(cacheKey, availableSlots, 600); // Cache for 10 minutes
        logger.info(`Refreshed available slots cache for ${dateStr}`);
    } catch (error) {
        logger.error(`Error refreshing available slots cache for ${dateStr}:`, error);
    }
}

module.exports = {
    getCache,
    setCache,
    client: redisClient, // Exported as 'client' for direct access if necessary
    refreshAvailableStartTimesCache,
};
