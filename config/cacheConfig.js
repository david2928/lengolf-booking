// config/cacheConfig.js
const NodeCache = require('node-cache');
const logger = require('../utils/logger');

const cacheConfig = new NodeCache({
    stdTTL: 600, // 10 minutes default TTL
    checkperiod: 60, // Check for expired keys every minute
    deleteOnExpire: true,
});

cacheConfig.on('error', (err) => {
    logger.error('Cache Client Error', err);
});

logger.info('Memory cache initialized');

module.exports = cacheConfig;