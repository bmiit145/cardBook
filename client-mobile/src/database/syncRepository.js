/**
 * Sync Queue Repository
 * Tracks pending operations to push to the server when network is restored
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDb } from './database';

const ASYNC_SYNC_QUEUE_KEY = 'cardscan_sync_queue';

export const syncRepository = {
  async enqueue(entityType, entityId, operation, payload) {
    const db = getLocalDb();
    const id = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = `${entityType}_${entityId}_${Date.now()}`;
    const now = new Date().toISOString();

    const record = {
      id,
      entityType,
      entityId,
      operation,
      idempotencyKey,
      retryCount: 0,
      status: 'PENDING',
      lastError: null,
      createdAt: now,
      payload,
    };

    if (db) {
      try {
        db.runSync(
          `INSERT INTO sync_queue (id, entity_type, entity_id, operation, idempotency_key, retry_count, status, last_error, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, entityType, entityId, operation, idempotencyKey, 0, 'PENDING', null, now]
        );
      } catch (err) {
        console.warn('[syncRepository] SQLite enqueue error:', err);
      }
    }

    const raw = await AsyncStorage.getItem(ASYNC_SYNC_QUEUE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push(record);
    await AsyncStorage.setItem(ASYNC_SYNC_QUEUE_KEY, JSON.stringify(list));
    return record;
  },

  async getPending() {
    const raw = await AsyncStorage.getItem(ASYNC_SYNC_QUEUE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.filter((item) => item.status === 'PENDING' || item.status === 'FAILED');
  },

  async markComplete(idempotencyKey) {
    const raw = await AsyncStorage.getItem(ASYNC_SYNC_QUEUE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const updated = list.map((item) =>
      item.idempotencyKey === idempotencyKey ? { ...item, status: 'SYNCED' } : item
    );
    await AsyncStorage.setItem(ASYNC_SYNC_QUEUE_KEY, JSON.stringify(updated));

    const db = getLocalDb();
    if (db) {
      try {
        db.runSync('UPDATE sync_queue SET status = ? WHERE idempotency_key = ?', ['SYNCED', idempotencyKey]);
      } catch (e) {
        // silent
      }
    }
  },

  async markFailed(idempotencyKey, errorMsg) {
    const raw = await AsyncStorage.getItem(ASYNC_SYNC_QUEUE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const updated = list.map((item) =>
      item.idempotencyKey === idempotencyKey
        ? { ...item, status: 'FAILED', retryCount: (item.retryCount || 0) + 1, lastError: errorMsg }
        : item
    );
    await AsyncStorage.setItem(ASYNC_SYNC_QUEUE_KEY, JSON.stringify(updated));
  },
};

