import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { db } from '../db.js';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'sarco-' + uuid().slice(0, 8) + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

// ─── IP Rate Limiter (in-memory) ────────────────────────────────────
const ipFailMap = new Map<string, { count: number; lockedUntil: number }>();
const MAX_FAILS = 3;
const LOCK_SECONDS = 30;

function checkRateLimit(ip: string): boolean {
  const entry = ipFailMap.get(ip);
  if (!entry) return true;
  if (entry.lockedUntil > Date.now()) return false;
  // lock expired, reset
  if (entry.count >= MAX_FAILS) {
    ipFailMap.delete(ip);
  }
  return true;
}

function recordFail(ip: string) {
  const entry = ipFailMap.get(ip);
  if (!entry) {
    ipFailMap.set(ip, { count: 1, lockedUntil: 0 });
  } else {
    entry.count++;
    if (entry.count >= MAX_FAILS) {
      entry.lockedUntil = Date.now() + LOCK_SECONDS * 1000;
    }
  }
}

function resetFails(ip: string) {
  ipFailMap.delete(ip);
}

// 定期清理过期的限速条目，防止 ipFailMap 内存无限增长
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipFailMap) {
    if (entry.lockedUntil > 0 && entry.lockedUntil < now) ipFailMap.delete(ip);
  }
}, 60_000).unref();

// ─── POST /verify ────────────────────────────────────────────────────
// Requires JWT auth. Body: { code }. Returns download token on success.
router.post('/verify', authMiddleware, (req: AuthRequest, res) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || 'unknown';

  if (!checkRateLimit(ip)) {
    const entry = ipFailMap.get(ip);
    const remaining = entry ? Math.ceil((entry.lockedUntil - Date.now()) / 1000) : 30;
    res.status(429).json({ error: `验证尝试过多，请 ${remaining} 秒后再试` });
    return;
  }

  const { code } = req.body;
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    res.status(400).json({ error: '请输入访问代码' });
    return;
  }

  const row = db.prepare('SELECT * FROM sarcophagus_codes WHERE code = ?').get(code.trim().toUpperCase()) as any;

  if (!row) {
    recordFail(ip);
    const entry = ipFailMap.get(ip);
    const fails = entry?.count || 1;
    const remaining = MAX_FAILS - fails;
    if (remaining > 0) {
      res.status(403).json({ error: `访问代码无效，剩余尝试次数: ${remaining}` });
    } else {
      res.status(429).json({ error: `验证尝试过多，请 ${LOCK_SECONDS} 秒后再试` });
    }
    return;
  }

  // Success: generate download token, 5 min expiry
  resetFails(ip);
  const downloadToken = uuid();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  db.prepare('UPDATE sarcophagus_codes SET download_token = ?, token_expires_at = ? WHERE id = ?')
    .run(downloadToken, expiresAt, row.id);

  res.json({
    success: true,
    downloadToken,
    message: '远程协议验证通过，数据包已就绪',
  });
});

// ─── GET /download/:token ────────────────────────────────────────────
// No JWT required — the token itself is the authorization.
router.get('/download/:token', (req, res) => {
  const token = req.params.token;
  const row = db.prepare(
    'SELECT * FROM sarcophagus_codes WHERE download_token = ?'
  ).get(token) as any;

  if (!row) {
    res.status(404).json({ error: '无效的下载链接' });
    return;
  }

  if (row.token_expires_at && new Date(row.token_expires_at) < new Date()) {
    res.status(410).json({ error: '下载链接已过期，请重新验证' });
    return;
  }

  if (!fs.existsSync(row.file_path)) {
    res.status(404).json({ error: '文件已丢失' });
    return;
  }

  res.attachment(row.file_name);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.sendFile(row.file_path);
});

// ─── CRUD /codes (adminOnly) ────────────────────────────────────────

// List all codes
router.get('/codes', authMiddleware, adminOnly, (_req: AuthRequest, res) => {
  const rows = db.prepare(
    'SELECT id, code, file_name, created_at, updated_at FROM sarcophagus_codes ORDER BY created_at DESC'
  ).all();
  res.json(rows);
});

// Create code + upload file
router.post('/codes', authMiddleware, adminOnly, upload.single('file'), (req: AuthRequest, res) => {
  const { code } = req.body;
  const file = req.file;

  if (!code || !file) {
    res.status(400).json({ error: '请提供访问代码和文件' });
    return;
  }

  // latin1 → utf8 修正中文文件名
  const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');

  const existing = db.prepare('SELECT id FROM sarcophagus_codes WHERE code = ?').get(code.trim().toUpperCase());
  if (existing) {
    // Clean up uploaded file
    try { fs.unlinkSync(file.path); } catch {}
    res.status(409).json({ error: '该访问代码已存在' });
    return;
  }

  const id = 'sarco-' + uuid().slice(0, 8);
  db.prepare(
    'INSERT INTO sarcophagus_codes (id, code, file_name, file_path) VALUES (?, ?, ?, ?)'
  ).run(id, code.trim().toUpperCase(), fileName, file.path);

  res.json({ id, code: code.trim().toUpperCase(), fileName });
});

// Update code (optional file re-upload)
router.put('/codes/:id', authMiddleware, adminOnly, upload.single('file'), (req: AuthRequest, res) => {
  const existing = db.prepare('SELECT * FROM sarcophagus_codes WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }

  const { code: newCode } = req.body;
  const file = req.file;
  const now = new Date().toISOString();

  if (newCode !== undefined) {
    const dup = db.prepare('SELECT id FROM sarcophagus_codes WHERE code = ? AND id != ?')
      .get(newCode.trim().toUpperCase(), req.params.id);
    if (dup) {
      if (file) try { fs.unlinkSync(file.path); } catch {}
      res.status(409).json({ error: '该访问代码已被其他记录使用' });
      return;
    }
    db.prepare('UPDATE sarcophagus_codes SET code = ?, updated_at = ? WHERE id = ?')
      .run(newCode.trim().toUpperCase(), now, req.params.id);
  }

  if (file) {
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    // Delete old file
    try { fs.unlinkSync(existing.file_path); } catch {}
    db.prepare('UPDATE sarcophagus_codes SET file_name = ?, file_path = ?, updated_at = ? WHERE id = ?')
      .run(fileName, file.path, now, req.params.id);
  }

  res.json({ success: true });
});

// Delete code + file
router.delete('/codes/:id', authMiddleware, adminOnly, (req: AuthRequest, res) => {
  const row = db.prepare('SELECT * FROM sarcophagus_codes WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }

  try { fs.unlinkSync(row.file_path); } catch {}
  db.prepare('DELETE FROM sarcophagus_codes WHERE id = ?').run(req.params.id);

  res.json({ success: true });
});

export default router;
