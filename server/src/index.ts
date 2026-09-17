import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import recordRoutes from './routes/records.js';
import puzzleRoutes from './routes/puzzles.js';
import wikiRoutes from './routes/wiki.js';
import fileRoutes from './routes/files.js';
import adminRoutes from './routes/admin.js';
import messageRoutes from './routes/messages.js';
import commentRoutes from './routes/comments.js';
import likeRoutes from './routes/likes.js';
import sarcophagusRoutes from './routes/sarcophagus.js';
import beforeSarcophagusRoutes from './routes/beforeSarcophagus.js';
import imageRoutes from './routes/images.js';
import siteRoutes from './routes/site.js';
import mailRoutes from './routes/mail.js';
import mailAdminRoutes from './routes/mailAdmin.js';
import { mailService } from './mail/MailService.js';
import storyRoutes from './routes/stories.js';
import loopPuzzleRoutes from './routes/loopPuzzle.js';
import { globalLimiter } from './lib/rateLimiter.js';
import { startDiskCleanup } from './lib/diskCleanup.js';
import { optionalAuth } from './middleware/pageAccess.js';
import { authMiddleware } from './middleware/auth.js';
import { NODE6_KEYS, parseNode6State } from './routes/loopPuzzle.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure upload directories
import * as fs from 'fs';
const avatarDir = path.join(__dirname, '..', 'uploads', 'avatars');
const imageDir = path.join(__dirname, '..', 'uploads', 'images');
const mailDir = path.join(__dirname, '..', 'uploads', 'mail');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
if (!fs.existsSync(mailDir)) fs.mkdirSync(mailDir, { recursive: true });

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// ─── 安全中间件层 ──────────────────────────────────────────────
// 0. Cookie 解析 (用于 httpOnly JWT token)
app.use(cookieParser());

// 1. 请求日志 (morgan: combined 格式，输出到 stdout)
app.use(morgan(':remote-addr - :method :url :status :res[content-length] - :response-time ms'));

// 2. 安全头 (helmet 自动设置多种安全头)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://sarcophagus.org.cn"],
      mediaSrc: ["'self'"],
      objectSrc: ["'self'"],
      frameAncestors: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// 3. CORS 仅允许本站域名
app.use(cors({
  origin: ['https://sarcophagus.org.cn', 'https://www.sarcophagus.org.cn'],
  credentials: true,
}));

// 4. Body 限制 10MB (原50MB过大，存在内存耗尽风险)
app.use(express.json({ limit: '10mb' }));

