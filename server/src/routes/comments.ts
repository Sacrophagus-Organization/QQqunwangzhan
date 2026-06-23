import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

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

// GET / — 获取某实体的所有评论，按 created_at ASC 排序
router.get('/', (req: AuthRequest, res) => {
  const { entityType, entityId } = req.query;
  if (!entityType || !entityId) {
    res.status(400).json({ error: '缺少 entityType 或 entityId 参数' });
    return;
  }
  const rows = db.prepare(
    `SELECT c.*, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE entity_type='comment' AND entity_id=c.id) as like_count
     FROM comments c
     LEFT JOIN users u ON c.author_id = u.id
     WHERE c.entity_type = ? AND c.entity_id = ?
     ORDER BY c.created_at ASC`
  ).all(entityType as string, entityId as string) as any[];
  res.json(rows.map(mapComment));
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
  if (typeof content === 'string' && content.length > 1_000_000) {
    res.status(400).json({ error: '评论内容不能超过1,000,000字符' });
    return;
  }
  const id = 'cmt-' + uuid().slice(0, 8);
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO comments (id, entity_type, entity_id, parent_id, content, is_anonymous, author, author_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id,
    entityType,
    entityId,
    parentId || null,
    content,
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
  // 递归删除所有子评论
  const deleteChildren = (parentId: string) => {
    const children = db.prepare('SELECT id FROM comments WHERE parent_id = ?').all(parentId) as any[];
    for (const child of children) {
      deleteChildren(child.id);
      db.prepare('DELETE FROM comments WHERE id = ?').run(child.id);
    }
  };
  deleteChildren(req.params.id);
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
