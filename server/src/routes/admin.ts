import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminOnly);

// Get all users (including pending)
router.get('/users', (_req: AuthRequest, res) => {
  const rows = db.prepare('SELECT id, username, qq_number, role, status, register_reason, avatar_url, created_at FROM users ORDER BY created_at DESC').all();
  res.json(rows);
});

// Get pending users count
router.get('/pending-count', (_req: AuthRequest, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM users WHERE status = ?').get('pending') as any;
  res.json({ count: row.count });
});

// Approve user
router.post('/users/:id/approve', (req: AuthRequest, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) { res.status(404).json({ error: '用户不存在' }); return; }
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run('active', req.params.id);
  res.json({ success: true, message: `已通过 ${user.username} 的注册申请` });
});

// Reject user
router.post('/users/:id/reject', (req: AuthRequest, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) { res.status(404).json({ error: '用户不存在' }); return; }
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run('rejected', req.params.id);
  res.json({ success: true, message: `已拒绝 ${user.username} 的注册申请` });
});

// Delete user
router.delete('/users/:id', (req: AuthRequest, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) { res.status(404).json({ error: '用户不存在' }); return; }
  if (user.role === 'admin') { res.status(400).json({ error: '不能删除管理员' }); return; }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Update user role (promote/demote)
router.post('/users/:id/role', (req: AuthRequest, res) => {
  const { role } = req.body;
  if (!['admin', 'editor', 'member'].includes(role)) {
    res.status(400).json({ error: '无效角色' }); return;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) { res.status(404).json({ error: '用户不存在' }); return; }
  if (user.id === req.userId) { res.status(400).json({ error: '不能修改自己的角色' }); return; }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ success: true, message: `已将 ${user.username} 的角色更新为 ${role}` });
});

export default router;
