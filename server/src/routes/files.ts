import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
import fs from 'fs';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuid() + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

// Upload files (requires auth)
router.post('/', authMiddleware, upload.array('files', 10), (req: AuthRequest, res) => {
  const files = req.files as Express.Multer.File[];
  const { entityType, entityId } = req.body;
  if (!files || files.length === 0) { res.status(400).json({ error: '请选择文件' }); return; }
  const attachments = files.map(f => {
    const id = 'file-' + uuid().slice(0, 8);
    // multer 的 originalname 可能被 latin1 误编码，转回 utf8
    const name = Buffer.from(f.originalname, 'latin1').toString('utf8');
    db.prepare('INSERT INTO attachments (id, entity_type, entity_id, name, size, mime_type, file_path) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      id, entityType || 'general', entityId || '', name, f.size, f.mimetype, f.path
    );
    return { id, name, size: f.size, type: f.mimetype, dataUrl: `/api/files/${id}`, uploadedAt: new Date().toISOString() };
  });
  res.json(attachments);
});

// Download file
router.get('/:id', (req, res) => {
  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id) as any;
  if (!att) { res.status(404).json({ error: '文件不存在' }); return; }
  if (!fs.existsSync(att.file_path)) { res.status(404).json({ error: '文件已丢失' }); return; }
  res.attachment(att.name);
  res.setHeader('Content-Type', att.mime_type || 'application/octet-stream');
  res.sendFile(att.file_path);
});

// Delete file (auth required)
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id) as any;
  if (!att) { res.status(404).json({ error: '文件不存在' }); return; }
  try { fs.unlinkSync(att.file_path); } catch {}
  db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
