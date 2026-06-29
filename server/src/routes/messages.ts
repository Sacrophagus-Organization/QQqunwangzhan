import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/pageAccess.js';
import { extractBase64Images } from '../lib/imageExtractor.js';
import { sanitizeRichHtml } from '../lib/sanitize.js';
import { deleteUnusedImages, deleteImagesFromHtml } from '../lib/imageCleanup.js';
import { contentCreateLimiter } from '../lib/rateLimiter.js';

const router = Router();

// GET / — 分页获取留言，按置顶优先 + 时间倒序
router.get('/', optionalAuth('/messages'), (req: AuthRequest, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);
  const offset = (page - 1) * limit;

  const { total } = db.prepare('SELECT COUNT(*) as total FROM messages').get() as any;
  const rows = db.prepare(`
    SELECT m.*, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE entity_type='message' AND entity_id=m.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE entity_type='message' AND entity_id=m.id) as comment_count
    FROM messages m
    LEFT JOIN users u ON m.author_id = u.id
    ORDER BY m.pinned DESC, m.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as any[];

  res.json({
    data: rows.map(r => ({
      id: r.id,
      content: r.content,
      isAnonymous: r.is_anonymous,
      author: r.author,
      authorId: r.author_id,
      authorAvatar: r.avatar_url ? '/' + r.avatar_url : '',
      likeCount: r.like_count,
      commentCount: r.comment_count,
      pinned: r.pinned || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at || r.created_at,
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

// POST / — 创建留言（带独立频率限制，需要登录）
router.post('/', authMiddleware, contentCreateLimiter, (req: AuthRequest, res) => {
  const { content, isAnonymous } = req.body;
  if (!content) { res.status(400).json({ error: '留言内容不能为空' }); return; }
  if (typeof content === 'string' && content.length > 10_000_000) {
    res.status(400).json({ error: '留言内容不能超过10,000,000字符' });
    return;
  }
  const id = 'msg-' + uuid().slice(0, 8);
  const now = new Date().toISOString();
  // Extract base64 images → file URLs, then sanitize HTML (defense-in-depth) before storing
  const processedContent = sanitizeRichHtml(extractBase64Images(content));
  db.prepare(`INSERT INTO messages (id, content, is_anonymous, author, author_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    id,
    processedContent,
    isAnonymous ? 1 : 0,
    req.userName,
    req.userId,
    now,
    now,
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
router.put('/:id', authMiddleware, (req: AuthRequest, res) => {
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id) as any;
  if (!msg) { res.status(404).json({ error: '留言不存在' }); return; }
  if (msg.author_id !== req.userId && req.userRole !== 'admin') {
    res.status(403).json({ error: '无权限编辑此留言' }); return;
  }
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: '内容不能为空' }); return; }
  if (typeof content === 'string' && content.length > 10_000_000) {
    res.status(400).json({ error: '留言内容不能超过10,000,000字符' });
    return;
  }
  const now = new Date().toISOString();
  const processedContent = sanitizeRichHtml(extractBase64Images(content));
  // 清理旧内容中不再被引用的图片文件，防止磁盘泄漏
  deleteUnusedImages(msg.content, processedContent);
  db.prepare('UPDATE messages SET content = ?, updated_at = ? WHERE id = ?').run(processedContent, now, req.params.id);
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

// DELETE /:id — 仅 admin 可删除（事务保护）
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: '仅管理员可删除留言' });
    return;
  }
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id) as any;
  if (!msg) { res.status(404).json({ error: '留言不存在' }); return; }

  const deleteMsg = db.transaction(() => {
    db.prepare('DELETE FROM attachments WHERE entity_type=? AND entity_id=?').run('message', req.params.id);
    db.prepare('DELETE FROM comments WHERE entity_type=? AND entity_id=?').run('message', req.params.id);
    db.prepare('DELETE FROM likes WHERE entity_type=? AND entity_id=?').run('message', req.params.id);
    deleteImagesFromHtml(msg.content);
    db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  });
  deleteMsg();
  res.json({ success: true });
});

// POST /:id/pin — 置顶/取消置顶（仅 admin）
router.post('/:id/pin', authMiddleware, (req: AuthRequest, res) => {
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
