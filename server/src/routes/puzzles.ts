import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/pageAccess.js';
import { solveLimiter } from '../lib/rateLimiter.js';
import { sanitizeRichHtml } from '../lib/sanitize.js';
import { getAttachments, getAttachmentsMap, safeParseTags } from '../lib/attachments.js';
import { deleteImagesFromHtml } from '../lib/imageCleanup.js';

const router = Router();

// 谜题公开视图脱敏：对一切用户（含作者 / editor / admin）一律剔除 solution（答案），
// 防止答案经任何接口提前泄漏。作者编辑时答案不回显、不改动，见前端 handleEditSave。
function toPublicPuzzle(p: any): any {
  const { solution, ...rest } = p;
  return rest;
}

// ═══ 谜题详情锁定（按账号记录）：节点一"啥子杯#2"详情需密码解锁 ═══
// node_key 约定：unlock-{puzzleId}；密码以 sha256 哈希存储，不明文落库。
const LOCKED_PUZZLES: Record<string, string> = {
  // 啥子杯#2 详情锁：不输密码看不到详情 / 剧情 / 附件
  'puz-loop-node1': '57e812d0c3d3b78a3ffd9ed381c4118042ef0da87c6693fb367a7520d68b15ea',
};
function isLockedPuzzle(id: string): boolean { return id in LOCKED_PUZZLES; }
function hashPwd(pwd: string): string { return createHash('sha256').update(pwd).digest('hex'); }

// 查询当前用户对一批谜题的解锁状态（node_key 约定：unlock-{puzzleId}）
function getUnlockMap(userId: string | undefined, puzzleIds: string[]): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  if (!userId || puzzleIds.length === 0) return map;
  const keys = puzzleIds.map(id => `unlock-${id}`);
  const rows = db.prepare(
    `SELECT node_key FROM puzzle_progress WHERE user_id = ? AND node_key IN (${keys.map(() => '?').join(',')})`
  ).all(userId, ...keys) as any[];
  for (const row of rows) map[String(row.node_key).replace(/^unlock-/, '')] = true;
  return map;
}

// 附件下载鉴权：锁定谜题的附件须先解锁，防止绕过详情锁直接取走剧情/附件。
export function isPuzzleAttachmentAccessible(userId: string | undefined, puzzleId: string): boolean {
  if (!isLockedPuzzle(puzzleId)) return true;
  return !!getUnlockMap(userId, [puzzleId])[puzzleId];
}

// 未解锁的锁定谜题内容脱敏：正文 / 提示 / 附件一律隐藏，防止绕过前端直接调接口取走剧情与附件。
// 任何角色（含 admin / editor / 作者）都必须输入解锁密码后按账号记录放行。
const LOCKED_PLACEHOLDER =
  '<div style="padding:16px;border:1px dashed rgba(148,163,184,.4);border-radius:12px;color:#94a3b8;font-size:14px">' +
  '本谜题的剧情与附件已被加密锁定。<br/>请点击"详情"输入解锁密码后再查看。</div>';

function applyLock(userId: string | undefined, _userRole: string | undefined, p: any, unlockedMap: Record<string, boolean>): any {
  if (!isLockedPuzzle(p.id)) return { ...p, locked: false, unlocked: true };
  const unlocked = !!unlockedMap[p.id];
  if (unlocked) return { ...p, locked: true, unlocked: true };
  return { ...p, locked: true, unlocked: false, content: LOCKED_PLACEHOLDER, hint: '', attachments: [] };
}

