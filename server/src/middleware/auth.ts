import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 启动时强制检查：禁止使用默认密钥
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET 环境变量未设置，出于安全原因拒绝启动');
  console.error('请设置: export JWT_SECRET=<您的随机密钥>');
  process.exit(1);
}

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  userName?: string;
}

export function generateToken(user: { id: string; role: string; username: string }): string {
  return jwt.sign(
    { id: user.id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // 优先从 httpOnly cookie 读取 token，兼容旧版 Authorization header
  let token: string | undefined;
  if (req.cookies?.token) {
    token = req.cookies.token;
  } else {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      token = header.slice(7);
    }
  }

  if (!token) {
    res.status(401).json({ error: '未登录' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role: string; username: string };
    req.userId = payload.id;
    req.userRole = payload.role;
    req.userName = payload.username;
    next();
  } catch {
    res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: '仅管理员可操作' });
    return;
  }
  next();
}

export function editorOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin' && req.userRole !== 'editor') {
    res.status(403).json({ error: '仅管理员或编辑可操作' });
    return;
  }
  next();
}
