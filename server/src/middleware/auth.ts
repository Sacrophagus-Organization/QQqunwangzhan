import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'arkoverseer-secret-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  userName?: string;
}

export function generateToken(user: { id: string; role: string; username: string }): string {
  return jwt.sign(
    { id: user.id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录' });
    return;
  }
  try {
    const token = header.slice(7);
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
