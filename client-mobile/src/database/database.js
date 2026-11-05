/**
 * Local SQLite Database Manager for CardBook Mobile
 * Initializes local_scans, local_contacts, and sync_queue tables
 * Supports graceful fallback to AsyncStorage on web/unsupported environments
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let sqliteDb = null;

export async function initLocalDatabase() {
  if (Platform.OS === 'web') {
    console.log('[Database] Web platform detected; using AsyncStorage persistence.');
    return null;
  }

  try {
    const SQLite = await import('expo-sqlite');
    if (SQLite && SQLite.openDatabaseSync) {
      sqliteDb = SQLite.openDatabaseSync('cardscan_local.db');
      
      // Execute table creation schema
      sqliteDb.execSync(`
        CREATE TABLE IF NOT EXISTS local_scans (
            id TEXT PRIMARY KEY,
            front_image_path TEXT,
            back_image_path TEXT,
            mobile_ocr_text TEXT,
            server_ocr_text TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_contacts (
            id TEXT PRIMARY KEY,
            server_contact_id TEXT,
            full_name TEXT,
            company TEXT,
            designation TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            sync_status TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            idempotency_key TEXT NOT NULL UNIQUE,
            retry_count INTEGER DEFAULT 0,
            status TEXT NOT NULL,
            last_error TEXT,
            created_at TEXT NOT NULL
        );
      `);
      console.log('[Database] SQLite initialized successfully with local tables.');
      return sqliteDb;
    }
  } catch (err) {
    console.warn('[Database] SQLite not available in current environment, falling back to AsyncStorage:', err.message);
  }
  return null;
}

export function getLocalDb() {
  return sqliteDb;
}

