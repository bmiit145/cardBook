-- CardScan AI - Mobile Offline SQLite Database Schema

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

