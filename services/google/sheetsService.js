// services/google/sheetsService.js

const { google } = require('googleapis');
const { googleApiConfig } = require('../../config');
const logger = require('../../utils/logger');

/**
 * Obtain an authenticated Sheets client using GoogleAuth.
 * @returns {Object} - Authenticated Sheets client.
 */
async function getSheetsClient() {
    try {
        const authClient = await googleApiConfig.googleAuth.getClient();
        logger.info('Authenticated Sheets client created successfully.');
        return google.sheets({ version: 'v4', auth: authClient });
    } catch (error) {
        logger.error('Error creating Sheets client:', error);
        throw error;
    }
}

/**
 * Get all customer data from Google Sheets.
 * @returns {Array} - Array of customer rows.
 */
async function getAllCustomers() {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: googleApiConfig.SPREADSHEET_ID,
            range: 'Customers!A1:E', // Updated range to include 'Login Source'
        });

        const rows = response.data.values || [];
        return rows;
    } catch (error) {
        logger.error('Error fetching customer data from Google Sheets:', error);
        throw error;
    }
}

/**
 * Update a specific row in Google Sheets.
 * @param {number} rowNumber - Row number to update (1-based index).
 * @param {Array} values - Array of values to set.
 */
async function updateCustomerRow(rowNumber, values) {
    try {
        const sheets = await getSheetsClient();
        await sheets.spreadsheets.values.update({
            spreadsheetId: googleApiConfig.SPREADSHEET_ID,
            range: `Customers!A${rowNumber}:E${rowNumber}`, // Updated range
            valueInputOption: 'RAW',
            resource: {
                values: [values],
            },
        });
        logger.info(`Updated customer row ${rowNumber} successfully.`);
    } catch (error) {
        logger.error(`Error updating customer row ${rowNumber}:`, error);
        throw error;
    }
}

/**
 * Append a new customer row to Google Sheets.
 * @param {Array} values - Array of values to append.
 */
async function appendCustomerRow(values) {
    try {
        const sheets = await getSheetsClient();
        await sheets.spreadsheets.values.append({
            spreadsheetId: googleApiConfig.SPREADSHEET_ID,
            range: 'Customers!A:E', // Updated range
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [values],
            },
        });
        logger.info('Appended new customer row successfully.');
    } catch (error) {
        logger.error('Error appending customer row:', error);
        throw error;
    }
}

module.exports = {
    getAllCustomers,
    updateCustomerRow,
    appendCustomerRow,
};
