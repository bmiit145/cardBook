const { getDb } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * List All Companies with Associated Contact Counts
 */
async function getCompanies(req, res) {
  try {
    const db = getDb();
    const search = (req.query.q || '').trim();

    const where = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const companies = await db.company.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { contacts: true },
        },
      },
    });

    return successResponse(res, { companies });
  } catch (error) {
    logger.error('Error fetching companies', error);
    return errorResponse(res, 'Failed to fetch companies', 500);
  }
}

/**
 * Create Company
 */
async function createCompany(req, res) {
  try {
    const { name, website, address, city, state, country } = req.body;
    if (!name || !name.trim()) {
      return errorResponse(res, 'Company name is required', 400);
    }

    const db = getDb();
    const existing = await db.company.findFirst({
      where: { name: name.trim() },
    });

    if (existing) {
      return errorResponse(res, 'A company with this name already exists', 409);
    }

    const company = await db.company.create({
      data: {
        name: name.trim(),
        website: website || null,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || null,
      },
    });

    return successResponse(res, { company }, 'Company created successfully', 201);
  } catch (error) {
    logger.error('Error creating company', error);
    return errorResponse(res, 'Failed to create company', 500);
  }
}

/**
 * Update Company Details
 */
async function updateCompany(req, res) {
  try {
    const { id } = req.params;
    const { name, website, address, city, state, country } = req.body;
    const db = getDb();

    const existing = await db.company.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse(res, 'Company not found', 404);
    }

    const updated = await db.company.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        website: website !== undefined ? website : existing.website,
        address: address !== undefined ? address : existing.address,
        city: city !== undefined ? city : existing.city,
        state: state !== undefined ? state : existing.state,
        country: country !== undefined ? country : existing.country,
      },
    });

    return successResponse(res, { company: updated }, 'Company updated successfully');
  } catch (error) {
    logger.error('Error updating company', error);
    return errorResponse(res, 'Failed to update company', 500);
  }
}

/**
 * Get Contacts of a Specific Company
 */
async function getCompanyContacts(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const company = await db.company.findUnique({
      where: { id },
    });

    if (!company) {
      return errorResponse(res, 'Company not found', 404);
    }

    const contacts = await db.businessContact.findMany({
      where: {
        companyId: id,
        isDeleted: false,
      },
      include: {
        images: true,
        sheetsSyncs: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, {
      company,
      contacts,
    });
  } catch (error) {
    logger.error('Error fetching company contacts', error);
    return errorResponse(res, 'Failed to fetch company contacts', 500);
  }
}

module.exports = {
  getCompanies,
  createCompany,
  updateCompany,
  getCompanyContacts,
};

