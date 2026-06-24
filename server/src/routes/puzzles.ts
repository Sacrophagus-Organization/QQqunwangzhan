import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { unlinkSync } from 'node:fs';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { solveLimiter } from '../lib/rateLimiter.js';
import { sanitizeRichHtml } from '../lib/sanitize.js';
import { getAttachments, getAttachmentsMap, safeParseTags } from '../lib/attachments.js';
import { deleteImagesFromHtml } from '../lib/imageCleanup.js';

const router = Router();
router.use(authMiddleware);

// Get all puzzles (支持可选分页 ?page=&limit=，无参数时返回全部数组以向后兼容)
router.get('/', (req: AuthRequest, res) => {
  const rows = db.prepare(
    "SELECT p.*, (SELECT COUNT(*) FROM likes WHERE entity_type='puzzle' AND entity_id=p.id) as like_count FROM puzzles p ORDER BY p.created_at DESC"
  ).all() as any[];
  const ids = rows.map(r => r.id);
  const attMap = getAttachmentsMap('puzzle', ids);
  const puzzles = rows.map(r => ({ ...r, likeCount: r.like_count, tags: safeParseTags(r.tags), attachments: attMap[r.id] || [] }));

  const limit = parseInt(req.query.limit as string);
  const page = parseInt(req.query.page as string);
  if (!isNaN(limit) && limit > 0) {
    const p = !isNaN(page) && page > 0 ? page : 1;
    const offset = (p - 1) * limit;
    const total = puzzles.length;
    res.json({ data: puzzles.slice(offset, offset + limit), page: p, limit, total, totalPages: Math.ceil(total / limit) });
    return;
  }
  res.json(puzzles);
});

router.get('/:id', (req: AuthRequest, res) => {
  const r = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id) as any;
  if (!r) { res.status(404).json({ error: '谜题不存在' }); return; }
  res.json({ ...r, tags: safeParseTags(r.tags), attachments: getAttachments('puzzle', r.id) });
});

router.post('/', (req: AuthRequest, res) => {
  const { title, description, content, category, difficulty, hint, solution, tags } = req.body;
  if (!title) { res.status(400).json({ error: '标题必填' }); return; }
  const id = 'puz-' + uuid().slice(0, 8);
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO puzzles (id, title, description, content, category, difficulty, hint, solution, status, author, author_id, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unsolved', ?, ?, ?, ?, ?)`).run(
    id, title, description || '', sanitizeRichHtml(content || ''), category || 'other', difficulty || 'medium',
    hint || '', solution || '', req.userName, req.userId, JSON.stringify(tags || []), now, now
  );
  const created = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(id) as any;
  res.status(201).json({ ...created, tags: safeParseTags(created.tags), attachments: [] });
});

router.put('/:id', (req: AuthRequest, res) => {
  const puz = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id) as any;
  if (!puz) { res.status(404).json({ error: '谜题不存在' }); return; }
  if (puz.author_id !== req.userId && req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '无权限编辑' }); return;
  }
  const { title, description, content, category, difficulty, hint, solution, tags } = req.body;
  db.prepare(`UPDATE puzzles SET title=?, description=?, content=?, category=?, difficulty=?, hint=?, solution=?, tags=?, updated_at=? WHERE id=?`).run(
    title ?? puz.title, description ?? puz.description,
    content !== undefined ? sanitizeRichHtml(content) : puz.content,
    category ?? puz.category, difficulty ?? puz.difficulty, hint ?? puz.hint,
    solution ?? puz.solution, JSON.stringify(tags ?? safeParseTags(puz.tags)),
    new Date().toISOString(), req.params.id
  );
  const updated = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id) as any;
  res.json({ ...updated, tags: safeParseTags(updated.tags), attachments: getAttachments('puzzle', updated.id) });
});

router.post('/:id/solve', solveLimiter, (req: AuthRequest, res) => {
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
  res.json({ correct: isCorrect, puzzle: { ...updated, tags: safeParseTags(updated.tags), attachments: getAttachments('puzzle', updated.id) } });
});

router.delete('/:id', (req: AuthRequest, res) => {
  const puz = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id) as any;
  if (!puz) { res.status(404).json({ error: '谜题不存在' }); return; }
  if (puz.author_id !== req.userId && req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '无权限删除' }); return;
  }
  // 删除附件文件（此前仅删 DB 记录，导致磁盘文件泄漏）
  const atts = db.prepare('SELECT * FROM attachments WHERE entity_type=? AND entity_id=?').all('puzzle', req.params.id) as any[];
  atts.forEach((a: any) => { try { unlinkSync(a.file_path); } catch {} });
  db.prepare('DELETE FROM attachments WHERE entity_type=? AND entity_id=?').run('puzzle', req.params.id);
  // 清理关联的评论与点赞
  db.prepare('DELETE FROM comments WHERE entity_type=? AND entity_id=?').run('puzzle', req.params.id);
  db.prepare('DELETE FROM likes WHERE entity_type=? AND entity_id=?').run('puzzle', req.params.id);
  // 清理正文内容中引用的图片文件
  deleteImagesFromHtml(puz.content);
  db.prepare('DELETE FROM puzzles WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
