/**
 * Local Contact Repository
 * Manages CRUD operations in SQLite and AsyncStorage fallback
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDb } from './database';

const ASYNC_CONTACTS_KEY = 'cardscan_local_contacts';

export const contactRepository = {
  async saveContact(contact) {
    const db = getLocalDb();
    const id = contact.id || `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    if (db) {
      try {
        db.runSync(
          `INSERT OR REPLACE INTO local_contacts (id, server_contact_id, full_name, company, designation, phone, email, address, sync_status, version, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            contact.serverId || null,
            contact.fullName || '',
            contact.company || '',
            contact.designation || '',
            contact.phone || '',
            contact.email || '',
            contact.address || '',
            contact.syncStatus || 'PENDING',
            contact.version || 1,
            now,
          ]
        );
        return { ...contact, id, updatedAt: now };
      } catch (err) {
        console.warn('[contactRepository] SQLite insert error, falling back:', err);
      }
    }

    // AsyncStorage fallback
    const raw = await AsyncStorage.getItem(ASYNC_CONTACTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((c) => c.id === id);
    const record = { ...contact, id, updatedAt: now };

    if (index >= 0) {
      list[index] = record;
    } else {
      list.unshift(record);
    }
    await AsyncStorage.setItem(ASYNC_CONTACTS_KEY, JSON.stringify(list));
    return record;
  },

  async getAllContacts() {
    const db = getLocalDb();
    if (db) {
      try {
        return db.getAllSync('SELECT * FROM local_contacts ORDER BY updated_at DESC');
      } catch (err) {
        console.warn('[contactRepository] SQLite query error, falling back:', err);
      }
    }

    const raw = await AsyncStorage.getItem(ASYNC_CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  async markSynced(id, serverId) {
    const db = getLocalDb();
    const now = new Date().toISOString();

    if (db) {
      try {
        db.runSync(
          'UPDATE local_contacts SET server_contact_id = ?, sync_status = ?, updated_at = ? WHERE id = ?',
          [serverId, 'SYNCED', now, id]
        );
        return true;
      } catch (err) {
        console.warn('[contactRepository] markSynced SQLite error:', err);
      }
    }

    const raw = await AsyncStorage.getItem(ASYNC_CONTACTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const item = list.find((c) => c.id === id);
    if (item) {
      item.server_contact_id = serverId;
      item.sync_status = 'SYNCED';
      item.updated_at = now;
      await AsyncStorage.setItem(ASYNC_CONTACTS_KEY, JSON.stringify(list));
      return true;
    }
    return false;
  },
};

