const contactService = require('../services/contactService');
const duplicateService = require('../services/duplicateService');
const { syncContact } = require('../services/sheetsSyncService');
const { getDb } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Create New Business Contact
 */
async function createContact(req, res) {
  try {
    const contactData = req.body;
    
    // Structure uploaded images metadata if sent from review step
    const uploadedImages = [];
    if (contactData.frontImagePublicId && contactData.frontImageSecureUrl) {
      uploadedImages.push({
        side: 'FRONT',
        publicId: contactData.frontImagePublicId,
        secureUrl: contactData.frontImageSecureUrl,
      });
    }
    if (contactData.backImagePublicId && contactData.backImageSecureUrl) {
      uploadedImages.push({
        side: 'BACK',
        publicId: contactData.backImagePublicId,
        secureUrl: contactData.backImageSecureUrl,
      });
    }

    const newContact = await contactService.saveContactWithImages(
      contactData,
      uploadedImages,
      contactData.originalOcrText || ''
    );

    logger.info(`Contact created successfully: ${newContact.fullName} (${newContact.id})`);

    return successResponse(res, { contact: newContact }, 'Contact saved successfully', 201);
  } catch (error) {
    logger.error('Error creating contact', error);
    return errorResponse(res, `Failed to save contact: ${error.message}`, 500);
  }
}

/**
 * List Contacts with Search, Filter & Pagination
 */
async function getContacts(req, res) {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const search = (req.query.q || '').trim();
    const companyId = req.query.companyId;
    const syncStatus = req.query.syncStatus;

    const where = {
      isDeleted: false,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    let contacts = await db.businessContact.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        company: true,
        images: true,
        sheetsSyncs: true,
      },
    });

    // Optional filter by syncStatus in application layer if requested
    if (syncStatus) {
      contacts = contacts.filter((c) => {
        const latestSync = c.sheetsSyncs?.[0];
        return latestSync && latestSync.status === syncStatus.toUpperCase();
      });
    }

    const total = await db.businessContact.count({ where });

    return successResponse(res, {
      contacts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error listing contacts', error);
    return errorResponse(res, 'Failed to fetch contacts', 500);
  }
}

/**
 * Get Contact By ID
 */
async function getContactById(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const contact = await db.businessContact.findUnique({
      where: { id },
      include: {
        company: true,
        images: true,
        sheetsSyncs: true,
        scanHistories: true,
      },
    });

    if (!contact || contact.isDeleted) {
      return errorResponse(res, 'Contact not found', 404);
    }

    return successResponse(res, { contact });
  } catch (error) {
    logger.error('Error fetching contact details', error);
    return errorResponse(res, 'Failed to fetch contact', 500);
  }
}

/**
 * Update Existing Contact
 */
async function updateContact(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const db = getDb();

    const existing = await db.businessContact.findUnique({
      where: { id },
    });

    if (!existing || existing.isDeleted) {
      return errorResponse(res, 'Contact not found', 404);
    }

    let companyId = updateData.companyId || existing.companyId;
    if (updateData.company && typeof updateData.company === 'string') {
      const comp = await contactService.findOrCreateCompany(updateData.company);
      if (comp) companyId = comp.id;
    }

    const updated = await db.businessContact.update({
      where: { id },
      data: {
        fullName: updateData.fullName !== undefined ? updateData.fullName : existing.fullName,
        companyId,
        designation: updateData.designation !== undefined ? updateData.designation : existing.designation,
        phone: updateData.phone !== undefined ? updateData.phone : existing.phone,
        alternatePhone: updateData.alternatePhone !== undefined ? updateData.alternatePhone : existing.alternatePhone,
        email: updateData.email !== undefined ? updateData.email : existing.email,
        website: updateData.website !== undefined ? updateData.website : existing.website,
        address: updateData.address !== undefined ? updateData.address : existing.address,
        city: updateData.city !== undefined ? updateData.city : existing.city,
        state: updateData.state !== undefined ? updateData.state : existing.state,
        country: updateData.country !== undefined ? updateData.country : existing.country,
        notes: updateData.notes !== undefined ? updateData.notes : existing.notes,
      },
      include: { company: true },
    });

    // Requirement: Editing a contact triggers Google Sheets update for existing row
    syncContact(updated.id).catch((syncErr) => {
      logger.warn(`Google Sheets row update deferred: ${syncErr.message}`);
    });

    return successResponse(res, { contact: updated }, 'Contact updated successfully');
  } catch (error) {
    logger.error('Error updating contact', error);
    return errorResponse(res, 'Failed to update contact', 500);
  }
}

/**
 * Soft-Delete Contact
 */
async function deleteContact(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const existing = await db.businessContact.findUnique({
      where: { id },
    });

    if (!existing || existing.isDeleted) {
      return errorResponse(res, 'Contact not found', 404);
    }

    await db.businessContact.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
      },
    });

    logger.info(`Soft-deleted contact: ${existing.fullName} (${id})`);
    return successResponse(res, {}, 'Contact deleted successfully');
  } catch (error) {
    logger.error('Error deleting contact', error);
    return errorResponse(res, 'Failed to delete contact', 500);
  }
}

/**
 * Check for Duplicate Contacts
 */
async function checkDuplicate(req, res) {
  try {
    const result = await duplicateService.checkDuplicateContact(req.body);
    return successResponse(res, result);
  } catch (error) {
    logger.error('Error checking duplicates', error);
    return errorResponse(res, 'Failed to check duplicates', 500);
  }
}

/**
 * Export Contacts as CSV or VCF (vCard)
 */
async function exportContacts(req, res) {
  try {
    const db = getDb();
    const format = (req.query.format || 'csv').toLowerCase();

    const contacts = await db.businessContact.findMany({
      where: { isDeleted: false },
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'vcf' || format === 'vcard') {
      const vcfData = contactService.generateContactsVcf(contacts);
      res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="contacts-${timestamp}.vcf"`);
      return res.status(200).send(vcfData);
    }

    // Default: CSV export
    const csvData = contactService.generateContactsCsv(contacts);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="contacts-${timestamp}.csv"`);
    return res.status(200).send(csvData);
  } catch (error) {
    logger.error('Error exporting contacts', error);
    return errorResponse(res, 'Failed to export contacts', 500);
  }
}

module.exports = {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
  checkDuplicate,
  exportContacts,
};

