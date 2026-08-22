import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { LOOP_NODE6_APPENDICES, LOOP_NODE6_PAPER } from '../data/loopNode6.js';

const router = Router();

// ─── 常量 ────────────────────────────────────────────────────────────────
const NODE6_KEYS = LOOP_NODE6_APPENDICES.map((a) => a.key); // ['A'...'J','?']

const APPENDIX_HASH_MAP = new Map(
  LOOP_NODE6_APPENDICES.map((a) => [a.key, a.passwordHash] as const)
);

// ─── IP 限速（unlock 防爆破，in-memory bounded） ─────────────────────────
const ipFailMap = new Map<string, { count: number; lockedUntil: number; lastAccess: number }>();
const MAX_FAILS = 5;
const LOCK_SECONDS = 60;
const MAX_MAP_SIZE = 10000;
const MAP_TTL_MS = 30 * 60_000;

function evictIfNeeded() {
  if (ipFailMap.size <= MAX_MAP_SIZE) return;
  const entries = Array.from(ipFailMap.entries()).sort((a, b) => a[1].lastAccess - b[1].lastAccess);
  const removeCount = Math.ceil(entries.length * 0.2);
  for (let i = 0; i < removeCount; i++) ipFailMap.delete(entries[i][0]);
}

function getClientIP(req: any): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const entry = ipFailMap.get(ip);
  if (!entry) return true;
  entry.lastAccess = Date.now();
  if (entry.lockedUntil > Date.now()) return false;
  if (entry.count >= MAX_FAILS) ipFailMap.delete(ip);
  return true;
}

function recordFail(ip: string) {
  const entry = ipFailMap.get(ip);
  if (!entry) {
    evictIfNeeded();
    ipFailMap.set(ip, { count: 1, lockedUntil: 0, lastAccess: Date.now() });
  } else {
    entry.count++;
    entry.lastAccess = Date.now();
    if (entry.count >= MAX_FAILS) {
      entry.lockedUntil = Date.now() + LOCK_SECONDS * 1000;
    }
  }
}

function resetFails(ip: string) {
  ipFailMap.delete(ip);
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipFailMap) {
    if ((entry.lockedUntil > 0 && entry.lockedUntil < now) || (now - entry.lastAccess > MAP_TTL_MS)) {
      ipFailMap.delete(ip);
    }
  }
}, 60_000).unref();

// ─── 进度读写辅助 ────────────────────────────────────────────────────────
// 旧版 key 系统为 D-I（对应 PDF 附录 E-J），当前 key 已与 PDF 标签对齐（A-J+?）：
//   D=语言预言寓言 E=必然的循环 F=无解死局 G=为明天占卜 H=终端 I=一角 J=遇见终究遗忘
// 迁移映射：旧 D→新 E、旧 E→新 F、…、旧 I→新 J（旧版 D-I 的内容在修正后的 key 表下
// 恰好落在新 E-J 上），避免老玩家解锁进度丢失。
const LEGACY_KEY_MAP: Record<string, string> = {
  D: 'E', E: 'F', F: 'G', G: 'H', H: 'I', I: 'J',
};

function getProgressRow(userId: string, nodeKey: string): any {
  return db.prepare('SELECT * FROM puzzle_progress WHERE user_id = ? AND node_key = ?')
    .get(userId, nodeKey);
}

export function upsertProgress(userId: string, nodeKey: string, state: Record<string, unknown>) {
  const now = new Date().toISOString();
  const stateJson = JSON.stringify(state);
  db.prepare(`INSERT INTO puzzle_progress (id, user_id, node_key, state, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, node_key) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`)
    .run('lp-' + uuid().slice(0, 8), userId, nodeKey, stateJson, now);
}

function parseNode6State(userId: string): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  // defaultUnlocked 附录（A/B/C/J/?）从一开始就解锁，无视 DB 状态
  for (const a of LOOP_NODE6_APPENDICES) {
    if (a.defaultUnlocked) result[a.key] = true;
  }
  const row = getProgressRow(userId, 'node6');
  if (!row) return result;
  try {
    const parsed = JSON.parse(row.state || '{}');
    for (const k of NODE6_KEYS) {
      if (parsed[k]) result[k] = true;
    }
    // 旧版 key（D-I）进度迁移到新 key
    for (const [oldK, newK] of Object.entries(LEGACY_KEY_MAP)) {
      if (parsed[oldK]) result[newK] = true;
    }
    return result;
  } catch {
    return result;
  }
}

