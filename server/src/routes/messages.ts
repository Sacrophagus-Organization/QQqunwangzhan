import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET / — 获取全部留言，按置顶优先 + 时间倒序
router.get('/', (_req: AuthRequest, res) => {
  const rows = db.prepare(`
    SELECT m.*, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE entity_type='message' AND entity_id=m.id) as like_count
    FROM messages m
    LEFT JOIN users u ON m.author_id = u.id
    ORDER BY m.pinned DESC, m.created_at DESC
  `).all() as any[];
  res.json(rows.map(r => ({
    id: r.id,
    content: r.content,
    isAnonymous: r.is_anonymous,
    author: r.author,
    authorId: r.author_id,
    authorAvatar: r.avatar_url ? '/' + r.avatar_url : '',
    likeCount: r.like_count,
    pinned: r.pinned || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at || r.created_at,
  })));
});

// POST / — 创建留言
router.post('/', (req: AuthRequest, res) => {
  const { content, isAnonymous } = req.body;
  if (!content) { res.status(400).json({ error: '留言内容不能为空' }); return; }
  const id = 'msg-' + uuid().slice(0, 8);
  db.prepare(`INSERT INTO messages (id, content, is_anonymous, author, author_id)
    VALUES (?, ?, ?, ?, ?)`).run(
    id,
    content,
    isAnonymous ? 1 : 0,
    req.userName,
    req.userId,
  );
  const created = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as any;
  res.status(201).json({
    id: created.id,
    content: created.content,
    isAnonymous: created.is_anonymous,
    author: created.author,
    authorId: created.author_id,
    pinned: 0,
    createdAt: created.created_at,
    updatedAt: created.updated_at,
  });
});

// PUT /:id — 编辑自己的留言
router.put('/:id', (req: AuthRequest, res) => {
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id) as any;
  if (!msg) { res.status(404).json({ error: '留言不存在' }); return; }
  if (msg.author_id !== req.userId && req.userRole !== 'admin') {
    res.status(403).json({ error: '无权限编辑此留言' }); return;
  }
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: '内容不能为空' }); return; }
  const now = new Date().toISOString();
  db.prepare('UPDATE messages SET content = ?, updated_at = ? WHERE id = ?').run(content, now, req.params.id);
  const updated = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id) as any;
  res.json({
    id: updated.id,
    content: updated.content,
    isAnonymous: updated.is_anonymous,
    author: updated.author,
    authorId: updated.author_id,
    pinned: updated.pinned || 0,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  });
});

// DELETE /:id — 仅 admin 可删除
router.delete('/:id', (req: AuthRequest, res) => {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: '仅管理员可删除留言' });
    return;
  }
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id) as any;
  if (!msg) { res.status(404).json({ error: '留言不存在' }); return; }
  // 清理关联的附件
  db.prepare('DELETE FROM attachments WHERE entity_type=? AND entity_id=?').run('message', req.params.id);
  // 清理关联的评论
  db.prepare('DELETE FROM comments WHERE entity_type=? AND entity_id=?').run('message', req.params.id);
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /:id/pin — 置顶/取消置顶（仅 admin）
router.post('/:id/pin', (req: AuthRequest, res) => {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: '仅管理员可置顶留言' });
    return;
  }
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id) as any;
  if (!msg) { res.status(404).json({ error: '留言不存在' }); return; }
  const newPinned = msg.pinned ? 0 : 1;
  db.prepare('UPDATE messages SET pinned = ? WHERE id = ?').run(newPinned, req.params.id);
  res.json({ success: true, pinned: !!newPinned });
});

export default router;
