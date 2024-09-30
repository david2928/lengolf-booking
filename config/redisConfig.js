// config/redisConfig.js

require('dotenv').config();
const redis = require('redis');
const logger = require('../utils/logger');

const client = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

client.on('error', (err) => {
    logger.error('Redis Client Error', err);
});

client.on('connect', () => {
    logger.info('Connected to Redis');
});

// Connect the client
(async () => {
    try {
        await client.connect();
        logger.info('Redis client connected and ready to use');
    } catch (err) {
        logger.error('Error connecting to Redis:', err);
    }
})();

module.exports = client;
