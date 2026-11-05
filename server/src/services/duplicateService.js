const { getDb } = require('../config/database');

/**
 * Clean phone string for fuzzy comparison (digits only)
 */
function normalizePhone(str) {
  if (!str) return '';
  return str.replace(/\D/g, '').slice(-10); // compare last 10 digits
}

/**
 * Check if contact data matches any existing non-deleted contact
 * 
 * @param {object} contactData - { phone, email, fullName, company, excludeId }
 * @param {string|null} userId - optional user ID for tenant isolation
 * @returns {Promise<{isDuplicate: boolean, duplicates: Array<{contact: object, matchReason: string}>}>}
 */
async function checkDuplicateContact(contactData, userId = null) {
  const db = getDb();
  const { phone, email, fullName, company, excludeId } = contactData;

  const where = { isDeleted: false };
  if (userId) {
    where.userId = userId;
  }

  const allContacts = await db.businessContact.findMany({
    where,
    include: { company: true },
  });

  const duplicates = [];
  const targetNormPhone = normalizePhone(phone);
  const targetEmail = (email || '').trim().toLowerCase();
  const targetName = (fullName || '').trim().toLowerCase();
  const targetCompany = (company || '').trim().toLowerCase();

  for (const existing of allContacts) {
    if (excludeId && existing.id === excludeId) continue;

    const existingNormPhone = normalizePhone(existing.phone);
    const existingNormAltPhone = normalizePhone(existing.alternatePhone);
    const existingEmail = (existing.email || '').trim().toLowerCase();
    const existingName = (existing.fullName || '').trim().toLowerCase();
    const existingCompanyName = (existing.company?.name || '').trim().toLowerCase();

    // Check Phone Match
    if (targetNormPhone && (targetNormPhone === existingNormPhone || targetNormPhone === existingNormAltPhone)) {
      duplicates.push({
        contact: existing,
        matchReason: 'Matching phone number',
        field: 'phone',
      });
      continue;
    }

    // Check Email Match
    if (targetEmail && targetEmail === existingEmail) {
      duplicates.push({
        contact: existing,
        matchReason: 'Matching email address',
        field: 'email',
      });
      continue;
    }

    // Check Name + Company Match
    if (targetName && targetCompany && existingName === targetName && existingCompanyName === targetCompany) {
      duplicates.push({
        contact: existing,
        matchReason: 'Identical contact name and company',
        field: 'name_company',
      });
      continue;
    }
  }

  return {
    isDuplicate: duplicates.length > 0,
    duplicates,
  };
}

module.exports = {
  checkDuplicateContact,
  normalizePhone,
};

