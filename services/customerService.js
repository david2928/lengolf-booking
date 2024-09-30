// services/customerService.js

const sheetsService = require('./google/sheetsService');
const logger = require('../utils/logger');

/**
 * Get customer data by user ID.
 * @param {string} userId - User ID.
 * @returns {Object|null} - Customer data or null if not found.
 */
async function getCustomerData(userId) {
    const rows = await sheetsService.getAllCustomers();

    // Skip header if present
    const hasHeaders = rows[0][0] === 'UserID';
    const startRow = hasHeaders ? 1 : 0;
    const customerRows = rows.slice(startRow);

    const customerRow = customerRows.find(row => row[0] === userId);
    if (customerRow) {
        return {
            userId: customerRow[0],
            name: customerRow[1],
            email: customerRow[2],
            phoneNumber: customerRow[3],
            loginSource: customerRow[4] || 'Unknown', // Assuming 5th column is Login Source
        };
    } else {
        logger.warn(`No customer data found for userId: ${userId}`);
        return null;
    }
}

/**
 * Save or update customer data in Google Sheets.
 * @param {Object} customerData - Customer data to save or update.
 */
async function saveOrUpdateCustomerData(customerData) {
    const { userId, name, email, phoneNumber, loginSource } = customerData;
    const rows = await sheetsService.getAllCustomers();

    const hasHeaders = rows[0][0] === 'UserID';
    const startRow = hasHeaders ? 1 : 0;
    const customerRows = rows.slice(startRow);
    const rowIndex = customerRows.findIndex(row => row[0] === userId);

    if (rowIndex !== -1) {
        // Update existing row
        await sheetsService.updateCustomerRow(rowIndex + startRow + 1, [userId, name, email, phoneNumber, loginSource || 'Unknown']);
        logger.info(`Updated customer data for userId: ${userId}`);
    } else {
        // Append new row
        await sheetsService.appendCustomerRow([userId, name, email, phoneNumber, loginSource || 'Unknown']);
        logger.info(`Added new customer data for userId: ${userId}`);
    }
}

module.exports = {
    getCustomerData,
    saveOrUpdateCustomerData,
};
