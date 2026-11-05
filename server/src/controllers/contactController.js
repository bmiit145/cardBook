const contactService = require('../services/contactService');
const duplicateService = require('../services/duplicateService');
const { getDb } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Check if the authenticated user is the owner of the contact
 * Default admin owns contacts without userId (legacy migration support)
 */
function isContactOwner(contact, admin) {
  if (!admin || !admin.id) return false;
  if (contact.userId) {
    return contact.userId === admin.id;
  }
  // Contacts without explicit userId belong to default system admin
  return admin.email === 'admin@businesscards.com' || admin.id === 'd55a0721-24ea-4b14-890c-44d96f94b895';
}

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
      contactData.originalOcrText || '',
      req.admin?.id || null
    );

    logger.info(`Contact created successfully for user ${req.admin?.id || 'guest'}: ${newContact.fullName} (${newContact.id})`);

    return successResponse(res, { contact: newContact }, 'Contact saved successfully', 201);
  } catch (error) {
    logger.error('Error creating contact', error);
    return errorResponse(res, `Failed to save contact: ${error.message}`, 500);
  }
}

/**
 * List Contacts with Search, Filter & Pagination
 * Strictly scoped to authenticated user
 */
async function getContacts(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const search = (req.query.q || '').trim();
    const companyId = req.query.companyId;

    // Unauthenticated guests see 0 contacts
    if (!req.admin || !req.admin.id) {
      return successResponse(res, {
        contacts: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      });
    }

    const db = getDb();
    const where = {
      isDeleted: false,
      userId: req.admin.id,
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

    const contacts = await db.businessContact.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        company: true,
        images: true,
      },
    });

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
 * Get Contact By ID (Owner only)
 */
async function getContactById(req, res) {
  try {
    if (!req.admin || !req.admin.id) {
      return errorResponse(res, 'Authentication required to view contact details', 401);
    }

    const { id } = req.params;
    const db = getDb();

    const contact = await db.businessContact.findUnique({
      where: { id },
      include: {
        company: true,
        images: true,
        scanHistories: true,
      },
    });

    if (!contact || contact.isDeleted) {
      return errorResponse(res, 'Contact not found', 404);
    }

    // Access control check
    if (!isContactOwner(contact, req.admin)) {
      return errorResponse(res, 'You do not have permission to view this contact.', 403);
    }

    return successResponse(res, { contact });
  } catch (error) {
    logger.error('Error fetching contact details', error);
    return errorResponse(res, 'Failed to fetch contact', 500);
  }
}

/**
 * Update Existing Contact (Owner only)
 */
async function updateContact(req, res) {
  try {
    if (!req.admin || !req.admin.id) {
      return errorResponse(res, 'Authentication required to update contact', 401);
    }

    const { id } = req.params;
    const updateData = req.body;
    const db = getDb();

    const existing = await db.businessContact.findUnique({
      where: { id },
    });

    if (!existing || existing.isDeleted) {
      return errorResponse(res, 'Contact not found', 404);
    }

    // Access control check
    if (!isContactOwner(existing, req.admin)) {
      return errorResponse(res, 'You do not have permission to modify this contact.', 403);
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
        isFavorite: updateData.isFavorite !== undefined ? updateData.isFavorite : existing.isFavorite,
      },
      include: { company: true },
    });

    return successResponse(res, { contact: updated }, 'Contact updated successfully');
  } catch (error) {
    logger.error('Error updating contact', error);
    return errorResponse(res, 'Failed to update contact', 500);
  }
}

/**
 * Soft-Delete Contact (Owner only)
 */
async function deleteContact(req, res) {
  try {
    if (!req.admin || !req.admin.id) {
      return errorResponse(res, 'Authentication required to delete contact', 401);
    }

    const { id } = req.params;
    const db = getDb();

    const existing = await db.businessContact.findUnique({
      where: { id },
    });

    if (!existing || existing.isDeleted) {
      return errorResponse(res, 'Contact not found', 404);
    }

    // Access control check
    if (!isContactOwner(existing, req.admin)) {
      return errorResponse(res, 'You do not have permission to delete this contact.', 403);
    }

    await db.businessContact.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
      },
    });

    logger.info(`Soft-deleted contact: ${existing.fullName} (${id}) by user ${req.admin.id}`);
    return successResponse(res, {}, 'Contact deleted successfully');
  } catch (error) {
    logger.error('Error deleting contact', error);
    return errorResponse(res, 'Failed to delete contact', 500);
  }
}

/**
 * Check for Duplicate Contacts (Scoped to user's contacts)
 */
async function checkDuplicate(req, res) {
  try {
    const result = await duplicateService.checkDuplicateContact(req.body, req.admin?.id || null);
    return successResponse(res, result);
  } catch (error) {
    logger.error('Error checking duplicates', error);
    return errorResponse(res, 'Failed to check duplicates', 500);
  }
}

/**
 * Export Contacts as CSV or VCF (vCard) - Scoped to user's contacts
 */
async function exportContacts(req, res) {
  try {
    if (!req.admin || !req.admin.id) {
      return errorResponse(res, 'Authentication required to export contacts', 401);
    }

    const db = getDb();
    const format = (req.query.format || 'csv').toLowerCase();

    const contacts = await db.businessContact.findMany({
      where: {
        isDeleted: false,
        userId: req.admin.id,
      },
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
