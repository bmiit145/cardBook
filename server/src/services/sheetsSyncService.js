const { getSheetsClient, isConfigured, getSpreadsheetId, EXPECTED_HEADERS } = require('../config/googleSheets');
const { getDb } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Format contact row values array for Google Sheets
 */
function mapContactToRowValues(contact, frontUrl = '', backUrl = '') {
  return [
    contact.id,
    contact.fullName || '',
    contact.company?.name || contact.companyName || '',
    contact.designation || '',
    contact.phone || '',
    contact.alternatePhone || '',
    contact.email || '',
    contact.website || '',
    contact.address || '',
    contact.city || '',
    contact.state || '',
    contact.country || '',
    frontUrl || '',
    backUrl || '',
    contact.createdAt ? new Date(contact.createdAt).toISOString() : new Date().toISOString(),
    new Date().toISOString(),
  ];
}

/**
 * Ensure header row exists in the Google Spreadsheet
 */
async function ensureHeaders(sheets, spreadsheetId, sheetName = 'Sheet1') {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:P1`,
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0 || rows[0].length === 0) {
      // Append headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:P1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [EXPECTED_HEADERS],
        },
      });
      logger.info('Google Sheets headers initialized.');
    }
  } catch (error) {
    logger.error('Error verifying Google Sheets headers', error);
  }
}

/**
 * Find row index for an existing contact ID to prevent duplicate rows on retry
 */
async function findContactRowIndex(sheets, spreadsheetId, contactId, sheetName = 'Sheet1') {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) return null;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === contactId) {
        return i + 1; // 1-based row index in Google Sheets
      }
    }
    return null;
  } catch (error) {
    logger.error(`Error searching row for contact ${contactId}`, error);
    return null;
  }
}

/**
 * Synchronize a specific contact with Google Sheets
 * 
 * @param {string} contactId
 * @returns {Promise<{success: boolean, sheetRowReference?: string, error?: string}>}
 */
async function syncContact(contactId) {
  const db = getDb();

  const syncRecord = await db.googleSheetsSync.findFirst({
    where: { contactId },
  });

  const contact = await db.businessContact.findUnique({
    where: { id: contactId },
    include: {
      company: true,
      images: true,
    },
  });

  if (!contact) {
    return { success: false, error: 'Contact not found' };
  }

  const frontImage = contact.images?.find((img) => img.side === 'FRONT');
  const backImage = contact.images?.find((img) => img.side === 'BACK');
  const frontUrl = frontImage?.secureUrl || '';
  const backUrl = backImage?.secureUrl || '';

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!isConfigured() || !sheets || !spreadsheetId) {
    const errorMsg = 'Google Sheets is not configured with credentials / GOOGLE_SHEET_ID.';
    if (syncRecord) {
      await db.googleSheetsSync.update({
        where: { id: syncRecord.id },
        data: {
          status: 'FAILED',
          retryCount: (syncRecord.retryCount || 0) + 1,
          lastError: errorMsg,
          updatedAt: new Date().toISOString(),
        },
      });
    }
    return { success: false, error: errorMsg };
  }

  try {
    const sheetName = 'Sheet1';
    await ensureHeaders(sheets, spreadsheetId, sheetName);

    // Check if row already exists (either by stored sheetRowReference or scanning Column A)
    let existingRowIndex = null;

    if (syncRecord?.sheetRowReference) {
      const match = syncRecord.sheetRowReference.match(/(\d+)$/);
      if (match) {
        existingRowIndex = parseInt(match[1], 10);
      }
    }

    if (!existingRowIndex) {
      existingRowIndex = await findContactRowIndex(sheets, spreadsheetId, contactId, sheetName);
    }

    const rowValues = mapContactToRowValues(contact, frontUrl, backUrl);
    let finalRowRef = '';

    if (existingRowIndex && existingRowIndex > 1) {
      // Update existing row
      finalRowRef = `${sheetName}!A${existingRowIndex}:P${existingRowIndex}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: finalRowRef,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowValues],
        },
      });
      logger.info(`Updated existing Google Sheets row for contact ${contact.fullName} at ${finalRowRef}`);
    } else {
      // Append new row
      const appendRes = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:P`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowValues],
        },
      });

      finalRowRef = appendRes.data?.updates?.updatedRange || `${sheetName}!A:P`;
      logger.info(`Appended new contact to Google Sheets: ${contact.fullName} (${finalRowRef})`);
    }

    if (syncRecord) {
      await db.googleSheetsSync.update({
        where: { id: syncRecord.id },
        data: {
          status: 'SYNCED',
          spreadsheetId,
          sheetRowReference: finalRowRef,
          lastError: null,
          lastSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    }

    return {
      success: true,
      sheetRowReference: finalRowRef,
    };
  } catch (error) {
    const errorMsg = error.message || 'Unknown Google Sheets API error';
    logger.error(`Failed to sync contact ${contactId} to Google Sheets: ${errorMsg}`);

    if (syncRecord) {
      await db.googleSheetsSync.update({
        where: { id: syncRecord.id },
        data: {
          status: 'FAILED',
          retryCount: (syncRecord.retryCount || 0) + 1,
          lastError: errorMsg,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    return { success: false, error: errorMsg };
  }
}

module.exports = {
  syncContact,
  ensureHeaders,
  mapContactToRowValues,
};

