const express = require('express');
const router = express.Router();
const cacheService = require('../../services/cache/memoryCache');
const logger = require('../../utils/logger');

// POST /api/util/clear-cache
router.post('/clear-cache', async (req, res) => {
    try {
        await cacheService.clearCache();
        res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
        logger.error('Error clearing cache:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

module.exports = router;