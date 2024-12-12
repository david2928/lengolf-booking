// routes/api/index.js

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const bookingRoutes = require('./bookingRoutes');
const customerRoutes = require('./customerRoutes');
const eventRoutes = require('./eventRoutes');
const utilRoutes = require('./utilRoutes');

router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/customers', customerRoutes);
router.use('/events', eventRoutes);
router.use('/util', utilRoutes);

module.exports = router;