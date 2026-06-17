import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (_req: AuthRequest, res) => {
  const rows = db.prepare('SELECT * FROM wiki_entries ORDER BY pinned DESC, sort_order ASC, created_at DESC').all() as any[];
  res.json(rows.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]'), attachments: getAtts('wiki', r.id) })));
});

router.get('/:id', (req: AuthRequest, res) => {
  const r = db.prepare('SELECT * FROM wiki_entries WHERE id = ?').get(req.params.id) as any;
  if (!r) { res.status(404).json({ error: '词条不存在' }); return; }
  res.json({ ...r, tags: JSON.parse(r.tags || '[]'), attachments: getAtts('wiki', r.id) });
});

router.post('/', (req: AuthRequest, res) => {
  const { title, content, category, tags } = req.body;
  if (!title || !category) { res.status(400).json({ error: '标题和分类必填' }); return; }
  const id = 'wiki-' + uuid().slice(0, 8);
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO wiki_entries (id, title, content, category, tags, author, author_id, last_updated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, title, content || '', category, JSON.stringify(tags || []), req.userName, req.userId, now, now
  );
  const created = db.prepare('SELECT * FROM wiki_entries WHERE id = ?').get(id) as any;
  res.status(201).json({ ...created, tags: JSON.parse(created.tags || '[]'), attachments: [] });
});

router.put('/:id', (req: AuthRequest, res) => {
  const entry = db.prepare('SELECT * FROM wiki_entries WHERE id = ?').get(req.params.id) as any;
  if (!entry) { res.status(404).json({ error: '词条不存在' }); return; }
  if (entry.author_id !== req.userId && req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '无权限编辑' }); return;
  }
  const { title, content, category, tags } = req.body;
  db.prepare(`UPDATE wiki_entries SET title=?, content=?, category=?, tags=?, last_updated=? WHERE id=?`).run(
    title ?? entry.title, content ?? entry.content, category ?? entry.category,
    JSON.stringify(tags ?? JSON.parse(entry.tags || '[]')), new Date().toISOString(), req.params.id
  );
  const updated = db.prepare('SELECT * FROM wiki_entries WHERE id = ?').get(req.params.id) as any;
  res.json({ ...updated, tags: JSON.parse(updated.tags || '[]'), attachments: getAtts('wiki', updated.id) });
});

router.delete('/:id', (req: AuthRequest, res) => {
  const entry = db.prepare('SELECT * FROM wiki_entries WHERE id = ?').get(req.params.id) as any;
  if (!entry) { res.status(404).json({ error: '词条不存在' }); return; }
  if (entry.author_id !== req.userId && req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '无权限删除' }); return;
  }
  db.prepare('DELETE FROM attachments WHERE entity_type=? AND entity_id=?').run('wiki', req.params.id);
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

function getAtts(type: string, eid: string) {
  return (db.prepare('SELECT * FROM attachments WHERE entity_type=? AND entity_id=?').all(type, eid) as any[])
    .map(a => ({ id: a.id, name: a.name, size: a.size, type: a.mime_type, dataUrl: `/api/files/${a.id}`, uploadedAt: a.uploaded_at }));
}

export default router;
