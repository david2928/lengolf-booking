// routes/api/customerRoutes.js

const express = require('express');
const router = express.Router();
const customerController = require('../../controllers/customerController');
const authMiddleware = require('../../middlewares/authMiddleware');

/**
 * @route GET /api/customers
 * @desc Get customer data by userId
 */
router.get('/', authMiddleware, async (req, res) => {
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'userId parameter is required.' });
    }

    try {
        const customerData = await customerController.getCustomerDataById(userId);
        return res.status(200).json({ success: true, customerData });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
});

module.exports = router;
