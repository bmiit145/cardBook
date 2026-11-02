const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let sheetsClient = null;
let isConfigured = false;

const EXPECTED_HEADERS = [
  'Contact ID',
  'Full Name',
  'Company',
  'Designation',
  'Mobile',
  'Alternate Mobile',
  'Email',
  'Website',
  'Address',
  'City',
  'State',
  'Country',
  'Card Front URL',
  'Card Back URL',
  'Created Date',
  'Last Updated',
];

function initGoogleSheets() {
  try {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const resolvedPath = credPath ? path.resolve(process.cwd(), credPath) : null;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (resolvedPath && fs.existsSync(resolvedPath) && spreadsheetId) {
      const auth = new google.auth.GoogleAuth({
        keyFile: resolvedPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      sheetsClient = google.sheets({ version: 'v4', auth });
      isConfigured = true;
      logger.info('Google Sheets API client initialized successfully.');
    } else {
      logger.warn('Google Sheets credentials or GOOGLE_SHEET_ID not configured in .env.');
      isConfigured = false;
    }
  } catch (error) {
    logger.error('Error initializing Google Sheets client', error);
    isConfigured = false;
  }
}

initGoogleSheets();

module.exports = {
  getSheetsClient: () => sheetsClient,
  isConfigured: () => isConfigured,
  getSpreadsheetId: () => process.env.GOOGLE_SHEET_ID,
  EXPECTED_HEADERS,
  reinit: initGoogleSheets,
};

