// 节点0 终局谜题 —— /api/end
// 所有密码校验、分支判定、结局正文均在后端完成。
// 前端仅持有"壳"，无法从源码/静态文件中解出任何密码或结局内容。
import { Router, Request, Response } from 'express';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { END_HASHES, SESSION_TTL_MS } from '../data/endNode.js';
import { END_CONTENT } from '../data/end-content.js';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db.js';
import { authMiddleware, adminOnly, optionalAuthMiddleware, AuthRequest } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = Router();

// ─── 会话类型 ─────────────────────────────────────────────────────────────
interface EndSession {
  step: number;                 // 入口已通过步数（0-3）
  history: string[];            // 入口输入（小写化，用于结局判定）
  path: 'true' | 'fake' | null; // 入口完成后确定的分支
  echoDone: boolean;            // 回响页密码是否通过
  lastSeen: number;
}

// ─── 会话存储（in-memory，TTL 清理，重启即失效） ─────────────────────────
const sessions = new Map<string, EndSession>();
const MAX_SESSIONS = 10000;

function evictSessionsIfNeeded() {
  if (sessions.size <= MAX_SESSIONS) return;
  const entries = Array.from(sessions.entries()).sort((a, b) => a[1].lastSeen - b[1].lastSeen);
  const removeCount = Math.ceil(entries.length * 0.2);
  for (let i = 0; i < removeCount; i++) sessions.delete(entries[i][0]);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastSeen > SESSION_TTL_MS) sessions.delete(id);
  }
}, 60_000).unref();

// ─── IP 限速（防爆破，in-memory bounded） ────────────────────────────────
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

function getClientIP(req: Request): string {
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

// ─── 工具 ─────────────────────────────────────────────────────────────────
function sha256(s: string): Buffer {
  return createHash('sha256').update(s, 'utf8').digest();
}

// 恒定时间哈希比较（防时序攻击）
function hashEqual(input: string, hash: string): boolean {
  const a = sha256(input);
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function getStage(s: EndSession): 'entry' | 'echo' | 'ending' {
  if (s.echoDone) return 'ending';
  if (s.path) return 'echo';
  return 'entry';
}

function getSession(req: Request): EndSession | undefined {
  const id = (typeof req.query?.sessionId === 'string' ? req.query.sessionId : undefined)
    || (typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined);
  const s = id ? sessions.get(id) : undefined;
  if (s) s.lastSeen = Date.now();
  return s;
}

function lockedRemaining(ip: string): number {
  const e = ipFailMap.get(ip);
  if (!e || e.lockedUntil <= Date.now()) return 0;
  return Math.max(1, Math.ceil((e.lockedUntil - Date.now()) / 1000));
}

// ─── API ──────────────────────────────────────────────────────────────────

// 创建会话
router.post('/start', (_req: Request, res: Response) => {
  evictSessionsIfNeeded();
  const id = randomUUID();
  sessions.set(id, { step: 0, history: [], path: null, echoDone: false, lastSeen: Date.now() });
  res.json({ sessionId: id });
});

// 会话当前阶段
router.get('/state', (req: Request, res: Response) => {
  const s = getSession(req);
  if (!s) return res.status(404).json({ error: '会话不存在或已过期，请刷新页面重新开始' });
  res.json({ stage: getStage(s), step: s.step, path: s.path });
});

// 入口页内容（手稿与占位符为公开线索，无敏感信息）
router.get('/entry', (_req: Request, res: Response) => {
  res.json({
    manuscript: END_CONTENT.entry,
    steps: [
      { placeholder: 'LynchWorld' },
      { placeholder: 'LynchMe' },
      { placeholder: '...' },
    ],
  });
});

// 入口密码校验（三步序列）
router.post('/verify-entry', (req: Request, res: Response) => {
  const s = getSession(req);
  if (!s) return res.status(404).json({ error: '会话不存在或已过期，请刷新页面重新开始' });
  if (getStage(s) !== 'entry') return res.status(400).json({ error: '当前阶段不允许此操作' });

  const ip = getClientIP(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ locked: true, remaining: lockedRemaining(ip) });
  }

  const input = typeof req.body?.input === 'string' ? req.body.input.trim().toLowerCase() : '';
  const step = s.step;
  const fakeHash = step === 0 ? END_HASHES.fakeStep0
    : step === 1 ? END_HASHES.fakeStep1
    : END_HASHES.fakeStep2;
  const trueHash = step === 0 ? END_HASHES.trueStep0
    : step === 1 ? END_HASHES.trueStep1
    : END_HASHES.trueStep2;

  // 每步接受：假结局序列该步 或 真结局序列该步（不区分大小写）
  const ok = hashEqual(input, fakeHash) || hashEqual(input, trueHash);
  if (!ok) {
    recordFail(ip);
    return res.json({ correct: false });
  }

  resetFails(ip);
  s.history.push(input);
  s.step += 1;

  if (s.step < 3) {
    return res.json({ correct: true, done: false, step: s.step });
  }

  // 3 步完成 → 判定结局
  const [h0, h1, h2] = s.history;
  const allTrue = hashEqual(h0, END_HASHES.trueStep0)
    && hashEqual(h1, END_HASHES.trueStep1)
    && hashEqual(h2, END_HASHES.trueStep2);
  const allFake = hashEqual(h0, END_HASHES.fakeStep0)
    && hashEqual(h1, END_HASHES.fakeStep1)
    && hashEqual(h2, END_HASHES.fakeStep2);

  if (allTrue) {
    s.path = 'true';
    return res.json({ correct: true, done: true, path: 'true' });
  }
  if (allFake) {
    s.path = 'fake';
    return res.json({ correct: true, done: true, path: 'fake' });
  }
  // 混合输入 → 重置（对应原版"重新开始"）
  s.step = 0;
  s.history = [];
  return res.json({ correct: true, done: true, reset: true });
});

