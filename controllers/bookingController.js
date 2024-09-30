// controllers/bookingController.js

const bookingService = require('../services/bookingService');
const customerService = require('../services/customerService'); // Add this line
const logger = require('../utils/logger');


/**
 * Get available slots for a specific date, first checking the Redis cache.
 */
exports.getAvailableSlots = async (req, res) => {
    const dateStr = req.query.date; // Expected format: 'YYYY-MM-DD'

    if (!dateStr) {
        return res.status(400).json({ success: false, message: 'Date parameter is required.' });
    }

    try {
        const availableSlots = await bookingService.getAvailableSlots(dateStr);
        return res.status(200).json({ success: true, availableSlots });
    } catch (error) {
        logger.error('Error fetching available slots:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

/**
 * Book a slot for a user.
 */
exports.bookSlot = async (req, res) => {
    const { userId, userName, email, phoneNumber, numberOfPeople, date, startTime, duration } = req.body;

    // Basic validation
    if (!userId || !userName || !email || !phoneNumber || !numberOfPeople || !date || !startTime || !duration) {
        return res.status(400).json({ success: false, message: 'Missing required booking parameters.' });
    }

    if (duration < 1 || duration > 5) {
        return res.status(400).json({ success: false, message: 'Duration must be between 1 and 5 hours.' });
    }

    try {
        const booking = await bookingService.createBooking(date, startTime, duration, userId, userName, phoneNumber, numberOfPeople, email);

        if (!booking) {
            return res.status(409).json({ success: false, message: 'No available bays for the selected time and duration.' });
        }

        // Save or update customer data with latest phone number and email
        await customerService.saveOrUpdateCustomerData({ userId, name: userName, email, phoneNumber });

        return res.status(200).json({
            success: true,
            message: `Booking confirmed for ${booking.bay} from ${booking.startTime} for ${booking.duration} hour(s).`,
            assignedBay: booking.bay,
            startTime: booking.startTime,
            duration: booking.duration,
        });
    } catch (error) {
        logger.error('Error processing booking:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};