import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { AuthRequest } from './auth.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[pageAccess] FATAL: JWT_SECRET 环境变量未设置，pageAccess 中间件无法工作');
}

// ─── 缓存层 ──────────────────────────────────────────────────────────

interface PageAccessRow {
  id: string;
  route_path: string;
  route_name: string;
  access_level: 'public' | 'member' | 'admin';
  is_enabled: number;
  description: string;
  updated_by: string;
  updated_at: string;
}

let cache: Record<string, PageAccessRow> | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000;

function loadCache(): Record<string, PageAccessRow> {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) return cache;
  const rows = db.prepare('SELECT * FROM page_access').all() as PageAccessRow[];
  cache = {};
  for (const row of rows) cache[row.route_path] = row;
  cacheTime = now;
  return cache;
}

export function clearPageAccessCache(): void {
  cache = null;
  cacheTime = 0;
}

// ─── 路由匹配 ────────────────────────────────────────────────────────

function matchRoute(routePath: string, config: Record<string, PageAccessRow>): PageAccessRow | null {
  if (config[routePath]) return config[routePath];
  for (const [pattern, row] of Object.entries(config)) {
    if (!pattern.includes(':')) continue;
    const regexStr = '^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$';
    if (new RegExp(regexStr).test(routePath)) return row;
  }
  return null;
}

/** 从请求中提取 JWT payload（不强制要求，失败返回 null） */
function tryParseToken(req: AuthRequest): { id: string; role: string; username: string } | null {
  let token: string | undefined;
  if (req.cookies?.token) {
    token = req.cookies.token;
  } else {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) token = header.slice(7);
  }
  if (!token || !JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; role: string; username: string };
  } catch {
    return null;
  }
}

// ─── 中间件 ──────────────────────────────────────────────────────────

/**
 * optionalAuth — 统一页面访问控制
 *
 * public  → 放行，尝试解析 token（有则附加 user 信息）
 * member  → 需登录；未登录 → 403
 * admin   → 需管理员；未登录 → 403；非 admin → 403 "页面维护中"
 * 无配置  → 直接放行
 */
export function optionalAuth(routePath: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const config = loadCache();
    const row = matchRoute(routePath, config);

    // 无配置 → 默认 member 级
    const level: 'public' | 'member' | 'admin' = row?.access_level ?? 'member';

    // ═══ public — 放行，解析 token（可选） ═══
    if (level === 'public') {
      const payload = tryParseToken(req);
      if (payload) {
        req.userId = payload.id;
        req.userRole = payload.role;
        req.userName = payload.username;
      }
      return next();
    }

    // ═══ member / admin — 需要登录 ═══
    const payload = tryParseToken(req);
    if (!payload) {
      return res.status(403).json({ error: '此页面需要登录后才能访问', code: 'AUTH_REQUIRED' });
    }
    req.userId = payload.id;
    req.userRole = payload.role;
    req.userName = payload.username;

    // ═══ member — 已登录即可 ═══
    if (level === 'member') return next();

    // ═══ admin — 仅管理员 ═══
    if (level === 'admin') {
      if (payload.role !== 'admin') {
        return res.status(403).json({ error: '页面维护中', code: 'PAGE_DISABLED' });
      }
      return next();
    }

    next();
  };
}

/** pageAccessGuard — 保留签名，当前始终放行 */
export function pageAccessGuard(_routePath: string) {
  return (_req: AuthRequest, _res: Response, next: NextFunction) => next();
}

/** 获取所有页面配置（供 site 公开接口使用，含 admin 路由以支持前端完整逻辑） */
export function getPublicPageAccess(): Omit<PageAccessRow, 'updated_by'>[] {
  const config = loadCache();
  return Object.values(config).map(({ updated_by, ...rest }) => rest);
}

/** 获取所有页面配置（含 admin 路由，供管理端使用） */
export function getAllPageAccess(): PageAccessRow[] {
  return Object.values(loadCache());
}
