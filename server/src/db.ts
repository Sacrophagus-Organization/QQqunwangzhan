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

  CREATE TABLE IF NOT EXISTS mail_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    provider TEXT NOT NULL DEFAULT 'local',
    provider_account_id TEXT NOT NULL DEFAULT '',
    credential_ref TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mail_messages (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    provider_message_id TEXT NOT NULL DEFAULT '',
    thread_id TEXT NOT NULL DEFAULT '',
    folder TEXT NOT NULL DEFAULT 'inbox',
    from_address TEXT NOT NULL,
    from_name TEXT NOT NULL DEFAULT '',
    to_addresses TEXT NOT NULL DEFAULT '[]',
    cc_addresses TEXT NOT NULL DEFAULT '[]',
    bcc_addresses TEXT NOT NULL DEFAULT '[]',
    subject TEXT NOT NULL DEFAULT '',
    body_html TEXT NOT NULL DEFAULT '',
    body_text TEXT NOT NULL DEFAULT '',
    is_read INTEGER NOT NULL DEFAULT 0,
    is_starred INTEGER NOT NULL DEFAULT 0,
    has_attachments INTEGER NOT NULL DEFAULT 0,
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    received_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_likes_entity ON likes(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_mail_messages_owner_folder ON mail_messages(owner_user_id, folder, received_at);
  CREATE INDEX IF NOT EXISTS idx_mail_messages_account ON mail_messages(account_id);

  CREATE TABLE IF NOT EXISTS mail_admin_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT '',
    target_id TEXT NOT NULL DEFAULT '',
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mail_bots (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    domain TEXT NOT NULL DEFAULT 'example.com',
    display_name TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mail_bot_rules (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    trigger_keyword TEXT NOT NULL,
    reply_subject TEXT NOT NULL DEFAULT '',
    reply_body TEXT NOT NULL DEFAULT '',
    delay_seconds INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mail_bot_submissions (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    from_address TEXT NOT NULL,
    trigger_keyword TEXT NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Rule-to-rule prerequisites (direct connections between rules)
  CREATE TABLE IF NOT EXISTS mail_bot_rule_prerequisites (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL,
    prerequisite_rule_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (rule_id) REFERENCES mail_bot_rules(id) ON DELETE CASCADE,
    FOREIGN KEY (prerequisite_rule_id) REFERENCES mail_bot_rules(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_rule_prerequisites_rule ON mail_bot_rule_prerequisites(rule_id);
  -- TTT 飺õĹ飬֧ǰ TTT
  CREATE TABLE IF NOT EXISTS mail_bot_trigger_groups (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mail_bot_trigger_group_rules (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    trigger_keyword TEXT NOT NULL,
    reply_subject TEXT NOT NULL DEFAULT '',
    reply_body TEXT NOT NULL DEFAULT '',
    delay_seconds INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    node_x REAL NOT NULL DEFAULT 0,
    node_y REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (group_id) REFERENCES mail_bot_trigger_groups(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mail_bot_trigger_group_deps (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    from_rule_id TEXT NOT NULL,
    to_rule_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (group_id) REFERENCES mail_bot_trigger_groups(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_trigger_group_deps_group ON mail_bot_trigger_group_deps(group_id);

  -- Track per-user per-rule completion status within trigger groups
  CREATE TABLE IF NOT EXISTS mail_bot_trigger_progress (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    from_address TEXT NOT NULL,
    triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(group_id, rule_id, from_address),
    FOREIGN KEY (group_id) REFERENCES mail_bot_trigger_groups(id) ON DELETE CASCADE
  );



  -- ══?剧情模块 ══?

CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    cover TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT '',
    author_id TEXT NOT NULL DEFAULT '',
    bgm TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS story_scenes (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    background TEXT NOT NULL DEFAULT '',
    bgm TEXT NOT NULL DEFAULT '',
    bgm_volume REAL NOT NULL DEFAULT 0.3,
    "order" INTEGER NOT NULL DEFAULT 0,
    transition TEXT NOT NULL DEFAULT 'none',
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS story_lines (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    scene_id TEXT NOT NULL DEFAULT '',
    speaker TEXT NOT NULL DEFAULT 'narrator',
    character_name TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL DEFAULT '',
    left_image TEXT NOT NULL DEFAULT '',
    right_image TEXT NOT NULL DEFAULT '',
    effect TEXT NOT NULL DEFAULT 'none',
    sfx TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS story_characters (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    default_sprite TEXT NOT NULL DEFAULT '',
    name_tag_color TEXT NOT NULL DEFAULT '#c9a96e',
    sprites TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS story_choices (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    line_id TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL DEFAULT '',
    target_line_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS story_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    story_id TEXT NOT NULL,
    scene_index INTEGER NOT NULL DEFAULT 0,
    line_index INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, story_id)
  );

  CREATE INDEX IF NOT EXISTS idx_story_scenes_story ON story_scenes(story_id, "order");
  CREATE INDEX IF NOT EXISTS idx_story_lines_story ON story_lines(story_id, "order");
  CREATE INDEX IF NOT EXISTS idx_story_choices_story ON story_choices(story_id);
  CREATE INDEX IF NOT EXISTS idx_story_progress_user ON story_progress(user_id, story_id);
`);

// Migration: mail_bot_rules title column and mail_bot_rule_prerequisites table
try { db.exec("ALTER TABLE mail_bot_rules ADD COLUMN title TEXT NOT NULL DEFAULT ''"); console.log("[DB] Added title column to mail_bot_rules (migration)"); } catch {}

try {
  db.exec("CREATE TABLE IF NOT EXISTS mail_bot_rule_prerequisites (" +
    "id TEXT PRIMARY KEY, " +
    "rule_id TEXT NOT NULL, " +
    "prerequisite_rule_id TEXT NOT NULL, " +
    "created_at TEXT NOT NULL DEFAULT (datetime('now')), " +
    "FOREIGN KEY (rule_id) REFERENCES mail_bot_rules(id) ON DELETE CASCADE, " +
    "FOREIGN KEY (prerequisite_rule_id) REFERENCES mail_bot_rules(id) ON DELETE CASCADE" +
  ")");
  db.exec("CREATE INDEX IF NOT EXISTS idx_rule_prerequisites_rule ON mail_bot_rule_prerequisites(rule_id)");
  console.log("[DB] mail_bot_rule_prerequisites table ensured (migration)");
} catch {}


// Migration: add columns for existing databases
try { db.exec('ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT "active"'); console.log('[DB] Added status column (migration)'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN register_reason TEXT NOT NULL DEFAULT ""'); console.log('[DB] Added register_reason 字段 column (migration)'); } catch {}
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

// Seed new page_access routes added after initial installation.
try {
  db.prepare('INSERT OR IGNORE INTO page_access (id, route_path, route_name, access_level, is_enabled, description) VALUES (?, ?, ?, ?, ?, ?)')
    .run('pa-mail', '/mail', '企业邮箱', 'member', 1, 'WebMail 企业邮箱工作台');
  db.prepare('INSERT OR IGNORE INTO page_access (id, route_path, route_name, access_level, is_enabled, description) VALUES (?, ?, ?, ?, ?, ?)')
    .run('pa-settings-mail', '/settings/mail', '邮箱设置', 'member', 1, '企业邮箱申请与配置');
  db.prepare('INSERT OR IGNORE INTO page_access (id, route_path, route_name, access_level, is_enabled, description) VALUES (?, ?, ?, ?, ?, ?)')
    .run('pa-juqing', '/juqing', '剧情播放', 'public', 1, '视觉小说剧情播放器');
  db.prepare('INSERT OR IGNORE INTO page_access (id, route_path, route_name, access_level, is_enabled, description) VALUES (?, ?, ?, ?, ?, ?)')
    .run('pa-juqing-editor', '/juqing/editor', '剧情编辑器', 'admin', 1, '剧本编辑器（仅管理员/编辑可见）');
  db.prepare('INSERT OR IGNORE INTO page_access (id, route_path, route_name, access_level, is_enabled, description) VALUES (?, ?, ?, ?, ?, ?)')
    .run('pa-mail-admin', '/mail/admin', '邮件管理', 'admin', 1, '邮箱管理后台（仅管理员可见）');
  db.prepare('INSERT OR IGNORE INTO page_access (id, route_path, route_name, access_level, is_enabled, description) VALUES (?, ?, ?, ?, ?, ?)')
    .run('pa-mail-admin-bots', '/mail/admin/bots', 'Bot管理', 'admin', 1, 'Bot自动回复管理（仅管理员可见）');
} catch {}

// Seed page_access - 初始化所有页面访问配?
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