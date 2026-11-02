const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

let prisma;
let isPostgresConnected = false;
let fallbackDb = null;

const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'local_db.json');

// Helper for local mock store
function loadLocalDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
      logger.error('Failed reading local DB file, initializing clean state', e);
    }
  }

  const defaultAdminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@12345';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(defaultAdminPassword, salt);

  const initialData = {
    admins: [
      {
        id: crypto.randomUUID(),
        email: process.env.ADMIN_DEFAULT_EMAIL || 'admin@businesscards.com',
        passwordHash,
        name: 'System Administrator',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    companies: [],
    businessContacts: [],
    businessCardImages: [],
    scanHistories: [],
    googleSheetsSyncs: [],
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  return initialData;
}

function saveLocalDb(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    logger.error('Failed to save local DB', err);
  }
}

// Fallback Prisma-compatible interface
function createFallbackClient() {
  let db = loadLocalDb();

  return {
    isFallback: true,
    admin: {
      findUnique: async ({ where }) => {
        db = loadLocalDb();
        if (where.email) {
          return db.admins.find((a) => a.email.toLowerCase() === where.email.toLowerCase()) || null;
        }
        if (where.id) {
          return db.admins.find((a) => a.id === where.id) || null;
        }
        return null;
      },
      findFirst: async ({ where = {} } = {}) => {
        db = loadLocalDb();
        if (where.email) {
          return db.admins.find((a) => a.email.toLowerCase() === where.email.toLowerCase()) || null;
        }
        return db.admins[0] || null;
      },
      update: async ({ where, data }) => {
        db = loadLocalDb();
        const idx = db.admins.findIndex((a) => a.id === where.id || (where.email && a.email.toLowerCase() === where.email.toLowerCase()));
        if (idx === -1) throw new Error('Admin not found');
        db.admins[idx] = {
          ...db.admins[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        saveLocalDb(db);
        return db.admins[idx];
      },
      count: async () => {
        db = loadLocalDb();
        return db.admins.length;
      },
    },

    company: {
      findMany: async ({ where = {}, orderBy = {}, include = {} } = {}) => {
        db = loadLocalDb();
        let list = [...db.companies];
        if (where.name && where.name.contains) {
          const q = where.name.contains.toLowerCase();
          list = list.filter((c) => c.name.toLowerCase().includes(q));
        }
        if (include.contacts || include._count) {
          list = list.map((c) => {
            const contacts = db.businessContacts.filter((bc) => bc.companyId === c.id && !bc.isDeleted);
            return {
              ...c,
              contacts: include.contacts ? contacts : undefined,
              _count: include._count ? { contacts: contacts.length } : undefined,
            };
          });
        }
        return list;
      },
      findUnique: async ({ where, include = {} }) => {
        db = loadLocalDb();
        const c = db.companies.find((item) => item.id === where.id || (where.name && item.name.toLowerCase() === where.name.toLowerCase()));
        if (!c) return null;
        const contacts = db.businessContacts.filter((bc) => bc.companyId === c.id && !bc.isDeleted);
        return {
          ...c,
          contacts: include.contacts ? contacts : undefined,
          _count: include._count ? { contacts: contacts.length } : undefined,
        };
      },
      findFirst: async ({ where, include = {} }) => {
        db = loadLocalDb();
        let list = [...db.companies];
        if (where?.name) {
          list = list.filter((item) => item.name.toLowerCase() === where.name.toLowerCase());
        }
        const c = list[0];
        if (!c) return null;
        const contacts = db.businessContacts.filter((bc) => bc.companyId === c.id && !bc.isDeleted);
        return {
          ...c,
          contacts: include.contacts ? contacts : undefined,
          _count: include._count ? { contacts: contacts.length } : undefined,
        };
      },
      create: async ({ data }) => {
        db = loadLocalDb();
        const record = {
          id: data.id || crypto.randomUUID(),
          name: data.name,
          website: data.website || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.companies.push(record);
        saveLocalDb(db);
        return record;
      },
      update: async ({ where, data }) => {
        db = loadLocalDb();
        const idx = db.companies.findIndex((c) => c.id === where.id);
        if (idx === -1) throw new Error('Company not found');
        db.companies[idx] = {
          ...db.companies[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        saveLocalDb(db);
        return db.companies[idx];
      },
      count: async () => {
        db = loadLocalDb();
        return db.companies.length;
      },
    },

    businessContact: {
      findMany: async ({ where = {}, orderBy = {}, include = {}, skip, take } = {}) => {
        db = loadLocalDb();
        let list = [...db.businessContacts];

        if (where.isDeleted !== undefined) {
          list = list.filter((item) => item.isDeleted === where.isDeleted);
        }

        if (where.companyId) {
          list = list.filter((item) => item.companyId === where.companyId);
        }

        if (where.OR && Array.isArray(where.OR)) {
          list = list.filter((item) => {
            return where.OR.some((cond) => {
              if (cond.fullName?.contains) {
                return (item.fullName || '').toLowerCase().includes(cond.fullName.contains.toLowerCase());
              }
              if (cond.email?.contains) {
                return (item.email || '').toLowerCase().includes(cond.email.contains.toLowerCase());
              }
              if (cond.phone?.contains) {
                return (item.phone || '').toLowerCase().includes(cond.phone.contains.toLowerCase());
              }
              if (cond.designation?.contains) {
                return (item.designation || '').toLowerCase().includes(cond.designation.contains.toLowerCase());
              }
              if (cond.company?.name?.contains) {
                const comp = db.companies.find((c) => c.id === item.companyId);
                return comp && comp.name.toLowerCase().includes(cond.company.name.contains.toLowerCase());
              }
              return false;
            });
          });
        }

        // Include relations
        list = list.map((contact) => {
          const comp = db.companies.find((c) => c.id === contact.companyId);
          const images = db.businessCardImages.filter((img) => img.contactId === contact.id);
          const sheetsSyncs = db.googleSheetsSyncs.filter((s) => s.contactId === contact.id);
          return {
            ...contact,
            company: include.company ? comp || null : undefined,
            images: include.images ? images : undefined,
            sheetsSyncs: include.sheetsSyncs ? sheetsSyncs : undefined,
          };
        });

        // Sort
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (typeof skip === 'number' && typeof take === 'number') {
          return list.slice(skip, skip + take);
        }

        return list;
      },

      findUnique: async ({ where, include = {} }) => {
        db = loadLocalDb();
        const contact = db.businessContacts.find((item) => item.id === where.id);
        if (!contact) return null;

        const comp = db.companies.find((c) => c.id === contact.companyId);
        const images = db.businessCardImages.filter((img) => img.contactId === contact.id);
        const sheetsSyncs = db.googleSheetsSyncs.filter((s) => s.contactId === contact.id);
        const scanHistories = db.scanHistories.filter((h) => h.contactId === contact.id);

        return {
          ...contact,
          company: include.company ? comp || null : undefined,
          images: include.images ? images : undefined,
          sheetsSyncs: include.sheetsSyncs ? sheetsSyncs : undefined,
          scanHistories: include.scanHistories ? scanHistories : undefined,
        };
      },

      findFirst: async ({ where = {} } = {}) => {
        db = loadLocalDb();
        let list = [...db.businessContacts];
        if (where.phone) {
          list = list.filter((c) => c.phone === where.phone);
        }
        if (where.email) {
          list = list.filter((c) => c.email?.toLowerCase() === where.email?.toLowerCase());
        }
        return list[0] || null;
      },

      create: async ({ data }) => {
        db = loadLocalDb();
        const record = {
          id: data.id || crypto.randomUUID(),
          fullName: data.fullName,
          companyId: data.companyId || null,
          designation: data.designation || null,
          phone: data.phone || null,
          alternatePhone: data.alternatePhone || null,
          email: data.email || null,
          website: data.website || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          notes: data.notes || null,
          isDeleted: false,
          deletedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.businessContacts.push(record);
        saveLocalDb(db);
        return record;
      },

      update: async ({ where, data }) => {
        db = loadLocalDb();
        const idx = db.businessContacts.findIndex((c) => c.id === where.id);
        if (idx === -1) throw new Error('Contact not found');
        db.businessContacts[idx] = {
          ...db.businessContacts[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        saveLocalDb(db);
        return db.businessContacts[idx];
      },

      count: async ({ where = {} } = {}) => {
        db = loadLocalDb();
        let list = [...db.businessContacts];
        if (where.isDeleted !== undefined) {
          list = list.filter((item) => item.isDeleted === where.isDeleted);
        }
        return list.length;
      },
    },

    businessCardImage: {
      create: async ({ data }) => {
        db = loadLocalDb();
        const record = {
          id: data.id || crypto.randomUUID(),
          contactId: data.contactId,
          side: data.side || 'FRONT',
          cloudinaryPublicId: data.cloudinaryPublicId,
          cloudinaryAssetId: data.cloudinaryAssetId || null,
          secureUrl: data.secureUrl,
          createdAt: new Date().toISOString(),
        };
        db.businessCardImages.push(record);
        saveLocalDb(db);
        return record;
      },
      findMany: async ({ where = {} } = {}) => {
        db = loadLocalDb();
        if (where.contactId) {
          return db.businessCardImages.filter((img) => img.contactId === where.contactId);
        }
        return db.businessCardImages;
      },
    },

    scanHistory: {
      create: async ({ data }) => {
        db = loadLocalDb();
        const record = {
          id: data.id || crypto.randomUUID(),
          contactId: data.contactId || null,
          originalOcrText: data.originalOcrText || '',
          extractedJson: data.extractedJson || {},
          status: data.status || 'SUCCESS',
          errorMessage: data.errorMessage || null,
          createdAt: new Date().toISOString(),
        };
        db.scanHistories.push(record);
        saveLocalDb(db);
        return record;
      },
      findMany: async ({ where = {}, orderBy = {}, take } = {}) => {
        db = loadLocalDb();
        let list = [...db.scanHistories];
        if (where.status) {
          list = list.filter((s) => s.status === where.status);
        }
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (take) {
          list = list.slice(0, take);
        }
        return list;
      },
      count: async ({ where = {} } = {}) => {
        db = loadLocalDb();
        if (where.status) {
          return db.scanHistories.filter((s) => s.status === where.status).length;
        }
        return db.scanHistories.length;
      },
      delete: async ({ where }) => {
        db = loadLocalDb();
        const idx = db.scanHistories.findIndex((s) => s.id === where.id);
        if (idx !== -1) {
          const removed = db.scanHistories.splice(idx, 1)[0];
          saveLocalDb(db);
          return removed;
        }
        return null;
      },
    },

    googleSheetsSync: {
      create: async ({ data }) => {
        db = loadLocalDb();
        const record = {
          id: data.id || crypto.randomUUID(),
          contactId: data.contactId,
          status: data.status || 'PENDING',
          spreadsheetId: data.spreadsheetId || null,
          sheetRowReference: data.sheetRowReference || null,
          retryCount: data.retryCount || 0,
          lastError: data.lastError || null,
          lastSyncedAt: data.lastSyncedAt || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.googleSheetsSyncs.push(record);
        saveLocalDb(db);
        return record;
      },
      findMany: async ({ where = {}, include = {} } = {}) => {
        db = loadLocalDb();
        let list = [...db.googleSheetsSyncs];
        if (where.status) {
          list = list.filter((s) => s.status === where.status);
        }
        if (include.contact) {
          list = list.map((item) => {
            const contact = db.businessContacts.find((c) => c.id === item.contactId);
            return { ...item, contact };
          });
        }
        return list;
      },
      findFirst: async ({ where = {} } = {}) => {
        db = loadLocalDb();
        if (where.contactId) {
          return db.googleSheetsSyncs.find((s) => s.contactId === where.contactId) || null;
        }
        return db.googleSheetsSyncs[0] || null;
      },
      update: async ({ where, data }) => {
        db = loadLocalDb();
        const idx = db.googleSheetsSyncs.findIndex((s) => s.id === where.id);
        if (idx === -1) throw new Error('Sync record not found');
        db.googleSheetsSyncs[idx] = {
          ...db.googleSheetsSyncs[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        saveLocalDb(db);
        return db.googleSheetsSyncs[idx];
      },
      count: async ({ where = {} } = {}) => {
        db = loadLocalDb();
        if (where.status) {
          return db.googleSheetsSyncs.filter((s) => s.status === where.status).length;
        }
        return db.googleSheetsSyncs.length;
      },
    },

    $transaction: async (fnOrArray) => {
      if (Array.isArray(fnOrArray)) {
        return Promise.all(fnOrArray);
      }
      if (typeof fnOrArray === 'function') {
        return await fnOrArray(fallbackDb);
      }
      return null;
    },
  };
}

// Initialize database
function getDb() {
  if (isPostgresConnected && prisma) {
    return prisma;
  }
  if (fallbackDb) {
    return fallbackDb;
  }
  fallbackDb = createFallbackClient();
  return fallbackDb;
}

async function initDatabase() {
  try {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    // Test PostgreSQL connectivity
    await prisma.$queryRaw`SELECT 1`;
    isPostgresConnected = true;
    logger.info('Connected to PostgreSQL successfully via Prisma.');
    return prisma;
  } catch (err) {
    isPostgresConnected = false;
    logger.warn('PostgreSQL database is currently unreachable at DATABASE_URL.');
    logger.warn('Using persistent local JSON database fallback. You can test all features without interruption.');
    logger.info('When PostgreSQL is available, run `npm run prisma:migrate` to create database tables.');
    fallbackDb = createFallbackClient();
    return fallbackDb;
  }
}

module.exports = {
  getDb,
  initDatabase,
  isPostgresConnected: () => isPostgresConnected,
};

