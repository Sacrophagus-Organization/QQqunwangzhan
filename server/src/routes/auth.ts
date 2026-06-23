import { Router } from 'express';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import { db } from '../db.js';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../lib/rateLimiter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: AVATAR_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, 'avatar-' + uuid().slice(0, 8) + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const router = Router();

router.post('/register', registerLimiter, (req: AuthRequest, res) => {
  const { username, password, qqNumber, registerReason } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码必填' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: '密码至少6位' });
    return;
  }
  const existing = db.prepare('SELECT id, status FROM users WHERE username = ?').get(username) as any;
  if (existing) {
    if (existing.status === 'pending') {
      res.status(400).json({ error: '该用户名已提交注册，等待管理员审核中' });
    } else {
      res.status(400).json({ error: '用户名已存在' });
    }
    return;
  }
  const id = 'user-' + uuid().slice(0, 8);
  const hashed = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  db.prepare('INSERT INTO users (id, username, password, qq_number, role, status, register_reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, username, hashed, qqNumber || '', 'member', 'pending', registerReason || '', now);
  res.json({ success: true, message: '注册成功，请等待管理员审核通过后再登录' });
});

router.post('/login', loginLimiter, async (req: AuthRequest, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码必填' });
    return;
  }
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!row) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }
  if (row.status === 'pending') {
    res.status(403).json({ error: '您的账号正在等待管理员审核，审核通过后方可登录' });
    return;
  }
  if (row.status === 'rejected') {
    res.status(403).json({ error: '您的注册申请已被拒绝' });
    return;
  }
  const match = await bcrypt.compare(password, row.password);
  if (!match) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }
  const user = { id: row.id, username: row.username, role: row.role, qqNumber: row.qq_number || '', avatarUrl: row.avatar_url || '', createdAt: row.created_at };
  const token = generateToken(user);
  res.json({ token, user });
});

router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId!) as any;
  if (!row) { res.status(404).json({ error: '用户不存在' }); return; }
  if (row.status !== 'active') { res.status(403).json({ error: '账号不可用' }); return; }
  res.json({ id: row.id, username: row.username, role: row.role, qqNumber: row.qq_number || '', avatarUrl: row.avatar_url || '', createdAt: row.created_at });
});

// POST /avatar — 上传用户头像
router.post('/avatar', authMiddleware, avatarUpload.single('avatar'), (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: '请选择头像图片' });
    return;
  }
  // 删除旧头像文件
  const user = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(req.userId!) as any;
  if (user?.avatar_url) {
    const oldPath = path.join(__dirname, '..', '..', user.avatar_url);
    try { fs.unlinkSync(oldPath); } catch {}
  }
  // 更新数据库
  const relativePath = 'uploads/avatars/' + req.file.filename;
  db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(relativePath, req.userId);
  res.json({ success: true, avatarUrl: '/' + relativePath });
});

// GET /avatar/:userId — 获取指定用户的头像URL
router.get('/avatar-info/:userId', (req: AuthRequest, res) => {
  const user = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(req.params.userId) as any;
  if (!user) { res.status(404).json({ error: '用户不存在' }); return; }
  res.json({ avatarUrl: user.avatar_url ? '/' + user.avatar_url : '' });
});

// POST /apply-role — 用户申请角色升级（editor 或 admin）
router.post('/apply-role', authMiddleware, (req: AuthRequest, res) => {
  const { role, reason } = req.body;
  if (!['editor', 'admin'].includes(role)) {
    res.status(400).json({ error: '无效的角色申请' });
    return;
  }
  if (!reason || !reason.trim()) {
    res.status(400).json({ error: '请填写申请理由' });
    return;
  }
  // 不能申请自己已有的角色
  const user = db.prepare('SELECT role, requested_role FROM users WHERE id = ?').get(req.userId!) as any;
  if (!user) { res.status(404).json({ error: '用户不存在' }); return; }
  if (user.role === role) {
    res.status(400).json({ error: `你已经是 ${role === 'admin' ? '管理员' : '编辑'} 了` });
    return;
  }
  if (user.requested_role) {
    res.status(400).json({ error: '你已有待审核的权限申请，请等待管理员处理' });
    return;
  }
  db.prepare('UPDATE users SET requested_role = ?, requested_role_reason = ? WHERE id = ?').run(
    role, reason.trim(), req.userId
  );
  res.json({ success: true, message: '权限申请已提交，请等待管理员审核' });
});

export default router;
