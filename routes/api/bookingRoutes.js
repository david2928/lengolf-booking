// routes/api/bookingRoutes.js

const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/bookingController');
const authMiddleware = require('../../middlewares/authMiddleware');

/**
 * @route GET /api/bookings/available-slots
 * @desc Get available booking slots for a specific date
 */
router.get('/available-slots', authMiddleware, bookingController.getAvailableSlots);

/**
 * @route POST /api/bookings/book-slot
 * @desc Book a slot
 */
router.post('/book-slot', authMiddleware, bookingController.bookSlot);

// Get bookings for the authenticated user
router.get('/my-bookings', authMiddleware, bookingController.getUserBookings);

module.exports = router;
