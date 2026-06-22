import rateLimit from 'express-rate-limit';

/**
 * 统一限速器工厂函数
 * 所有限速器复用相同的 IP 提取逻辑：
 * - 优先使用 x-forwarded-for (Nginx 透传)
 * - 回退到 socket remoteAddress
 * - 使用内存存储（适用于单服务器部署）
 */

function getClientIP(req: any): string {
  const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
  return forwarded || req.socket?.remoteAddress || 'unknown';
}

/**
 * 全局限速器：所有 /api/ 请求 100次/15分钟/IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: getClientIP,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
});

/**
 * 登录限速器：5次/15分钟/IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: getClientIP,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '登录尝试过多，请15分钟后再试' },
  skipSuccessfulRequests: false,
});

/**
 * 注册限速器：3次/小时/IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: getClientIP,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '注册请求过于频繁，请1小时后再试' },
});

/**
 * 谜题解答限速器：10次/分钟/IP
 */
export const solveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: getClientIP,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '解答提交过于频繁，请1分钟后再试' },
});
