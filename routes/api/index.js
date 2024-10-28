// routes/api/index.js

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const bookingRoutes = require('./bookingRoutes');
const customerRoutes = require('./customerRoutes');
// Add eventRoutes
const eventRoutes = require('./eventRoutes');

router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/customers', customerRoutes);
// Use eventRoutes
router.use('/events', eventRoutes);

module.exports = router;