// Get all puzzles (强制分页，防止 OOM)
router.get('/', optionalAuth('/puzzles'), (req: AuthRequest, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);
  const offset = (page - 1) * limit;

  const { total } = db.prepare('SELECT COUNT(*) as total FROM puzzles').get() as any;
  const rows = db.prepare(
    `SELECT p.*, (SELECT COUNT(*) FROM likes WHERE entity_type='puzzle' AND entity_id=p.id) as like_count
     FROM puzzles p ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(limit, offset) as any[];

  const ids = rows.map(r => r.id);
  const attMap = getAttachmentsMap('puzzle', ids);
  const sealMap = getSealMap(req.userId, ids);
  const unlockMap = getUnlockMap(req.userId, ids);
  const puzzles = rows.map(r => applyLock(req.userId, req.userRole, { ...toPublicPuzzle(r), likeCount: r.like_count, tags: safeParseTags(r.tags), attachments: attMap[r.id] || [], sealed: !!sealMap[r.id] }, unlockMap));

  res.json({ data: puzzles, page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.get('/:id', optionalAuth('/puzzles'), (req: AuthRequest, res) => {
  const r = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id) as any;
  if (!r) { res.status(404).json({ error: '谜题不存在' }); return; }
  const sealed = getSealMap(req.userId, [r.id])[r.id] || false;
  const pub = { ...toPublicPuzzle(r), tags: safeParseTags(r.tags), attachments: getAttachments('puzzle', r.id), sealed };
  res.json(applyLock(req.userId, req.userRole, pub, getUnlockMap(req.userId, [r.id])));
});

router.post('/', authMiddleware, (req: AuthRequest, res) => {
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
  res.status(201).json({ ...toPublicPuzzle(created), tags: safeParseTags(created.tags), attachments: [] });
});

router.put('/:id', authMiddleware, (req: AuthRequest, res) => {
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
  res.json({ ...toPublicPuzzle(updated), tags: safeParseTags(updated.tags), attachments: getAttachments('puzzle', updated.id) });
});

router.post('/:id/solve', authMiddleware, solveLimiter, (req: AuthRequest, res) => {
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
  const pub = { ...toPublicPuzzle(updated), tags: safeParseTags(updated.tags), attachments: getAttachments('puzzle', updated.id) };
  res.json({ correct: isCorrect, puzzle: applyLock(req.userId, req.userRole, pub, getUnlockMap(req.userId, [updated.id])) });
});

// 详情解锁：校验密码后按账号记录解锁状态（node_key 约定：unlock-{puzzleId}）
router.post('/:id/unlock', authMiddleware, (req: AuthRequest, res) => {
  const puz = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id) as any;
  if (!puz) { res.status(404).json({ error: '谜题不存在' }); return; }
  if (!isLockedPuzzle(puz.id)) { res.status(400).json({ error: '该谜题无需解锁' }); return; }
  const { password } = req.body || {};
  if (typeof password !== 'string' || !password) { res.status(400).json({ error: '请输入解锁密码' }); return; }
  if (hashPwd(password) !== LOCKED_PUZZLES[puz.id]) { res.status(403).json({ error: '密码错误' }); return; }
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO puzzle_progress (id, user_id, node_key, state, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, node_key) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`)
    .run('unlock-' + uuid().slice(0, 8), req.userId, `unlock-${puz.id}`, JSON.stringify({ unlocked: true, unlockedAt: now }), now);
  res.json({ success: true, unlocked: true });
});

router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
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

// ═══ 谜题封印（按账号记录）：节点一"啥子杯#2"触发 glitch 崩溃后封印提交按钮 ═══

// 查询当前用户对一批谜题的封印状态（node_key 约定：seal-{puzzleId}）
function getSealMap(userId: string | undefined, puzzleIds: string[]): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  if (!userId || puzzleIds.length === 0) return map;
  const keys = puzzleIds.map(id => `seal-${id}`);
  const rows = db.prepare(
    `SELECT node_key FROM puzzle_progress WHERE user_id = ? AND node_key IN (${keys.map(() => '?').join(',')})`
  ).all(userId, ...keys) as any[];
  for (const row of rows) map[String(row.node_key).replace(/^seal-/, '')] = true;
  return map;
}

// 触发 glitch 后封印提交按钮
router.post('/:id/seal', authMiddleware, (req: AuthRequest, res) => {
  const puz = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id) as any;
  if (!puz) { res.status(404).json({ error: '谜题不存在' }); return; }
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO puzzle_progress (id, user_id, node_key, state, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, node_key) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`)
    .run('seal-' + uuid().slice(0, 8), req.userId, `seal-${req.params.id}`, JSON.stringify({ sealed: true, sealedAt: now }), now);
  res.json({ success: true, sealed: true });
});

// 解除封印（仅管理员，便于反复测试）
router.post('/:id/unseal', authMiddleware, (req: AuthRequest, res) => {
  if (req.userRole !== 'admin') { res.status(403).json({ error: '仅管理员可解除封印' }); return; }
  const puz = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id) as any;
  if (!puz) { res.status(404).json({ error: '谜题不存在' }); return; }
  db.prepare('DELETE FROM puzzle_progress WHERE user_id = ? AND node_key = ?').run(req.userId, `seal-${req.params.id}`);
  res.json({ success: true, sealed: false });
});

export default router;
