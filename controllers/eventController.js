// controllers/eventController.js

const { db, admin } = require('../services/firebaseService');
const logger = require('../utils/logger');

/**
 * Log a page visit event
 */
exports.logPageVisit = async (req, res) => {
    const { visitorId } = req.body;

    try {
        await db.collection('events').add({
            eventType: 'page_visit',
            visitorId: visitorId || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(200).json({ success: true, message: 'Page visit logged.' });
    } catch (error) {
        logger.error('Error logging page visit:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

/**
 * Log a login event
 */
exports.logLoginEvent = async (req, res) => {
    const userId = req.user.userId;
    const { visitorId } = req.body;

    try {
        await db.collection('events').add({
            eventType: 'login',
            userId,
            visitorId: visitorId || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(200).json({ success: true, message: 'Login event logged.' });
    } catch (error) {
        logger.error('Error logging login event:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};