// 回响页内容（按分支下发对应版本，需先通过入口）
router.get('/echo', (req: Request, res: Response) => {
  const s = getSession(req);
  if (!s) return res.status(404).json({ error: '会话不存在或已过期，请刷新页面重新开始' });
  if (!s.path) return res.status(403).json({ error: '尚未通过入口' });
  res.json({
    manuscript: s.path === 'true' ? END_CONTENT.echoTrue : END_CONTENT.echoFake,
    path: s.path,
    prompt: '再预言一次，神谕',
    placeholder: '......',
  });
});

// 回响页密码校验（true 路径不区分大小写，fake 路径严格匹配）
router.post('/verify-echo', (req: Request, res: Response) => {
  const s = getSession(req);
  if (!s) return res.status(404).json({ error: '会话不存在或已过期，请刷新页面重新开始' });
  if (!s.path || s.echoDone) return res.status(400).json({ error: '当前阶段不允许此操作' });

  const ip = getClientIP(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ locked: true, remaining: lockedRemaining(ip) });
  }

  const raw = typeof req.body?.input === 'string' ? req.body.input.trim() : '';
  const ok = s.path === 'true'
    ? hashEqual(raw.toLowerCase(), END_HASHES.echoTrue)
    : hashEqual(raw, END_HASHES.echoFake);

  if (!ok) {
    recordFail(ip);
    return res.json({ correct: false });
  }

  resetFails(ip);
  s.echoDone = true;
  res.json({ correct: true, ending: s.path });
});

// 结局内容（必须完成回响验证后才下发，真/假结局正文只存在后端）
router.get('/ending', (req: Request, res: Response) => {
  const s = getSession(req);
  if (!s) return res.status(404).json({ error: '会话不存在或已过期，请刷新页面重新开始' });
  if (!s.echoDone || !s.path) return res.status(403).json({ error: '尚未完成验证' });
  const isTrue = s.path === 'true';
  res.json({
    manuscript: isTrue ? END_CONTENT.trueEnd : END_CONTENT.fakeEnd,
    type: s.path,
    title: isTrue ? '∅' : '回响',
  });
});

// 爻说 PDF（真结局线索，仅真分支会话可访问；文件存放于后端私有目录，不对外公开）
const PDF_DIR_CANDIDATES = [
  // server/data/end —— 源数据目录（dev: src/routes/../.. ; build: dist/routes/../.. 都指到 server 根下的 data）
  path.join(__dirname, '..', '..', 'data', 'end'),
  // server/src/data/end —— 兼容旧位置
  path.join(__dirname, '..', 'data', 'end'),
];
function resolvePdfPath(): string | undefined {
  for (const dir of PDF_DIR_CANDIDATES) {
    if (!existsSync(dir)) continue;
    // 通配 *.pdf 定位，避免硬编码中文文件名带来的编码差异问题
    try {
      const found = readdirSync(dir).find((f) => f.toLowerCase().endsWith('.pdf'));
      if (found) return path.join(dir, found);
    } catch { /* 目录读取失败则尝试下一个候选 */ }
  }
  return undefined;
}

