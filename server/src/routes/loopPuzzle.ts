import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { LOOP_NODE6_APPENDICES, LOOP_NODE6_PAPER } from '../data/loopNode6.js';

const router = Router();

// ─── 常量 ────────────────────────────────────────────────────────────────
export const NODE6_KEYS = LOOP_NODE6_APPENDICES.map((a) => a.key); // ['A'...'J','?']

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
// key 与 PDF 附录标签对齐（A-J + ?）。defaultUnlocked 附录（A/B/C/D/?）始终解锁。
// 2026-08 结构调整：原 J「遇见终究遗忘」移至 D，E-J 依次顺延（内容/密码跟随原 D-I）。
// 已按需求重置全部 node6 解锁进度，不再提供旧 key 迁移。

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPENDIX_PAGES_DIR = path.join(__dirname, '..', '..', 'uploads', 'loop6_appendix');

// 返回指定附录预渲染页面图的相对 URL 列表（页面图文件由部署脚本按 <key>/<n>.png 生成）
export function getAppendixPages(key: string): string[] {
  const dir = path.join(APPENDIX_PAGES_DIR, key);
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f));
  } catch {
    return [];
  }
  files.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  return files.map((f) => `/loop6/appendix/${encodeURIComponent(key)}/pages/${f}`);
}

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

export function parseNode6State(userId: string): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  // defaultUnlocked 附录（A/B/C/D/?）从一开始就解锁，无视 DB 状态
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
    return result;
  } catch {
    return result;
  }
}

export function getNodeState(userId: string, nodeKey: string): boolean {
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
        // 已解锁的附录返回预渲染 PDF 页面图 URL 列表（仅解锁者可见）
        pages: unlocked[a.key] ? getAppendixPages(a.key) : undefined,
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
// 注意：defaultUnlocked 附录（A/B/C/D/?）不通过本接口，前端直接阅读。
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

    res.json({ correct: true, pages: getAppendixPages(key) });
  } catch (err: any) {
    console.error('[loop] POST /node6/unlock error:', err);
    res.status(500).json({ error: '解锁失败' });
  }
});

export default router;
