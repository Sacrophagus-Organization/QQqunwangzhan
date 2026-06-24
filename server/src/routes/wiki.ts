import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { unlinkSync } from 'node:fs';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { sanitizeRichHtml } from '../lib/sanitize.js';
import { getAttachments, getAttachmentsMap, safeParseTags } from '../lib/attachments.js';
import { deleteImagesFromHtml } from '../lib/imageCleanup.js';

const router = Router();
router.use(authMiddleware);

// Get all wiki entries (支持可选分页 ?page=&limit=，无参数时返回全部数组以向后兼容)
router.get('/', (req: AuthRequest, res) => {
  const rows = db.prepare(
    "SELECT w.*, (SELECT COUNT(*) FROM likes WHERE entity_type='wiki' AND entity_id=w.id) as like_count FROM wiki_entries w ORDER BY w.pinned DESC, w.sort_order ASC, w.created_at DESC"
  ).all() as any[];
  const ids = rows.map(r => r.id);
  const attMap = getAttachmentsMap('wiki', ids);
  const entries = rows.map(r => ({ ...r, likeCount: r.like_count, tags: safeParseTags(r.tags), attachments: attMap[r.id] || [] }));

  const limit = parseInt(req.query.limit as string);
  const page = parseInt(req.query.page as string);
  if (!isNaN(limit) && limit > 0) {
    const p = !isNaN(page) && page > 0 ? page : 1;
    const offset = (p - 1) * limit;
    const total = entries.length;
    res.json({ data: entries.slice(offset, offset + limit), page: p, limit, total, totalPages: Math.ceil(total / limit) });
    return;
  }
  res.json(entries);
});

router.get('/:id', (req: AuthRequest, res) => {
  const r = db.prepare('SELECT * FROM wiki_entries WHERE id = ?').get(req.params.id) as any;
  if (!r) { res.status(404).json({ error: '词条不存在' }); return; }
  res.json({ ...r, tags: safeParseTags(r.tags), attachments: getAttachments('wiki', r.id) });
});

router.post('/', (req: AuthRequest, res) => {
  const { title, content, category, tags } = req.body;
  if (!title || !category) { res.status(400).json({ error: '标题和分类必填' }); return; }
  const id = 'wiki-' + uuid().slice(0, 8);
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO wiki_entries (id, title, content, category, tags, author, author_id, last_updated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, title, sanitizeRichHtml(content || ''), category, JSON.stringify(tags || []), req.userName, req.userId, now, now
  );
  const created = db.prepare('SELECT * FROM wiki_entries WHERE id = ?').get(id) as any;
  res.status(201).json({ ...created, tags: safeParseTags(created.tags), attachments: [] });
});

router.put('/:id', (req: AuthRequest, res) => {
  const entry = db.prepare('SELECT * FROM wiki_entries WHERE id = ?').get(req.params.id) as any;
  if (!entry) { res.status(404).json({ error: '词条不存在' }); return; }
  if (entry.author_id !== req.userId && req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '无权限编辑' }); return;
  }
  const { title, content, category, tags } = req.body;
  db.prepare(`UPDATE wiki_entries SET title=?, content=?, category=?, tags=?, last_updated=? WHERE id=?`).run(
    title ?? entry.title,
    content !== undefined ? sanitizeRichHtml(content) : entry.content,
    category ?? entry.category,
    JSON.stringify(tags ?? safeParseTags(entry.tags)), new Date().toISOString(), req.params.id
  );
  const updated = db.prepare('SELECT * FROM wiki_entries WHERE id = ?').get(req.params.id) as any;
  res.json({ ...updated, tags: safeParseTags(updated.tags), attachments: getAttachments('wiki', updated.id) });
});

router.delete('/:id', (req: AuthRequest, res) => {
  const entry = db.prepare('SELECT * FROM wiki_entries WHERE id = ?').get(req.params.id) as any;
  if (!entry) { res.status(404).json({ error: '词条不存在' }); return; }
  if (entry.author_id !== req.userId && req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '无权限删除' }); return;
  }
  // 删除附件文件（此前仅删 DB 记录，导致磁盘文件泄漏）
  const atts = db.prepare('SELECT * FROM attachments WHERE entity_type=? AND entity_id=?').all('wiki', req.params.id) as any[];
  atts.forEach((a: any) => { try { unlinkSync(a.file_path); } catch {} });
  db.prepare('DELETE FROM attachments WHERE entity_type=? AND entity_id=?').run('wiki', req.params.id);
  // 清理关联的评论与点赞
  db.prepare('DELETE FROM comments WHERE entity_type=? AND entity_id=?').run('wiki', req.params.id);
  db.prepare('DELETE FROM likes WHERE entity_type=? AND entity_id=?').run('wiki', req.params.id);
  // 清理正文内容中引用的图片文件
  deleteImagesFromHtml(entry.content);
  db.prepare('DELETE FROM wiki_entries WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/pin', (req: AuthRequest, res) => {
  const entry = db.prepare('SELECT * FROM wiki_entries WHERE id = ?').get(req.params.id) as any;
  if (!entry) { res.status(404).json({ error: '词条不存在' }); return; }
  if (req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '无权限操作' }); return;
  }
  const newPinned = entry.pinned ? 0 : 1;
  db.prepare('UPDATE wiki_entries SET pinned=? WHERE id=?').run(newPinned, req.params.id);
  res.json({ success: true, pinned: !!newPinned });
});

export default router;
