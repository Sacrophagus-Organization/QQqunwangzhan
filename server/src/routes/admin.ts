import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';
import { unlinkSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deleteImagesFromHtml } from '../lib/imageCleanup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = Router();

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminOnly);

// Get all users (including pending + role requests)
router.get('/users', (_req: AuthRequest, res) => {
  const rows = db.prepare(
    'SELECT id, username, qq_number, role, status, register_reason, avatar_url, requested_role, requested_role_reason, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json(rows);
});

// Get pending users count (registration + role requests)
router.get('/pending-count', (_req: AuthRequest, res) => {
  const reg = (db.prepare('SELECT COUNT(*) as cnt FROM users WHERE status = ?').get('pending') as any).cnt;
  const roleReq = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE requested_role != ''").get() as any).cnt;
  res.json({ count: reg + roleReq }); // 合并显示为一个数字
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

// Delete user — 级联清理该用户的所有内容，避免孤儿数据与磁盘泄漏
router.delete('/users/:id', (req: AuthRequest, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) { res.status(404).json({ error: '用户不存在' }); return; }
  if (user.role === 'admin') { res.status(400).json({ error: '不能删除管理员' }); return; }
  const uid = req.params.id;
  const del = db.transaction(() => {
    // 留言：清理内容图片文件、附件、评论、点赞
    const msgs = db.prepare('SELECT id, content FROM messages WHERE author_id = ?').all(uid) as any[];
    for (const m of msgs) {
      deleteImagesFromHtml(m.content);
      db.prepare('DELETE FROM attachments WHERE entity_type=? AND entity_id=?').run('message', m.id);
      db.prepare('DELETE FROM comments WHERE entity_type=? AND entity_id=?').run('message', m.id);
      db.prepare('DELETE FROM likes WHERE entity_type=? AND entity_id=?').run('message', m.id);
    }
    db.prepare('DELETE FROM messages WHERE author_id = ?').run(uid);
    // 评论：清理内容图片文件
    const cmts = db.prepare('SELECT content FROM comments WHERE author_id = ?').all(uid) as any[];
    for (const c of cmts) deleteImagesFromHtml(c.content);
    db.prepare('DELETE FROM comments WHERE author_id = ?').run(uid);
    // 记录 / 谜题 / Wiki：清理附件文件与关联评论、点赞
    const entityTables: Array<[string, string]> = [
      ['record', 'records'],
      ['puzzle', 'puzzles'],
      ['wiki', 'wiki_entries'],
    ];
    for (const [type, table] of entityTables) {
      const ents = db.prepare(`SELECT id, content FROM ${table} WHERE author_id = ?`).all(uid) as any[];
      for (const e of ents) {
        deleteImagesFromHtml(e.content);
        const atts = db.prepare('SELECT file_path FROM attachments WHERE entity_type=? AND entity_id=?').all(type, e.id) as any[];
        atts.forEach(a => { try { unlinkSync(a.file_path); } catch {} });
        db.prepare('DELETE FROM attachments WHERE entity_type=? AND entity_id=?').run(type, e.id);
        db.prepare('DELETE FROM comments WHERE entity_type=? AND entity_id=?').run(type, e.id);
        db.prepare('DELETE FROM likes WHERE entity_type=? AND entity_id=?').run(type, e.id);
      }
      db.prepare(`DELETE FROM ${table} WHERE author_id = ?`).run(uid);
    }
    // 点赞
    db.prepare('DELETE FROM likes WHERE user_id = ?').run(uid);
    // 头像文件
    if (user.avatar_url) {
      try { unlinkSync(path.join(__dirname, '..', '..', user.avatar_url)); } catch {}
    }
    // 最后删除用户
    db.prepare('DELETE FROM users WHERE id = ?').run(uid);
  });
  del();
  res.json({ success: true });
});

// Approve role request
router.post('/users/:id/approve-role', (req: AuthRequest, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) { res.status(404).json({ error: '用户不存在' }); return; }
  if (!user.requested_role) { res.status(400).json({ error: '该用户没有待审核的权限申请' }); return; }
  const newRole = user.requested_role;
  db.prepare('UPDATE users SET role = ?, requested_role = ?, requested_role_reason = ? WHERE id = ?').run(
    newRole, '', '', req.params.id
  );
  res.json({ success: true, message: `已通过 ${user.username} 的 ${newRole === 'admin' ? '管理员' : '编辑'} 权限申请` });
});

// Reject role request
router.post('/users/:id/reject-role', (req: AuthRequest, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) { res.status(404).json({ error: '用户不存在' }); return; }
  if (!user.requested_role) { res.status(400).json({ error: '该用户没有待审核的权限申请' }); return; }
  db.prepare('UPDATE users SET requested_role = ?, requested_role_reason = ? WHERE id = ?').run('', '', req.params.id);
  res.json({ success: true, message: `已拒绝 ${user.username} 的权限申请` });
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
