import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/pageAccess.js';

const router = Router();

// POST / — 切换点赞（有则取消，无则点赞，需要登录）
router.post('/', authMiddleware, (req: AuthRequest, res) => {
  const { entityType, entityId } = req.body;
  if (!entityType || !entityId) {
    res.status(400).json({ error: '缺少参数' });
    return;
  }

  const existing = db.prepare(
    'SELECT id FROM likes WHERE user_id = ? AND entity_type = ? AND entity_id = ?'
  ).get(req.userId, entityType, entityId) as any;

  if (existing) {
    // 取消点赞
    db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
  } else {
    // 点赞
    const id = 'like-' + uuid().slice(0, 8);
    db.prepare('INSERT INTO likes (id, user_id, entity_type, entity_id) VALUES (?, ?, ?, ?)').run(
      id, req.userId, entityType, entityId
    );
  }

  const count = (db.prepare(
    'SELECT COUNT(*) as cnt FROM likes WHERE entity_type = ? AND entity_id = ?'
  ).get(entityType, entityId) as any).cnt;

  res.json({ liked: !existing, likeCount: count });
});

// GET /check — 批量检查当前用户对多个实体的点赞状态
// 公开页面也可查询点赞状态（未登录用户全部返回 false）
router.get('/check', optionalAuth('/likes'), (req: AuthRequest, res) => {
  const { entityType, entityIds } = req.query as { entityType: string; entityIds: string };
  if (!entityType || !entityIds) {
    res.status(400).json({ error: '缺少参数' });
    return;
  }

  const ids = entityIds.split(',');
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT entity_id FROM likes WHERE user_id = ? AND entity_type = ? AND entity_id IN (${placeholders})`
  ).all(req.userId, entityType, ...ids) as any[];

  const likedIds = new Set(rows.map(r => r.entity_id));
  res.json(ids.map(id => ({ entityId: id, liked: likedIds.has(id) })));
});

export default router;
