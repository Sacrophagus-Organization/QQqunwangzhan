import { Router, type Request, type Response } from 'express';
import { v4 as uuid } from 'uuid';
import { createHash } from 'node:crypto';
import { db } from '../db.js';

const router = Router();

// ─── 页面参数 ────────────────────────────────────────────────────────────
// 半公开页：页面本身无需登录，但密钥校验、五分钟进度与访问审计全部在后端完成。
// 源码只保留 SHA-256 摘要，不保留明文；生产环境优先通过 BEFORE_SARCOPHAGUS_KEY_HASH 注入摘要，
// 兼容旧用法：也可通过 BEFORE_SARCOPHAGUS_KEY 在运行时注入明文（仅存环境变量，不落入源码）。
const DEFAULT_KEY_HASH = '7a6e720976a598e1f8db18b3d690166a0bb27cbe32f6d4545e3afe09f2634c75';
const runtimeKey = process.env.BEFORE_SARCOPHAGUS_KEY?.trim();
const runtimeKeyHash = process.env.BEFORE_SARCOPHAGUS_KEY_HASH?.trim().toLowerCase();
let KEY_HASH = DEFAULT_KEY_HASH;
if (runtimeKeyHash && /^[a-f0-9]{64}$/.test(runtimeKeyHash)) {
  KEY_HASH = runtimeKeyHash;
} else if (runtimeKey) {
  KEY_HASH = createHash('sha256').update(runtimeKey).digest('hex');
}

const UNLOCK_TTL_MS = 5 * 60 * 1000;
const AUDIO_URL = process.env.BEFORE_SARCOPHAGUS_AUDIO_URL || '/BEFORETHESARCOPHAGUS/telescope.mp3';

const FIRST_MANUSCRIPT = [
  { type: 'p', text: '这片大地从不缺乏秘密，<br>只是在等待第一个打下销钉的人。' },
  { type: 'p', text: '第四次的概念作为契机。' },
  { type: 'p', text: '现在，我们站在了石棺前，<br>等待着答案。' },
];
const SECOND_MANUSCRIPT = [
  { type: 'p', text: 'Mystery always <i>(by her side)</i> :)' },
  { type: 'p', text: '感谢你们做出这么好玩的游戏。' },
  { type: 'p', text: '“如果再也见不到你，祝你早安、午安、晚安。”' },
];

// ─── 频率限制（in-memory, bounded）────────────────────────────────────
// 第一层：按 IP 统计任意输入提交次数，防止未触发失败锁定时的高频爆破。
// 第二层：连续失败锁定，短时间锁死后进一步延长再试成本。
const attemptMap = new Map<string, { count: number; windowStart: number; lastAccess: number }>();
const failMap = new Map<string, { count: number; lockedUntil: number; lastAccess: number }>();
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
const MAX_FAILS = 3;
const LOCK_SECONDS = 60;
const MAX_MAP_SIZE = 10000;
const MAP_TTL_MS = 30 * 60 * 1000;

function evictIfNeeded(map: Map<string, { lastAccess: number }>) {
  if (map.size <= MAX_MAP_SIZE) return;
  const entries = Array.from(map.entries()).sort((a, b) => a[1].lastAccess - b[1].lastAccess);
  const removeCount = Math.ceil(entries.length * 0.2);
  for (let i = 0; i < removeCount; i++) map.delete(entries[i][0]);
}

function getClientIP(req: Request): string {
  const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
  return forwarded || req.socket?.remoteAddress || 'unknown';
}

function detectDevice(userAgent: string): string {
  const ua = (userAgent || '').toLowerCase();
  if (!ua) return 'unknown';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/mobi|android|iphone|ipod/.test(ua)) return 'mobile';
  if (/windows|macintosh|linux|cros|x11/.test(ua)) return 'desktop';
  return 'other';
}

function checkFailLock(ip: string): { locked: boolean; remaining: number } {
  const entry = failMap.get(ip);
  if (!entry) return { locked: false, remaining: 0 };
  entry.lastAccess = Date.now();
  if (entry.lockedUntil > Date.now()) {
    return { locked: true, remaining: Math.ceil((entry.lockedUntil - Date.now()) / 1000) };
  }
  if (entry.count >= MAX_FAILS) failMap.delete(ip);
  return { locked: false, remaining: 0 };
}

