import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { extractBase64Images } from '../lib/imageExtractor.js';
import { sanitizeRichHtml } from '../lib/sanitize.js';
import { deleteImagesFromHtml } from '../lib/imageCleanup.js';

const router = Router();
router.use(authMiddleware);

const mapComment = (r: any) => ({
  id: r.id,
  entityType: r.entity_type,
  entityId: r.entity_id,
  parentId: r.parent_id || null,
  content: r.content,
  isAnonymous: r.is_anonymous,
  author: r.author,
  authorId: r.author_id,
  authorAvatar: r.avatar_url ? '/' + r.avatar_url : '',
  likeCount: r.like_count,
  createdAt: r.created_at,
});

// GET / — 分页获取某实体的评论，按 created_at ASC 排序
router.get('/', (req: AuthRequest, res) => {
  const { entityType, entityId } = req.query;
  if (!entityType || !entityId) {
    res.status(400).json({ error: '缺少 entityType 或 entityId 参数' });
    return;
  }
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 30), 50);
  const offset = (page - 1) * limit;

  const { total } = db.prepare(
    'SELECT COUNT(*) as total FROM comments WHERE entity_type = ? AND entity_id = ?'
  ).get(entityType as string, entityId as string) as any;

  const rows = db.prepare(
    `SELECT c.*, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE entity_type='comment' AND entity_id=c.id) as like_count
     FROM comments c
     LEFT JOIN users u ON c.author_id = u.id
     WHERE c.entity_type = ? AND c.entity_id = ?
     ORDER BY c.created_at ASC
     LIMIT ? OFFSET ?`
  ).all(entityType as string, entityId as string, limit, offset) as any[];

  res.json({
    data: rows.map(mapComment),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

// POST / — 创建评论（支持嵌套 parentId）
router.post('/', (req: AuthRequest, res) => {
  const { entityType, entityId, parentId, content, isAnonymous } = req.body;
  if (!entityType || !entityId) {
    res.status(400).json({ error: '缺少实体类型或ID' });
    return;
  }
  if (!content) {
    res.status(400).json({ error: '评论内容不能为空' });
    return;
  }
  if (typeof content === 'string' && content.length > 10_000_000) {
    res.status(400).json({ error: '评论内容不能超过10,000,000字符' });
    return;
  }
  const id = 'cmt-' + uuid().slice(0, 8);
  const now = new Date().toISOString();
  // Extract base64 images → file URLs, then sanitize HTML (defense-in-depth) before storing
  const processedContent = sanitizeRichHtml(extractBase64Images(content));
  db.prepare(`INSERT INTO comments (id, entity_type, entity_id, parent_id, content, is_anonymous, author, author_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id,
    entityType,
    entityId,
    parentId || null,
    processedContent,
    isAnonymous ? 1 : 0,
    req.userName,
    req.userId,
    now,
  );
  const created = db.prepare('SELECT * FROM comments WHERE id = ?').get(id) as any;
  res.status(201).json(mapComment(created));
});

// DELETE /:id — admin 或 editor 可删除
router.delete('/:id', (req: AuthRequest, res) => {
  if (req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '仅管理员或编辑可删除评论' });
    return;
  }
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id) as any;
  if (!comment) {
    res.status(404).json({ error: '评论不存在' });
    return;
  }
  // 递归 CTE 一次性查出本评论及所有后代，避免逐条 DELETE 的 N+1 问题
  const rows = db.prepare(`
    WITH RECURSIVE descendants(id) AS (
      SELECT id FROM comments WHERE id = ?
      UNION ALL
      SELECT c.id FROM comments c JOIN descendants d ON c.parent_id = d.id
    )
    SELECT id, content FROM comments WHERE id IN (SELECT id FROM descendants)
  `).all(req.params.id) as any[];
  const ids = rows.map(r => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const del = db.transaction(() => {
    // 清理每条评论内容中引用的图片文件
    for (const r of rows) deleteImagesFromHtml(r.content);
    if (ids.length > 0) {
      db.prepare(`DELETE FROM likes WHERE entity_type='comment' AND entity_id IN (${placeholders})`).run(...ids);
      db.prepare(`DELETE FROM comments WHERE id IN (${placeholders})`).run(...ids);
    }
  });
  del();
  res.json({ success: true });
});

export default router;
