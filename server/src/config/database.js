const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const { Admin, Company, BusinessContact, ScanHistory } = require('../models');

let isMongoConnected = false;
let mongoClient = null;
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
        email: (process.env.ADMIN_DEFAULT_EMAIL || 'admin@businesscards.com').toLowerCase(),
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

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function normalizeDoc(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
  if (obj._id && !obj.id) obj.id = obj._id.toString();
  return obj;
}

// Fallback Prisma-compatible interface (Local JSON)
function createFallbackClient() {
  let db = loadLocalDb();

  return {
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
      findFirst: async ({ where } = {}) => {
        db = loadLocalDb();
        return db.admins[0] || null;
      },
      create: async ({ data }) => {
        db = loadLocalDb();
        const newAdmin = {
          id: data.id || crypto.randomUUID(),
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          name: data.name || 'System Administrator',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.admins.push(newAdmin);
        saveLocalDb(db);
        return newAdmin;
      },
      update: async ({ where, data }) => {
        db = loadLocalDb();
        const idx = db.admins.findIndex((a) => a.id === where.id);
        if (idx === -1) return null;
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
      findMany: async ({ where = {}, orderBy = {}, take } = {}) => {
        db = loadLocalDb();
        let list = [...db.companies];
        if (take) list = list.slice(0, take);
        return list;
      },
      findUnique: async ({ where }) => {
        db = loadLocalDb();
        return db.companies.find((c) => c.id === where.id) || null;
      },
      findFirst: async ({ where } = {}) => {
        db = loadLocalDb();
        if (where.name) {
          return (
            db.companies.find((c) => c.name.toLowerCase() === where.name.toLowerCase()) || null
          );
        }
        return db.companies[0] || null;
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

        if (where.userId !== undefined) {
          list = list.filter((item) => {
            if (item.userId) {
              return item.userId === where.userId;
            }
            const defaultAdmin = db.admins[0];
            return defaultAdmin && defaultAdmin.id === where.userId;
          });
        }

        if (where.OR && Array.isArray(where.OR)) {
          list = list.filter((item) => {
            return where.OR.some((cond) => {
              if (cond.fullName?.contains) {
                return (item.fullName || '')
                  .toLowerCase()
                  .includes(cond.fullName.contains.toLowerCase());
              }
              if (cond.email?.contains) {
                return (item.email || '')
                  .toLowerCase()
                  .includes(cond.email.contains.toLowerCase());
              }
              if (cond.phone?.contains) {
                return (item.phone || '')
                  .toLowerCase()
                  .includes(cond.phone.contains.toLowerCase());
              }
              if (cond.designation?.contains) {
                return (item.designation || '')
                  .toLowerCase()
                  .includes(cond.designation.contains.toLowerCase());
              }
              if (cond.company?.name?.contains) {
                const comp = db.companies.find((c) => c.id === item.companyId);
                return (
                  comp &&
                  comp.name.toLowerCase().includes(cond.company.name.contains.toLowerCase())
                );
              }
              return false;
            });
          });
        }

        // Include relations
        list = list.map((contact) => {
          const comp = db.companies.find((c) => c.id === contact.companyId);
          const images = db.businessCardImages.filter((img) => img.contactId === contact.id);
          return {
            ...contact,
            company: include.company ? comp || null : undefined,
            images: include.images ? images : undefined,
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
        const scanHistories = db.scanHistories.filter((h) => h.contactId === contact.id);

        return {
          ...contact,
          company: include.company ? comp || null : undefined,
          images: include.images ? images : undefined,
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
          userId: data.userId || null,
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
          branches: data.branches || [],
          notes: data.notes || null,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.businessContacts.push(record);
        saveLocalDb(db);
        return record;
      },

      update: async ({ where, data }) => {
        db = loadLocalDb();
        const idx = db.businessContacts.findIndex((item) => item.id === where.id);
        if (idx === -1) return null;

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
          list = list.filter((c) => c.isDeleted === where.isDeleted);
        }
        if (where.userId !== undefined) {
          list = list.filter((item) => {
            if (item.userId) {
              return item.userId === where.userId;
            }
            const defaultAdmin = db.admins[0];
            return defaultAdmin && defaultAdmin.id === where.userId;
          });
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
          cloudinaryPublicId: data.cloudinaryPublicId || null,
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
        return db.businessCardImages.filter((img) => img.contactId === where.contactId);
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
        if (where.contactId) {
          list = list.filter((h) => h.contactId === where.contactId);
        }
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (take) list = list.slice(0, take);
        return list;
      },
      count: async ({ where = {} } = {}) => {
        db = loadLocalDb();
        let list = [...db.scanHistories];
        if (where.status) {
          list = list.filter((h) => h.status === where.status);
        }
        return list.length;
      },
    },

    $transaction: async (fnOrArray) => {
      if (typeof fnOrArray === 'function') {
        const client = getDb();
        return await fnOrArray(client);
      }
      return null;
    },
  };
}

// MongoDB / Mongoose Client Interface
function createMongoClient() {
  return {
    admin: {
      findUnique: async ({ where }) => {
        let query = null;
        if (where.email) {
          query = Admin.findOne({ email: where.email.toLowerCase() });
        } else if (where.id) {
          query = mongoose.Types.ObjectId.isValid(where.id)
            ? Admin.findById(where.id)
            : Admin.findOne({ _id: where.id });
        }
        if (!query) return null;
        const doc = await query.exec();
        return normalizeDoc(doc);
      },
      findFirst: async ({ where } = {}) => {
        const query = where?.email ? { email: where.email.toLowerCase() } : {};
        const doc = await Admin.findOne(query).exec();
        return normalizeDoc(doc);
      },
      create: async ({ data }) => {
        const created = await Admin.create({
          name: data.name || 'System Administrator',
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          role: data.role || 'admin',
        });
        return normalizeDoc(created);
      },
      update: async ({ where, data }) => {
        const query = mongoose.Types.ObjectId.isValid(where.id)
          ? { _id: where.id }
          : { email: where.email };
        const updated = await Admin.findOneAndUpdate(query, data, { new: true }).exec();
        return normalizeDoc(updated);
      },
      count: async () => {
        return await Admin.countDocuments();
      },
    },

    company: {
      findMany: async ({ where = {}, orderBy = {}, take } = {}) => {
        const q = Company.find({});
        if (orderBy?.name) {
          q.sort({ name: orderBy.name === 'desc' ? -1 : 1 });
        } else {
          q.sort({ createdAt: -1 });
        }
        if (take) q.limit(take);
        const docs = await q.exec();
        return docs.map(normalizeDoc);
      },
      findUnique: async ({ where }) => {
        if (!where?.id) return null;
        const query = mongoose.Types.ObjectId.isValid(where.id)
          ? Company.findById(where.id)
          : Company.findOne({ _id: where.id });
        const doc = await query.exec();
        return normalizeDoc(doc);
      },
      findFirst: async ({ where } = {}) => {
        const query = {};
        if (where?.name) {
          query.name = new RegExp('^' + escapeRegex(where.name.trim()) + '$', 'i');
        }
        const doc = await Company.findOne(query).exec();
        return normalizeDoc(doc);
      },
      create: async ({ data }) => {
        const doc = await Company.create({
          name: data.name,
          website: data.website || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
        });
        return normalizeDoc(doc);
      },
      count: async () => {
        return await Company.countDocuments();
      },
    },

    businessContact: {
      findMany: async ({ where = {}, orderBy = {}, include = {}, skip = 0, take = 50 } = {}) => {
        const filter = {};

        if (where.isDeleted !== undefined) {
          filter.isDeleted = where.isDeleted;
        }

        if (where.companyId) {
          filter.companyId = mongoose.Types.ObjectId.isValid(where.companyId)
            ? where.companyId
            : null;
        }

        if (where.userId !== undefined) {
          const defaultAdmin = await Admin.findOne({ email: process.env.ADMIN_DEFAULT_EMAIL || 'admin@businesscards.com' });
          if (defaultAdmin && (defaultAdmin._id.toString() === where.userId.toString() || defaultAdmin.id === where.userId)) {
            filter.$or = [
              { userId: where.userId },
              { userId: null },
              { userId: { $exists: false } },
            ];
          } else {
            filter.userId = where.userId;
          }
        }

        if (where.OR && Array.isArray(where.OR)) {
          const orConditions = [];
          for (const cond of where.OR) {
            if (cond.fullName?.contains) {
              orConditions.push({ fullName: new RegExp(escapeRegex(cond.fullName.contains), 'i') });
            }
            if (cond.email?.contains) {
              orConditions.push({ email: new RegExp(escapeRegex(cond.email.contains), 'i') });
            }
            if (cond.phone?.contains) {
              orConditions.push({ phone: new RegExp(escapeRegex(cond.phone.contains), 'i') });
            }
            if (cond.designation?.contains) {
              orConditions.push({
                designation: new RegExp(escapeRegex(cond.designation.contains), 'i'),
              });
            }
            if (cond.company?.name?.contains) {
              const matchedCompanies = await Company.find({
                name: new RegExp(escapeRegex(cond.company.name.contains), 'i'),
              }).select('_id');
              const compIds = matchedCompanies.map((c) => c._id);
              if (compIds.length > 0) {
                orConditions.push({ companyId: { $in: compIds } });
              }
            }
          }
          if (orConditions.length > 0) {
            filter.$or = orConditions;
          }
        }

        let q = BusinessContact.find(filter);

        if (include.company) {
          q = q.populate('companyId');
        }

        q.sort({ createdAt: -1 });

        if (typeof skip === 'number') q.skip(skip);
        if (typeof take === 'number') q.limit(take);

        const docs = await q.exec();
        return docs.map((doc) => {
          const item = normalizeDoc(doc);
          if (include.company) {
            item.company = doc.companyId ? normalizeDoc(doc.companyId) : null;
          }
          if (include.images) {
            item.images = doc.images ? doc.images.map(normalizeDoc) : [];
          }
          return item;
        });
      },

      findUnique: async ({ where, include = {} }) => {
        if (!where?.id) return null;
        let q = mongoose.Types.ObjectId.isValid(where.id)
          ? BusinessContact.findById(where.id)
          : BusinessContact.findOne({ _id: where.id });

        if (include.company) {
          q = q.populate('companyId');
        }

        const doc = await q.exec();
        if (!doc) return null;

        const item = normalizeDoc(doc);
        if (include.company) {
          item.company = doc.companyId ? normalizeDoc(doc.companyId) : null;
        }
        if (include.images) {
          item.images = doc.images ? doc.images.map(normalizeDoc) : [];
        }
        if (include.scanHistories) {
          const histories = await ScanHistory.find({ contactId: doc._id }).sort({ createdAt: -1 });
          item.scanHistories = histories.map(normalizeDoc);
        }
        return item;
      },

      findFirst: async ({ where = {} } = {}) => {
        const filter = {};
        if (where.phone) filter.phone = where.phone;
        if (where.email) filter.email = where.email.toLowerCase();
        const doc = await BusinessContact.findOne(filter).exec();
        return normalizeDoc(doc);
      },

      create: async ({ data }) => {
        const doc = await BusinessContact.create({
          fullName: data.fullName,
          userId: data.userId || null,
          companyId: data.companyId || null,
          designation: data.designation || null,
          phone: data.phone || null,
          alternatePhone: data.alternatePhone || null,
          alternatePhones: data.alternatePhones || [],
          email: data.email || null,
          secondaryEmail: data.secondaryEmail || null,
          website: data.website || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          branches: data.branches || [],
          notes: data.notes || null,
          isDeleted: false,
          images: [],
        });
        return normalizeDoc(doc);
      },

      update: async ({ where, data }) => {
        if (!where?.id) return null;
        const query = mongoose.Types.ObjectId.isValid(where.id)
          ? { _id: where.id }
          : { _id: where.id };

        const updateData = { ...data };
        delete updateData.id;

        const updated = await BusinessContact.findOneAndUpdate(query, updateData, {
          new: true,
        }).populate('companyId');

        if (!updated) return null;
        const item = normalizeDoc(updated);
        item.company = updated.companyId ? normalizeDoc(updated.companyId) : null;
        return item;
      },

      count: async ({ where = {} } = {}) => {
        const filter = {};
        if (where.isDeleted !== undefined) {
          filter.isDeleted = where.isDeleted;
        }
        if (where.userId !== undefined) {
          const defaultAdmin = await Admin.findOne({ email: process.env.ADMIN_DEFAULT_EMAIL || 'admin@businesscards.com' });
          if (defaultAdmin && (defaultAdmin._id.toString() === where.userId.toString() || defaultAdmin.id === where.userId)) {
            filter.$or = [
              { userId: where.userId },
              { userId: null },
              { userId: { $exists: false } },
            ];
          } else {
            filter.userId = where.userId;
          }
        }
        return await BusinessContact.countDocuments(filter);
      },
    },

    businessCardImage: {
      create: async ({ data }) => {
        const imageObj = {
          side: data.side || 'FRONT',
          cloudinaryPublicId: data.cloudinaryPublicId || null,
          cloudinaryAssetId: data.cloudinaryAssetId || null,
          secureUrl: data.secureUrl,
          createdAt: new Date(),
        };

        if (data.contactId && mongoose.Types.ObjectId.isValid(data.contactId)) {
          await BusinessContact.findByIdAndUpdate(data.contactId, {
            $push: { images: imageObj },
          });
        }

        return normalizeDoc(imageObj);
      },
      findMany: async ({ where = {} } = {}) => {
        if (!where.contactId || !mongoose.Types.ObjectId.isValid(where.contactId)) return [];
        const contact = await BusinessContact.findById(where.contactId).select('images');
        return contact?.images ? contact.images.map(normalizeDoc) : [];
      },
    },

    scanHistory: {
      create: async ({ data }) => {
        const doc = await ScanHistory.create({
          contactId:
            data.contactId && mongoose.Types.ObjectId.isValid(data.contactId)
              ? data.contactId
              : null,
          originalOcrText: data.originalOcrText || '',
          extractedJson: data.extractedJson || {},
          status: data.status || 'SUCCESS',
          errorMessage: data.errorMessage || null,
        });
        return normalizeDoc(doc);
      },
      findMany: async ({ where = {}, orderBy = {}, take } = {}) => {
        const filter = {};
        if (where.contactId && mongoose.Types.ObjectId.isValid(where.contactId)) {
          filter.contactId = where.contactId;
        }
        const q = ScanHistory.find(filter).sort({ createdAt: -1 });
        if (take) q.limit(take);
        const docs = await q.exec();
        return docs.map(normalizeDoc);
      },
      count: async ({ where = {} } = {}) => {
        const filter = {};
        if (where.status) filter.status = where.status;
        return await ScanHistory.countDocuments(filter);
      },
    },

    $transaction: async (fnOrArray) => {
      if (typeof fnOrArray === 'function') {
        const client = getDb();
        return await fnOrArray(client);
      }
      return null;
    },
  };
}

// Return active DB client
function getDb() {
  if (isMongoConnected && mongoClient) {
    return mongoClient;
  }
  if (fallbackDb) {
    return fallbackDb;
  }
  fallbackDb = createFallbackClient();
  return fallbackDb;
}

// Seed default administrator into MongoDB if empty
async function seedDefaultAdminMongo() {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const email = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@businesscards.com').toLowerCase();
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@12345';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);

      await Admin.create({
        name: 'System Administrator',
        email,
        passwordHash,
        role: 'admin',
      });
      logger.info(`[MongoDB] Initialized default administrator: ${email}`);
    }
  } catch (err) {
    logger.error('[MongoDB] Error seeding default admin:', err.message);
  }
}

// Initialize database connectivity
async function initDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/visiting_cards';

  try {
    logger.info(`[MongoDB] Connecting to MongoDB at ${mongoUri}...`);
    mongoose.set('strictQuery', false);

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
      autoIndex: true,
    });

    isMongoConnected = true;
    mongoClient = createMongoClient();
    logger.info(`[MongoDB] Connected successfully to MongoDB (${mongoUri})`);

    // Ensure default admin exists
    await seedDefaultAdminMongo();

    return mongoClient;
  } catch (err) {
    isMongoConnected = false;
    logger.warn(`[MongoDB] Could not connect to MongoDB at ${mongoUri}: ${err.message}`);
    logger.warn(
      `[MongoDB] Using resilient persistent local storage. Configure MONGODB_URI in server/.env or start MongoDB server to switch to live MongoDB cluster.`
    );

    fallbackDb = createFallbackClient();
    return fallbackDb;
  }
}

module.exports = {
  getDb,
  initDatabase,
  isMongoConnected: () => isMongoConnected,
  mongoose,
  models: {
    Admin,
    Company,
    BusinessContact,
    ScanHistory,
  },
};
