import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (_req: AuthRequest, res) => {
  const rows = db.prepare(
    "SELECT p.*, (SELECT COUNT(*) FROM likes WHERE entity_type='puzzle' AND entity_id=p.id) as like_count FROM puzzles p ORDER BY p.created_at DESC"
  ).all() as any[];
  res.json(rows.map(r => ({ ...r, likeCount: r.like_count, tags: JSON.parse(r.tags || '[]'), attachments: getAtts('puzzle', r.id) })));
});

router.get('/:id', (req: AuthRequest, res) => {
  const r = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id) as any;
  if (!r) { res.status(404).json({ error: '谜题不存在' }); return; }
  res.json({ ...r, tags: JSON.parse(r.tags || '[]'), attachments: getAtts('puzzle', r.id) });
});

router.post('/', (req: AuthRequest, res) => {
  const { title, description, content, category, difficulty, hint, solution, tags } = req.body;
  if (!title) { res.status(400).json({ error: '标题必填' }); return; }
  const id = 'puz-' + uuid().slice(0, 8);
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO puzzles (id, title, description, content, category, difficulty, hint, solution, status, author, author_id, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unsolved', ?, ?, ?, ?, ?)`).run(
    id, title, description || '', content || '', category || 'other', difficulty || 'medium',
    hint || '', solution || '', req.userName, req.userId, JSON.stringify(tags || []), now, now
  );
  const created = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(id) as any;
  res.status(201).json({ ...created, tags: JSON.parse(created.tags || '[]'), attachments: [] });
});

router.put('/:id', (req: AuthRequest, res) => {
  const puz = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id) as any;
  if (!puz) { res.status(404).json({ error: '谜题不存在' }); return; }
  if (puz.author_id !== req.userId && req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '无权限编辑' }); return;
  }
  const { title, description, content, category, difficulty, hint, solution, tags } = req.body;
  db.prepare(`UPDATE puzzles SET title=?, description=?, content=?, category=?, difficulty=?, hint=?, solution=?, tags=?, updated_at=? WHERE id=?`).run(
    title ?? puz.title, description ?? puz.description, content ?? puz.content,
    category ?? puz.category, difficulty ?? puz.difficulty, hint ?? puz.hint,
    solution ?? puz.solution, JSON.stringify(tags ?? JSON.parse(puz.tags || '[]')),
    new Date().toISOString(), req.params.id
  );
  const updated = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id) as any;
  res.json({ ...updated, tags: JSON.parse(updated.tags || '[]'), attachments: getAtts('puzzle', updated.id) });
});

router.post('/:id/solve', (req: AuthRequest, res) => {
  const puz = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id) as any;
  if (!puz) { res.status(404).json({ error: '谜题不存在' }); return; }
  if (puz.status === 'solved') { res.status(400).json({ error: '该谜题已被破解' }); return; }
  const { answer } = req.body;
  const isCorrect = answer?.trim().toLowerCase() === puz.solution.trim().toLowerCase();
  db.prepare('UPDATE puzzles SET attempts = attempts + 1 WHERE id = ?').run(req.params.id);
  if (isCorrect) {
    db.prepare('UPDATE puzzles SET status=?, solved_by=?, solved_by_id=?, solved_at=?, updated_at=? WHERE id=?').run(
      'solved', req.userName, req.userId, new Date().toISOString(), new Date().toISOString(), req.params.id
    );
  }
  const updated = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id) as any;
  res.json({ correct: isCorrect, puzzle: { ...updated, tags: JSON.parse(updated.tags || '[]'), attachments: getAtts('puzzle', updated.id) } });
});

router.delete('/:id', (req: AuthRequest, res) => {
  const puz = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id) as any;
  if (!puz) { res.status(404).json({ error: '谜题不存在' }); return; }
  if (puz.author_id !== req.userId && req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '无权限删除' }); return;
  }
  db.prepare('DELETE FROM attachments WHERE entity_type=? AND entity_id=?').run('puzzle', req.params.id);
  db.prepare('DELETE FROM puzzles WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

function getAtts(type: string, eid: string) {
  return (db.prepare('SELECT * FROM attachments WHERE entity_type=? AND entity_id=?').all(type, eid) as any[])
    .map(a => ({ id: a.id, name: a.name, size: a.size, type: a.mime_type, dataUrl: `/api/files/${a.id}`, uploadedAt: a.uploaded_at }));
}

export default router;
