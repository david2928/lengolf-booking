// routes/api/eventRoutes.js

const express = require('express');
const router = express.Router();
const eventController = require('../../controllers/eventController');
const authMiddleware = require('../../middlewares/authMiddleware');

/**
 * @route POST /api/events/visit
 * @desc Log a page visit event
 */
router.post('/visit', eventController.logPageVisit);

/**
 * @route POST /api/events/login
 * @desc Log a login event
 */
router.post('/login', authMiddleware, eventController.logLoginEvent);

module.exports = router;