// 5. API 全局限速：仅对写操作 (POST/PUT/DELETE) 限制，100次/15分钟/IP
// GET 读操作由各端点自身的业务限速器保护
app.use('/api/', (req, res, next) => {
  if (req.method === 'GET') return next();
  return globalLimiter(req, res, next);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/puzzles', puzzleRoutes);
app.use('/api/wiki', wikiRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/sarcophagus', sarcophagusRoutes);
app.use('/api/before-sarcophagus', beforeSarcophagusRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/mail/admin', mailAdminRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/loop', loopPuzzleRoutes);

// Serve uploaded avatars with caching (avatar filenames are UUID-based, immutable)
app.use('/uploads/avatars', express.static(path.join(__dirname, '..', 'uploads', 'avatars'), {
  maxAge: '7d',
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=604800');
  },
}));

// Serve uploaded images with aggressive caching (immutable: filenames are UUIDs)
app.use('/api/images', express.static(imageDir, {
  maxAge: '30d',
  immutable: true,
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=2592000, immutable');
  },
}));

// Serve static frontend build
const staticDir = path.join(__dirname, '..', '..', 'app', 'dist');
// /loop 静态页面（节点2 论文网页 Loop Is All You Need）—— 显式路由，置于 express.static 之前，
// 避免 express.static 对目录的 301 重定向与 SPA fallback 冲突。
// 访问控制：依据 page_access 表 /loop 配置（默认 admin 级，管理面板可调）
app.get(['/loop', '/loop/'], optionalAuth('/loop'), (_req, res) => {
  res.sendFile(path.join(staticDir, 'loop', 'index.html'));
});
// /loop6/paper.pdf 节点6 论文正文（节点六二版，已去除附录；附录内容由密码解锁后展示）
// 访问控制：与页面 /THEDARKSIDESOFTHETWINTERRAHOPES 同级（依据 page_access 表配置），
// 防止绕过页面直接下载论文。
app.get('/loop6/paper.pdf', optionalAuth('/THEDARKSIDESOFTHETWINTERRAHOPES'), (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'uploads', 'loop6_paper.pdf'));
});
// /loop6/paper/pages/:n.png 节点6 论文预渲染页面图片（服务器端 PyMuPDF 渲染，浏览器端无需解析 PDF，避免兼容性问题）
app.get('/loop6/paper/pages/:n.png', optionalAuth('/THEDARKSIDESOFTHETWINTERRAHOPES'), (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'uploads', 'loop6_pages', `${req.params.n}.png`));
});
// /loop6/appendix/:key/pages/:page.png 节点6 附录 PDF 预渲染页面图片（解锁后可见）
// 访问控制：需登录 + 该用户已解锁对应附录，防止绕过密码直接获取附录正文
app.get('/loop6/appendix/:key/pages/:page.png', authMiddleware, (req: any, res) => {
  try {
    let key = req.params.key;
    try {
      key = decodeURIComponent(key);
    } catch {
      /* keep raw */
    }
    if (!NODE6_KEYS.includes(key)) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    if (!parseNode6State(req.userId!)[key]) {
      res.status(403).json({ error: '该附录尚未解锁' });
      return;
    }
    const page = req.params.page;
    if (!/^\d+$/.test(page)) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    const file = path.join(__dirname, '..', 'uploads', 'loop6_appendix', key, `${page}.png`);
    if (!fs.existsSync(file)) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    res.sendFile(file);
  } catch (err: any) {
    console.error('[loop6] appendix page error:', err);
    res.status(500).json({ error: '加载失败' });
  }
});
// /ORACLESAIDTHATCIVILSWITHNOENDSANDNOBEGINS 静态页面（节点0 终局谜题，由原 /end 切换路径而来）——
// 显式路由，置于 express.static 之前，避免 express.static 对目录的 301 重定向与 SPA fallback 冲突。
// 访问控制：依据 page_access 表新路径配置（默认 admin 级，管理面板可调）
app.get(['/ORACLESAIDTHATCIVILSWITHNOENDSANDNOBEGINS', '/ORACLESAIDTHATCIVILSWITHNOENDSANDNOBEGINS/'], optionalAuth('/ORACLESAIDTHATCIVILSWITHNOENDSANDNOBEGINS'), (req, res) => {
  // 无尾斜杠请求统一 302 到带尾斜杠，保证页面内相对跳转（echo.html 等）基于新路径目录正确解析
  if (!req.path.endsWith('/')) {
    return res.redirect('/ORACLESAIDTHATCIVILSWITHNOENDSANDNOBEGINS/');
  }
  res.sendFile(path.join(staticDir, 'ORACLESAIDTHATCIVILSWITHNOENDSANDNOBEGINS', 'index.html'));
});
// /BEFORETHESARCOPHAGUS 静态页面（石棺之前，半公开谜题页）——
// 显式路由，置于 express.static 之前；访问控制依据 page_access 表（默认 public，游客可访问）。
app.get(['/BEFORETHESARCOPHAGUS', '/BEFORETHESARCOPHAGUS/'], optionalAuth('/BEFORETHESARCOPHAGUS'), (req, res) => {
  // 无尾斜杠请求统一 302 到带尾斜杠，保证页面内相对资源解析正确
  if (!req.path.endsWith('/')) {
    return res.redirect('/BEFORETHESARCOPHAGUS/');
  }
  res.sendFile(path.join(staticDir, 'BEFORETHESARCOPHAGUS', 'index.html'));
});
// /WDSJ225772937AAAB 仿造 403 Forbidden 页（谜题线索页，右下角隐藏文字）——
// 显式路由，置于 express.static 之前；HTTP 状态码一并伪装为 403，增加真实性。
// 访问控制：依据 page_access 表配置（默认 admin 级，管理面板可调）
app.get(['/WDSJ225772937AAAB', '/WDSJ225772937AAAB/'], optionalAuth('/WDSJ225772937AAAB'), (req, res) => {
  if (!req.path.endsWith('/')) {
    return res.redirect('/WDSJ225772937AAAB/');
  }
  res.status(403).sendFile(path.join(staticDir, 'WDSJ225772937AAAB', 'index.html'));
});
// index: false — 不让 express.static 直接返回 index.html，留给下边的 SPA fallback 处理（那里会设置 Cache-Control: no-cache）
// ─── 谜题静态目录前缀守卫 ─────────────────────────────────────────
// 上方显式路由仅匹配精确路径（含/不含尾斜杠），其余子路径（如 /WDSJ.../index.html、
// /ORACLE.../yao.html、/loop/index.html）会落入 express.static 被直接下发，绕过页面门控。
// 此处统一按对应页面的 page_access 级别校验后再放行，复用 optionalAuth 与其缓存。
const SECRET_STATIC_PREFIXES: Array<[prefix: string, routePath: string]> = [
  ['/WDSJ225772937AAAB', '/WDSJ225772937AAAB'],
  ['/ORACLESAIDTHATCIVILSWITHNOENDSANDNOBEGINS', '/ORACLESAIDTHATCIVILSWITHNOENDSANDNOBEGINS'],
  ['/BEFORETHESARCOPHAGUS', '/BEFORETHESARCOPHAGUS'],
  ['/loop', '/loop'],
];
app.use((req, res, next) => {
  const p = req.path;
  for (const [prefix, routePath] of SECRET_STATIC_PREFIXES) {
    if (p === prefix || p.startsWith(prefix + '/')) {
      return optionalAuth(routePath)(req, res, next);
    }
  }
  next();
});
app.use(express.static(staticDir, { index: false }));

// SPA fallback: all non-API routes serve index.html
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🗿 石棺 (arkoverseer) 后端已启动`);
  console.log(`  📡 API:  http://0.0.0.0:${PORT}/api`);
  console.log(`  🌐 Web:  http://0.0.0.0:${PORT}/\n`);
  // 启动磁盘清理任务
  startDiskCleanup();

  // 启动垃圾箱 14 天自动清理任务
  const purgeMailTrash = () => {
    try { mailService.purgeExpiredTrash(14); } catch (e) { console.error('[Mail] 垃圾箱清理失败', e); }
  };
  purgeMailTrash();
  setInterval(purgeMailTrash, 24 * 60 * 60 * 1000).unref();
});
