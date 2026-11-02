const { getDb } = require('../config/database');
const cloudinaryService = require('./cloudinaryService');
const { syncContact } = require('./sheetsSyncService');
const logger = require('../utils/logger');

/**
 * Find or create company by name
 */
async function findOrCreateCompany(companyName, additionalData = {}) {
  if (!companyName || typeof companyName !== 'string') return null;

  const trimmed = companyName.trim();
  if (!trimmed) return null;

  const db = getDb();
  let company = await db.company.findFirst({
    where: { name: trimmed },
  });

  if (!company) {
    company = await db.company.create({
      data: {
        name: trimmed,
        website: additionalData.website || null,
        address: additionalData.address || null,
        city: additionalData.city || null,
        state: additionalData.state || null,
        country: additionalData.country || null,
      },
    });
    logger.info(`Created new company record: ${company.name} (${company.id})`);
  }

  return company;
}

/**
 * Save new contact with full transactional integrity and Cloudinary rollback safety
 * 
 * @param {object} contactData
 * @param {Array<{side: string, publicId: string, assetId: string, secureUrl: string, isLocal: boolean}>} uploadedImages
 * @param {string} originalOcrText
 */
async function saveContactWithImages(contactData, uploadedImages = [], originalOcrText = '') {
  const db = getDb();

  try {
    // 1. Resolve Company
    let companyId = contactData.companyId || null;
    if (!companyId && contactData.company) {
      const company = await findOrCreateCompany(contactData.company, {
        website: contactData.website,
        address: contactData.address,
        city: contactData.city,
        state: contactData.state,
        country: contactData.country,
      });
      if (company) {
        companyId = company.id;
      }
    }

    // 2. Perform DB creation inside transaction
    const result = await db.$transaction(async (tx) => {
      // Create Contact
      const newContact = await tx.businessContact.create({
        data: {
          fullName: contactData.fullName || 'Unnamed Contact',
          companyId,
          designation: contactData.designation || null,
          phone: contactData.phone || null,
          alternatePhone: contactData.alternatePhone || null,
          email: contactData.email || null,
          website: contactData.website || null,
          address: contactData.address || null,
          city: contactData.city || null,
          state: contactData.state || null,
          country: contactData.country || 'India',
          notes: contactData.notes || null,
        },
      });

      // Save Card Images
      for (const img of uploadedImages) {
        await tx.businessCardImage.create({
          data: {
            contactId: newContact.id,
            side: (img.side || 'FRONT').toUpperCase(),
            cloudinaryPublicId: img.publicId,
            cloudinaryAssetId: img.assetId || null,
            secureUrl: img.secureUrl,
          },
        });
      }

      // Record Scan History
      if (originalOcrText) {
        await tx.scanHistory.create({
          data: {
            contactId: newContact.id,
            originalOcrText,
            extractedJson: contactData,
            status: 'SUCCESS',
          },
        });
      }

      // Create Google Sheets sync job
      await tx.googleSheetsSync.create({
        data: {
          contactId: newContact.id,
          status: 'PENDING',
          retryCount: 0,
        },
      });

      return newContact;
    });

    // 3. Immediately trigger background synchronization attempt
    syncContact(result.id).catch((err) => {
      logger.warn(`Initial Google Sheets background sync attempt deferred: ${err.message}`);
    });

    return result;
  } catch (error) {
    logger.error('Failed to save contact, rolling back uploaded images...', error);
    // Rollback uploaded Cloudinary assets to prevent orphaned files
    await cloudinaryService.cleanupUploadedImages(uploadedImages);
    throw error;
  }
}

/**
 * Generate CSV text from an array of contacts
 */
function generateContactsCsv(contacts) {
  const headers = [
    'Full Name',
    'Company',
    'Designation',
    'Phone',
    'Alternate Phone',
    'Email',
    'Website',
    'Address',
    'City',
    'State',
    'Country',
    'Notes',
    'Created At',
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = contacts.map((c) => [
    escapeCsv(c.fullName),
    escapeCsv(c.company?.name || ''),
    escapeCsv(c.designation),
    escapeCsv(c.phone),
    escapeCsv(c.alternatePhone),
    escapeCsv(c.email),
    escapeCsv(c.website),
    escapeCsv(c.address),
    escapeCsv(c.city),
    escapeCsv(c.state),
    escapeCsv(c.country),
    escapeCsv(c.notes),
    escapeCsv(new Date(c.createdAt).toLocaleDateString()),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Generate VCF (vCard 3.0) file string from an array of contacts
 */
function generateContactsVcf(contacts) {
  const cards = contacts.map((c) => {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${c.fullName || ''}`,
    ];

    if (c.company?.name) {
      lines.push(`ORG:${c.company.name}`);
    }
    if (c.designation) {
      lines.push(`TITLE:${c.designation}`);
    }
    if (c.phone) {
      lines.push(`TEL;TYPE=CELL,VOICE:${c.phone}`);
    }
    if (c.alternatePhone) {
      lines.push(`TEL;TYPE=WORK,VOICE:${c.alternatePhone}`);
    }
    if (c.email) {
      lines.push(`EMAIL;TYPE=INTERNET:${c.email}`);
    }
    if (c.website) {
      lines.push(`URL:${c.website}`);
    }
    if (c.address || c.city || c.state || c.country) {
      // vCard ADR format: PO Box; Extended Address; Street; City; Region; Postal Code; Country
      const street = (c.address || '').replace(/[\r\n,]+/g, ' ');
      const city = c.city || '';
      const region = c.state || '';
      const country = c.country || '';
      lines.push(`ADR;TYPE=WORK:;;${street};${city};${region};;${country}`);
    }
    if (c.notes) {
      lines.push(`NOTE:${c.notes.replace(/[\r\n]+/g, ' ')}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n');
  });

  return cards.join('\r\n\r\n');
}

module.exports = {
  saveContactWithImages,
  findOrCreateCompany,
  generateContactsCsv,
  generateContactsVcf,
};

