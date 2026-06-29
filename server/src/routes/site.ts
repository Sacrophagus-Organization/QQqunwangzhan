import { Router, Request, Response } from 'express';
import { getPublicPageAccess } from '../middleware/pageAccess.js';
import { siteLimiter } from '../lib/rateLimiter.js';

const router = Router();

/**
 * GET /page-access
 * 公开接口，返回非管理员页面的访问配置
 * 用于前端启动时拉取，决定路由守卫行为
 * - 限速: 30次/分钟/IP
 * - 缓存: 浏览器缓存 60 秒
 */
router.get('/page-access', siteLimiter, (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=60');
  const rows = getPublicPageAccess();
  res.json(rows);
});

export default router;