function checkAttemptWindow(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = attemptMap.get(ip);
  if (!entry || now - entry.windowStart > ATTEMPT_WINDOW_MS) {
    evictIfNeeded(attemptMap);
    attemptMap.set(ip, { count: 1, windowStart: now, lastAccess: now });
    return { allowed: true, retryAfter: 0 };
  }
  entry.lastAccess = now;
  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.windowStart + ATTEMPT_WINDOW_MS - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

function recordFail(ip: string) {
  const entry = failMap.get(ip);
  if (!entry) {
    evictIfNeeded(failMap);
    failMap.set(ip, { count: 1, lockedUntil: 0, lastAccess: Date.now() });
  } else {
    entry.count++;
    entry.lastAccess = Date.now();
    if (entry.count >= MAX_FAILS) entry.lockedUntil = Date.now() + LOCK_SECONDS * 1000;
  }
}

function resetFail(ip: string) {
  failMap.delete(ip);
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of attemptMap) {
    if (now - entry.lastAccess > MAP_TTL_MS) attemptMap.delete(ip);
  }
  for (const [ip, entry] of failMap) {
    if ((entry.lockedUntil > 0 && entry.lockedUntil < now) || (now - entry.lastAccess > MAP_TTL_MS)) {
      failMap.delete(ip);
    }
  }
}, 60_000).unref();

// ─── 访问记录（无论通过与否都落库，供邮箱管理后台审计）──────────────────
// 审计记录不保存 IP，只保留结果、设备、UA 与时间。
function logAttempt(input: { result: string; userAgent: string; unlockToken?: string; tokenExpiresAt?: string }) {
  const userAgent = (input.userAgent || '').slice(0, 512);
  db.prepare(`
    INSERT INTO before_sarcophagus_access (id, result, device, user_agent, unlock_token, token_expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'bsa-' + uuid().slice(0, 8),
    input.result,
    detectDevice(userAgent),
    userAgent,
    input.unlockToken || null,
    input.tokenExpiresAt || null,
  );
}

// ─── GET /api/before-sarcophagus/entry ──────────────────────────────────
// 第一段公开内容，与终局页的正文下发方式保持一致。
router.get('/entry', (_req: Request, res: Response) => {
  res.json({ manuscript: FIRST_MANUSCRIPT });
});

// ─── POST /api/before-sarcophagus/verify ────────────────────────────────
// 游客可访问；密钥只在这里校验，成功返回五分钟访问令牌与第二段内容。
router.post('/verify', (req: Request, res: Response) => {
  const ip = getClientIP(req);
  const userAgent = String(req.headers['user-agent'] || '');

  const failLock = checkFailLock(ip);
  if (failLock.locked) {
    logAttempt({ result: 'rate_limited', userAgent });
    res.status(429).json({ correct: false, locked: true, remaining: failLock.remaining });
    return;
  }

  const attemptWindow = checkAttemptWindow(ip);
  if (!attemptWindow.allowed) {
    logAttempt({ result: 'rate_limited', userAgent });
    res.status(429).json({ correct: false, locked: true, remaining: attemptWindow.retryAfter });
    return;
  }

  const { input } = (req.body || {}) as { input?: unknown };
  if (typeof input !== 'string' || !input.trim() || input.trim().length > 200) {
    logAttempt({ result: 'invalid', userAgent });
    res.status(400).json({ correct: false, error: '请输入有效密钥' });
    return;
  }

  const normalized = input.trim();
  const hash = createHash('sha256').update(normalized).digest('hex');
  if (hash !== KEY_HASH) {
    recordFail(ip);
    const entry = failMap.get(ip);
    const fails = entry?.count || 1;
    const remaining = MAX_FAILS - fails;
    logAttempt({ result: 'fail', userAgent });
    res.status(403).json({
      correct: false,
      error: remaining > 0 ? `密钥错误，剩余尝试次数：${remaining}` : `密钥错误，请 ${LOCK_SECONDS} 秒后再试`,
      remaining,
    });
    return;
  }

  resetFail(ip);
  const unlockToken = uuid();
  const expiresAt = new Date(Date.now() + UNLOCK_TTL_MS).toISOString();
  logAttempt({ result: 'success', userAgent, unlockToken, tokenExpiresAt: expiresAt });

  res.set('Cache-Control', 'no-store');
  res.json({
    correct: true,
    unlockToken,
    expiresAt,
    expiresAtMs: Date.now() + UNLOCK_TTL_MS,
    manuscript: SECOND_MANUSCRIPT,
    audioUrl: AUDIO_URL,
  });
});

// ─── GET /api/before-sarcophagus/access?token= ─────────────────────────
// 页面刷新后，凭五分钟令牌恢复第二段内容；令牌过期或不存在则拒绝。
router.get('/access', (req: Request, res: Response) => {
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    res.status(400).json({ valid: false, error: '缺少访问令牌' });
    return;
  }
  const row = db.prepare('SELECT * FROM before_sarcophagus_access WHERE unlock_token = ?').get(token) as any;
  if (!row || !row.token_expires_at || new Date(row.token_expires_at) < new Date()) {
    res.status(403).json({ valid: false, error: '访问已过期，请重新验证' });
    return;
  }
  res.set('Cache-Control', 'no-store');
  res.json({
    valid: true,
    manuscript: SECOND_MANUSCRIPT,
    audioUrl: AUDIO_URL,
    expiresAt: row.token_expires_at,
  });
});

export default router;
