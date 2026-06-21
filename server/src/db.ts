import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'arkoverseer.db');

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    qq_number TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    register_reason TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL DEFAULT (date('now')),
    tags TEXT NOT NULL DEFAULT '[]',
    author TEXT NOT NULL,
    author_id TEXT NOT NULL,
    importance TEXT NOT NULL DEFAULT 'normal',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS puzzles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'other',
    difficulty TEXT NOT NULL DEFAULT 'medium',
    hint TEXT NOT NULL DEFAULT '',
    solution TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'unsolved',
    author TEXT NOT NULL,
    author_id TEXT NOT NULL,
    solved_by TEXT,
    solved_by_id TEXT,
    solved_at TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wiki_entries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    author TEXT NOT NULL,
    author_id TEXT NOT NULL,
    last_updated TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    name TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT '',
    file_path TEXT NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '',
    is_anonymous INTEGER NOT NULL DEFAULT 0,
    author TEXT NOT NULL,
    author_id TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    parent_id TEXT,
    content TEXT NOT NULL DEFAULT '',
    is_anonymous INTEGER NOT NULL DEFAULT 0,
    author TEXT NOT NULL,
    author_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sarcophagus_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    download_token TEXT,
    token_expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
`);

// Migration: add columns for existing databases
try { db.exec('ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT "active"'); console.log('[DB] Added status column (migration)'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN register_reason TEXT NOT NULL DEFAULT ""'); console.log('[DB] Added register_reason column (migration)'); } catch {}
try { db.exec('ALTER TABLE records ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0'); console.log('[DB] Added pinned column to records'); } catch {}
try { db.exec('ALTER TABLE records ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0'); console.log('[DB] Added sort_order column to records'); } catch {}
try { db.exec('ALTER TABLE wiki_entries ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0'); console.log('[DB] Added pinned column to wiki'); } catch {}
try { db.exec('ALTER TABLE wiki_entries ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0'); console.log('[DB] Added sort_order column to wiki'); } catch {}
try { db.exec('ALTER TABLE puzzles ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0'); console.log('[DB] Added pinned column to puzzles'); } catch {}
try { db.exec('ALTER TABLE puzzles ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0'); console.log('[DB] Added sort_order column to puzzles'); } catch {}
try { db.exec('ALTER TABLE messages ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0'); console.log('[DB] Added pinned column to messages'); } catch {}
try { db.exec('ALTER TABLE messages ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime(\"now\"))'); console.log('[DB] Added updated_at column to messages'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT \"\"'); console.log('[DB] Added avatar_url column to users'); } catch {}

// Seed admin
const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('Admin');
if (!existingAdmin) {
  const hashed = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (id, username, password, qq_number, role, status) VALUES (?, ?, ?, ?, ?, ?)').run('admin-001', 'Admin', hashed, '10000', 'admin', 'active');
  console.log('[DB] Default admin created (Admin / admin123)');
}

export { db, DB_PATH };