function getNodeState(userId: string, nodeKey: string): boolean {
  return !!getProgressRow(userId, nodeKey);
}

// ─── GET /api/loop/progress ─────────────────────────────────────────────
// 返回节点2/4 完成状态与节点6 各附录解锁状态
router.get('/progress', authMiddleware, (req: AuthRequest, res) => {
  try {
    const node6 = parseNode6State(req.userId!);
    res.json({
      node2: getNodeState(req.userId!, 'node2'),
      node4: getNodeState(req.userId!, 'node4'),
      node6,
    });
  } catch (err: any) {
    console.error('[loop] GET /progress error:', err);
    res.status(500).json({ error: '获取进度失败' });
  }
});

// ─── GET /api/loop/node6 ────────────────────────────────────────────────
// 返回论文元数据 + 附录列表（不含内容，unlocked 状态由服务端判定）
router.get('/node6', authMiddleware, (req: AuthRequest, res) => {
  try {
    const unlocked = parseNode6State(req.userId!);
    res.json({
      paper: LOOP_NODE6_PAPER,
      appendices: LOOP_NODE6_APPENDICES.map((a) => ({
        key: a.key,
        title: a.title,
        subtitle: a.subtitle,
        unlocked: !!unlocked[a.key],
        // 已解锁的附录直接返回正文，刷新后可再次阅读
        content: unlocked[a.key] ? a.content : undefined,
      })),
    });
  } catch (err: any) {
    console.error('[loop] GET /node6 error:', err);
    res.status(500).json({ error: '获取线索板失败' });
  }
});

// ─── POST /api/loop/node6/unlock ────────────────────────────────────────
// body: { appendix: 'A'..'J'|'?', password: string }
// 密码校验（sha256 摘要比对）成功则写服务端进度并返回该附录正文
// 注意：defaultUnlocked 附录（A/B/C/J/?）不通过本接口，前端直接阅读。
router.post('/node6/unlock', authMiddleware, (req: AuthRequest, res) => {
  try {
    const ip = getClientIP(req);
    if (!checkRateLimit(ip)) {
      const entry = ipFailMap.get(ip);
      const remaining = entry ? Math.ceil((entry.lockedUntil - Date.now()) / 1000) : LOCK_SECONDS;
      res.status(429).json({ error: `尝试次数过多，请 ${remaining} 秒后再试` });
      return;
    }

    const { appendix, password } = req.body || {};
    if (!appendix || typeof appendix !== 'string' || !NODE6_KEYS.includes(appendix.toUpperCase())) {
      res.status(400).json({ error: '无效的附录编号' });
      return;
    }
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: '请输入密码' });
      return;
    }

    const key = appendix.toUpperCase();
    // 密码归一化：去除首尾空白，转大写（谜题密码均为大写字母/数字）
    const normalized = password.trim().toUpperCase();
    const hash = crypto.createHash('sha256').update(normalized).digest('hex');

    if (hash !== APPENDIX_HASH_MAP.get(key)) {
      recordFail(ip);
      const entry = ipFailMap.get(ip);
      const fails = entry?.count || 1;
      const remaining = MAX_FAILS - fails;
      res.status(403).json({
        correct: false,
        error: remaining > 0 ? `密码错误，剩余尝试次数: ${remaining}` : `密码错误，请 ${LOCK_SECONDS} 秒后再试`,
      });
      return;
    }

    resetFails(ip);
    const unlocked = parseNode6State(req.userId!);
    unlocked[key] = true;
    upsertProgress(req.userId!, 'node6', unlocked);

    const appendixConfig = LOOP_NODE6_APPENDICES.find((a) => a.key === key);
    res.json({ correct: true, content: appendixConfig?.content || '' });
  } catch (err: any) {
    console.error('[loop] POST /node6/unlock error:', err);
    res.status(500).json({ error: '解锁失败' });
  }
});

export default router;
