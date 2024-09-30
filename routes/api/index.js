// routes/api/index.js

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const bookingRoutes = require('./bookingRoutes');
const customerRoutes = require('./customerRoutes');

// Mount the auth routes at /auth
router.use('/auth', authRoutes);

// Mount the booking routes at /bookings
router.use('/bookings', bookingRoutes);

// Mount the customer routes at /customers
router.use('/customers', customerRoutes);

module.exports = router;