router.get('/pdf', (req: Request, res: Response) => {
  const s = getSession(req);
  if (!s) return res.status(404).json({ error: '会话不存在或已过期，请刷新页面重新开始' });
  if (s.path !== 'true') return res.status(403).json({ error: '尚未进入真结局路径' });
  const file = resolvePdfPath();
  if (!file) return res.status(404).json({ error: '资料文件缺失' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="yao.pdf"');
  res.sendFile(file);
});

// ─── 管理接口：重置所有 /end 会话（供 admin 使用） ─────────────────────
export function resetEndSessions() {
  const sessionCount = sessions.size;
  const lockCount = Array.from(ipFailMap.values()).filter(e => e.lockedUntil > Date.now()).length;
  sessions.clear();
  ipFailMap.clear();
  return { sessions: sessionCount, locks: lockCount };
}

// ─── 抵达记录：真/假结局信息收集 ─────────────────────────────────────────
// 阈值：非管理员记录（真+假合计）达到 ADDRESS_LIMIT 后，弹窗不再收集收货地址。
const ADDRESS_LIMIT = 11;

// 玩家提交抵达记录（真/假结局页面的"刺入榫销"弹窗）
router.post('/record', optionalAuthMiddleware, (req: AuthRequest, res: Response) => {
  // 会话 id 是 sessions Map 的 key（EndSession 上无 id 字段），须从请求中取出
  const sessionId = (typeof req.body?.sessionId === 'string' ? req.body.sessionId : '')
    || (typeof req.query?.sessionId === 'string' ? req.query.sessionId : '');
  const s = sessionId ? sessions.get(sessionId) : undefined;
  if (!s) return res.status(404).json({ error: '会话不存在或已过期，请刷新页面重新开始' });
  if (!s.echoDone || !s.path) return res.status(403).json({ error: '尚未完成结局' });

  const dup = db.prepare('SELECT id FROM end_records WHERE session_id = ?').get(sessionId);
  if (dup) return res.status(409).json({ error: '该会话已提交过抵达记录' });

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
  const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';

  if (!name || name.length > 60) return res.status(400).json({ error: '请留下你的名字' });

  // 登录身份识别：管理员（网站后台登录）提交不计入数量，但保留可见
  const isAdmin = req.userRole === 'admin';

  // 地址收集阈值：非管理员记录数达到限制后不再收集地址
  const row = db.prepare('SELECT COUNT(*) as total FROM end_records WHERE is_admin = 0').get() as { total: number };
  const collectAddress = row.total < ADDRESS_LIMIT;
  const finalPhone = collectAddress ? phone.slice(0, 40) : '';
  const finalAddress = collectAddress ? address.slice(0, 200) : '';

  db.prepare(`INSERT INTO end_records
    (id, branch, name, phone, address, session_id, user_id, user_name, is_admin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), s.path, name, finalPhone, finalAddress, sessionId, req.userId || '', req.userName || '', isAdmin ? 1 : 0);

  res.json({ ok: true, collectedAddress: collectAddress, branch: s.path });
});

// 收集状态（弹窗打开时查询：是否还需收集地址）
router.get('/record-status', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT branch, COUNT(*) as cnt FROM end_records WHERE is_admin = 0 GROUP BY branch').all() as { branch: string; cnt: number }[];
  const trueCount = rows.find((r) => r.branch === 'true')?.cnt || 0;
  const fakeCount = rows.find((r) => r.branch === 'fake')?.cnt || 0;
  const total = trueCount + fakeCount;
  res.json({ total, trueCount, fakeCount, limit: ADDRESS_LIMIT, collectAddress: total < ADDRESS_LIMIT });
});

// 管理查看：所有抵达记录（按提交顺序；含管理员提交，便于测试）
router.get('/records', authMiddleware, adminOnly, (_req: Request, res: Response) => {
  const rows = db.prepare(
    'SELECT id, branch, name, phone, address, session_id, user_id, user_name, is_admin, created_at FROM end_records ORDER BY created_at ASC, id ASC'
  ).all() as Array<Record<string, unknown>>;
  const records = rows.map((r, i) => ({
    seq: i + 1,
    id: r.id,
    branch: r.branch,
    name: r.name,
    phone: r.phone,
    address: r.address,
    session_id: r.session_id,
    user_name: r.user_name,
    is_admin: !!r.is_admin,
    created_at: r.created_at,
  }));
  const playerCount = records.filter((r) => !r.is_admin).length;
  res.json({
    records,
    stats: {
      total: records.length,
      playerCount,
      trueCount: records.filter((r) => r.branch === 'true').length,
      fakeCount: records.filter((r) => r.branch === 'fake').length,
      collectAddress: playerCount < ADDRESS_LIMIT,
      limit: ADDRESS_LIMIT,
    },
  });
});

// 删除单条记录（仅管理员，测试清理用）
router.delete('/records/:id', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const info = db.prepare('DELETE FROM end_records WHERE id = ?').run(req.params.id);
  res.json({ deleted: info.changes > 0 });
});

export default router;
