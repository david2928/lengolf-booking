// controllers/customerController.js

const customerService = require('../services/customerService');
const logger = require('../utils/logger');

/**
 * Get customer data by user ID.
 */
exports.getCustomerDataById = async (userId) => {
    try {
        const customerData = await customerService.getCustomerData(userId);
        return customerData;
    } catch (error) {
        logger.error(`Error getting customer data for userId ${userId}:`, error);
        throw error;
    }
};

/**
 * Save or update customer data.
 */
exports.saveOrUpdateCustomerData = async (customerData) => {
    try {
        await customerService.saveOrUpdateCustomerData(customerData);
    } catch (error) {
        logger.error('Error saving/updating customer data:', error);
        throw error;
    }
};
