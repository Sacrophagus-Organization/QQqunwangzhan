import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { unlinkSync } from 'node:fs';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { sanitizeRichHtml } from '../lib/sanitize.js';
import { getAttachments, getAttachmentsMap, safeParseTags } from '../lib/attachments.js';
import { deleteImagesFromHtml } from '../lib/imageCleanup.js';

const router = Router();

// All record routes require auth
router.use(authMiddleware);

// Get all records (支持可选分页 ?page=&limit=，无参数时返回全部数组以向后兼容)
router.get('/', (req: AuthRequest, res) => {
  const rows = db.prepare(
    "SELECT r.*, (SELECT COUNT(*) FROM likes WHERE entity_type='record' AND entity_id=r.id) as like_count FROM records r ORDER BY r.pinned DESC, r.sort_order ASC, r.date DESC"
  ).all() as any[];
  const ids = rows.map(r => r.id);
  // 批量查询附件，消除 N+1 问题
  const attMap = getAttachmentsMap('record', ids);
  const records = rows.map(r => ({
    ...r,
    likeCount: r.like_count,
    tags: safeParseTags(r.tags),
    attachments: attMap[r.id] || [],
  }));

  const limit = parseInt(req.query.limit as string);
  const page = parseInt(req.query.page as string);
  if (!isNaN(limit) && limit > 0) {
    const p = !isNaN(page) && page > 0 ? page : 1;
    const offset = (p - 1) * limit;
    const total = records.length;
    res.json({ data: records.slice(offset, offset + limit), page: p, limit, total, totalPages: Math.ceil(total / limit) });
    return;
  }
  res.json(records);
});

// Get single record
router.get('/:id', (req: AuthRequest, res) => {
  const row = db.prepare(
    "SELECT r.*, (SELECT COUNT(*) FROM likes WHERE entity_type='record' AND entity_id=r.id) as like_count FROM records r WHERE id = ?"
  ).get(req.params.id) as any;
  if (!row) { res.status(404).json({ error: '记录不存在' }); return; }
  res.json({ ...row, likeCount: row.like_count, tags: safeParseTags(row.tags), attachments: getAttachments('record', row.id) });
});

// Create record
router.post('/', (req: AuthRequest, res) => {
  const { title, content, summary, date, tags, importance } = req.body;
  if (!title) { res.status(400).json({ error: '标题必填' }); return; }
  const id = 'rec-' + uuid().slice(0, 8);
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO records (id, title, content, summary, date, tags, author, author_id, importance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, title, sanitizeRichHtml(content || ''), summary || '', date || new Date().toISOString().split('T')[0],
    JSON.stringify(tags || []), req.userName, req.userId, importance || 'normal', now, now
  );
  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(id) as any;
  res.status(201).json({ ...record, tags: safeParseTags(record.tags), attachments: [] });
});

// Update record
router.put('/:id', (req: AuthRequest, res) => {
  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id) as any;
  if (!record) { res.status(404).json({ error: '记录不存在' }); return; }
  if (record.author_id !== req.userId && req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '无权限编辑' }); return;
  }
  const { title, content, summary, tags, importance, pinned, sortOrder } = req.body;
  db.prepare(`UPDATE records SET title=?, content=?, summary=?, tags=?, importance=?, pinned=?, sort_order=?, updated_at=? WHERE id=?`).run(
    title || record.title,
    content !== undefined ? sanitizeRichHtml(content) : record.content,
    summary ?? record.summary,
    JSON.stringify(tags ?? safeParseTags(record.tags)),
    importance || record.importance,
    pinned !== undefined ? (pinned ? 1 : 0) : (record.pinned || 0),
    sortOrder !== undefined ? sortOrder : (record.sort_order || 0),
    new Date().toISOString(), req.params.id
  );
  const updated = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id) as any;
  res.json({ ...updated, tags: safeParseTags(updated.tags), attachments: getAttachments('record', updated.id) });
});

// Delete record
router.delete('/:id', (req: AuthRequest, res) => {
  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id) as any;
  if (!record) { res.status(404).json({ error: '记录不存在' }); return; }
  if (record.author_id !== req.userId && req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '无权限删除' }); return;
  }
  // Delete attachment files first
  const atts = db.prepare('SELECT * FROM attachments WHERE entity_type=? AND entity_id=?').all('record', req.params.id) as any[];
  atts.forEach((a: any) => { try { unlinkSync(a.file_path); } catch {} });
  db.prepare('DELETE FROM attachments WHERE entity_type=? AND entity_id=?').run('record', req.params.id);
  // 清理关联的评论与点赞
  db.prepare('DELETE FROM comments WHERE entity_type=? AND entity_id=?').run('record', req.params.id);
  db.prepare('DELETE FROM likes WHERE entity_type=? AND entity_id=?').run('record', req.params.id);
  // 清理正文内容中引用的图片文件
  deleteImagesFromHtml(record.content);
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

export default router;
