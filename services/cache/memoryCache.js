// services/cache/memoryCache.js
const NodeCache = require('node-cache');
const logger = require('../../utils/logger');

class CacheService {
    constructor() {
        this.cache = new NodeCache({
            // Default TTL of 10 minutes (600 seconds) if not specified
            stdTTL: 600,
            // Check for expired keys every 60 seconds
            checkperiod: 60,
            // Delete expired keys automatically
            deleteOnExpire: true,
        });

        // Log when items are removed from cache
        this.cache.on('expired', (key, value) => {
            logger.info(`Cache key expired: ${key}`);
        });

        this.cache.on('error', (err) => {
            logger.error('Cache error:', err);
        });

        logger.info('Memory cache service initialized');
    }

    /**
     * Get data from cache.
     * @param {string} key - The cache key.
     * @returns {Object|null} - Parsed data or null.
     */
    async getCache(key) {
        try {
            const data = this.cache.get(key);
            return data || null;
        } catch (error) {
            logger.error('Cache GET error:', error);
            throw error;
        }
    }

    /**
     * Set data in cache with expiration.
     * @param {string} key - The cache key.
     * @param {Object} value - The data to cache.
     * @param {number} expirationInSeconds - Expiration time in seconds.
     */
    async setCache(key, value, expirationInSeconds) {
        try {
            this.cache.set(key, value, expirationInSeconds);
        } catch (error) {
            logger.error('Cache SET error:', error);
            throw error;
        }
    }

    /**
     * Refresh available start times cache.
     * @param {string} dateStr - Date in 'YYYY-MM-DD' format.
     */
    async refreshAvailableStartTimesCache(dateStr) {
        try {
            const bookingService = require('../bookingService'); // Import here to avoid circular dependency
            const availableSlots = await bookingService.getAvailableStartTimes(dateStr);
            const cacheKey = `available_slots_${dateStr}`;
            await this.setCache(cacheKey, availableSlots, 600); // Cache for 10 minutes
            logger.info(`Refreshed available slots cache for ${dateStr}`);
        } catch (error) {
            logger.error(`Error refreshing available slots cache for ${dateStr}:`, error);
        }
    }

    /**
     * Clear all cached data.
     */
    async clearCache() {
        try {
            this.cache.flushAll();
            logger.info('Cache cleared successfully');
        } catch (error) {
            logger.error('Error clearing cache:', error);
            throw error;
        }
    }

    /**
     * Get cache statistics.
     * @returns {Object} Cache statistics
     */
    getStats() {
        return {
            keys: this.cache.keys(),
            stats: this.cache.getStats(),
        };
    }
}

// Export a singleton instance
module.exports = new CacheService();