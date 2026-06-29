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

  CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, entity_type, entity_id)
  );

  CREATE TABLE IF NOT EXISTS page_access (
    id TEXT PRIMARY KEY,
    route_path TEXT NOT NULL UNIQUE,
    route_name TEXT NOT NULL,
    access_level TEXT NOT NULL DEFAULT 'member',
    is_enabled INTEGER NOT NULL DEFAULT 1,
    description TEXT NOT NULL DEFAULT '',
    updated_by TEXT DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_likes_entity ON likes(entity_type, entity_id);
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
try { db.exec('ALTER TABLE users ADD COLUMN requested_role TEXT NOT NULL DEFAULT \"\"'); console.log('[DB] Added requested_role column to users'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN requested_role_reason TEXT NOT NULL DEFAULT \"\"'); console.log('[DB] Added requested_role_reason column to users'); } catch {}

// Seed page_access - 初始化所有页面访问配置
const seedPageAccess = db.transaction(() => {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM page_access').get() as { cnt: number };
  if (existing.cnt > 0) return;

  const pages = [
    { id: 'pa-home', route_path: '/', route_name: '首页', access_level: 'member', is_enabled: 1, description: '网站首页' },
    { id: 'pa-records', route_path: '/records', route_name: '破译战绩', access_level: 'member', is_enabled: 1, description: '群友战绩记录' },
    { id: 'pa-puzzles', route_path: '/puzzles', route_name: '谜题广场', access_level: 'member', is_enabled: 1, description: '谜题展示与解答' },
    { id: 'pa-wiki', route_path: '/wiki', route_name: '知识库', access_level: 'member', is_enabled: 1, description: '群知识文档' },
    { id: 'pa-messages', route_path: '/messages', route_name: '留言板', access_level: 'member', is_enabled: 1, description: '群友留言板' },
    { id: 'pa-sarcophagus', route_path: '/sarcophagus', route_name: '石棺终端', access_level: 'member', is_enabled: 1, description: '石棺功能入口' },
    { id: 'pa-admin', route_path: '/lynchpin-admin', route_name: '管理面板', access_level: 'admin', is_enabled: 1, description: '网站管理控制台' },
    { id: 'pa-sarcophagus-admin', route_path: '/sarcophagus/admin', route_name: '石棺管理', access_level: 'admin', is_enabled: 1, description: '石棺管理后台' },
    { id: 'pa-test', route_path: '/test', route_name: '测试页', access_level: 'admin', is_enabled: 1, description: '功能测试页面' },
    { id: 'pa-record-detail', route_path: '/records/:id', route_name: '战绩详情', access_level: 'member', is_enabled: 1, description: '单条战绩详情' },
    { id: 'pa-comments', route_path: '/comments', route_name: '评论(共享)', access_level: 'member', is_enabled: 1, description: '评论系统（共享资源，由父页面控制）' },
    { id: 'pa-likes', route_path: '/likes', route_name: '点赞(共享)', access_level: 'member', is_enabled: 1, description: '点赞系统（共享资源，由父页面控制）' },
  ];

  const insert = db.prepare('INSERT INTO page_access (id, route_path, route_name, access_level, is_enabled, description) VALUES (?, ?, ?, ?, ?, ?)');
  for (const p of pages) {
    insert.run(p.id, p.route_path, p.route_name, p.access_level, p.is_enabled, p.description);
  }
  console.log('[DB] 已初始化 10 条页面访问配置');
});
seedPageAccess();

// Seed admin - 密码从环境变量 ADMIN_PASSWORD 读取，未设置则跳过
const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('Admin');
if (!existingAdmin) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.warn('[DB] WARNING: ADMIN_PASSWORD 环境变量未设置，跳过默认管理员创建');
    console.warn('[DB] 请设置: export ADMIN_PASSWORD=<您的管理员密码>');
  } else {
    const hashed = bcrypt.hashSync(adminPassword, 10);
    db.prepare('INSERT INTO users (id, username, password, qq_number, role, status) VALUES (?, ?, ?, ?, ?, ?)').run('admin-001', 'Admin', hashed, '10000', 'admin', 'active');
    console.log('[DB] 管理员账号已创建 (Admin)');
  }
}

export { db, DB_PATH };
