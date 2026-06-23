import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { unlinkSync } from 'node:fs';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All record routes require auth
router.use(authMiddleware);

// Get all records
router.get('/', (_req: AuthRequest, res) => {
  const rows = db.prepare(
    "SELECT r.*, (SELECT COUNT(*) FROM likes WHERE entity_type='record' AND entity_id=r.id) as like_count FROM records r ORDER BY r.pinned DESC, r.sort_order ASC, r.date DESC"
  ).all() as any[];
  const records = rows.map(r => ({
    ...r,
    likeCount: r.like_count,
    tags: JSON.parse(r.tags || '[]'),
    attachments: getAttachments('record', r.id),
  }));
  res.json(records);
});

// Get single record
router.get('/:id', (req: AuthRequest, res) => {
  const row = db.prepare(
    "SELECT r.*, (SELECT COUNT(*) FROM likes WHERE entity_type='record' AND entity_id=r.id) as like_count FROM records r WHERE id = ?"
  ).get(req.params.id) as any;
  if (!row) { res.status(404).json({ error: '记录不存在' }); return; }
  res.json({ ...row, likeCount: row.like_count, tags: JSON.parse(row.tags || '[]'), attachments: getAttachments('record', row.id) });
});

// Create record
router.post('/', (req: AuthRequest, res) => {
  const { title, content, summary, date, tags, importance } = req.body;
  if (!title) { res.status(400).json({ error: '标题必填' }); return; }
  if (typeof content === 'string' && content.length > 500000) {
    res.status(400).json({ error: '记录内容不能超过500000字符（含图片）' }); return;
  }
  const id = 'rec-' + uuid().slice(0, 8);
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO records (id, title, content, summary, date, tags, author, author_id, importance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, title, content || '', summary || '', date || new Date().toISOString().split('T')[0],
    JSON.stringify(tags || []), req.userName, req.userId, importance || 'normal', now, now
  );
  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(id) as any;
  res.status(201).json({ ...record, tags: JSON.parse(record.tags || '[]'), attachments: [] });
});

// Update record
router.put('/:id', (req: AuthRequest, res) => {
  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id) as any;
  if (!record) { res.status(404).json({ error: '记录不存在' }); return; }
  if (record.author_id !== req.userId && req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '无权限编辑' }); return;
  }
  const { title, content, summary, tags, importance, pinned, sortOrder } = req.body;
  if (typeof content === 'string' && content.length > 500000) {
    res.status(400).json({ error: '记录内容不能超过500000字符（含图片）' }); return;
  }
  db.prepare(`UPDATE records SET title=?, content=?, summary=?, tags=?, importance=?, pinned=?, sort_order=?, updated_at=? WHERE id=?`).run(
    title || record.title, content ?? record.content, summary ?? record.summary,
    JSON.stringify(tags ?? JSON.parse(record.tags || '[]')),
    importance || record.importance,
    pinned !== undefined ? (pinned ? 1 : 0) : (record.pinned || 0),
    sortOrder !== undefined ? sortOrder : (record.sort_order || 0),
    new Date().toISOString(), req.params.id
  );
  const updated = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id) as any;
  res.json({ ...updated, tags: JSON.parse(updated.tags || '[]'), attachments: getAttachments('record', updated.id) });
});

// Delete record
router.delete('/:id', (req: AuthRequest, res) => {
  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id) as any;
  if (!record) { res.status(404).json({ error: '记录不存在' }); return; }
  if (record.author_id !== req.userId && req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '无权限删除' }); return;
  }
  // Delete attachments first
  const atts = db.prepare('SELECT * FROM attachments WHERE entity_type=? AND entity_id=?').all('record', req.params.id) as any[];
  atts.forEach((a: any) => { try { unlinkSync(a.file_path); } catch {} });
  db.prepare('DELETE FROM attachments WHERE entity_type=? AND entity_id=?').run('record', req.params.id);
  db.prepare('DELETE FROM records WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Pin/unpin record
router.post('/:id/pin', (req: AuthRequest, res) => {
  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id) as any;
  if (!record) { res.status(404).json({ error: '记录不存在' }); return; }
  if (req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '无权限操作' }); return;
  }
  const newPinned = record.pinned ? 0 : 1;
  db.prepare('UPDATE records SET pinned=? WHERE id=?').run(newPinned, req.params.id);
  res.json({ success: true, pinned: !!newPinned });
});

function getAttachments(type: string, entityId: string) {
  return (db.prepare('SELECT * FROM attachments WHERE entity_type=? AND entity_id=?').all(type, entityId) as any[])
    .map(a => ({ id: a.id, name: a.name, size: a.size, type: a.mime_type, dataUrl: `/api/files/${a.id}`, uploadedAt: a.uploaded_at }));
}

export default router;
