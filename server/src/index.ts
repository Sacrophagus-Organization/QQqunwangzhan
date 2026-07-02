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
import imageRoutes from './routes/images.js';
import siteRoutes from './routes/site.js';
import mailRoutes from './routes/mail.js';
import storyRoutes from './routes/stories.js';
import { globalLimiter } from './lib/rateLimiter.js';
import { startDiskCleanup } from './lib/diskCleanup.js';

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
      objectSrc: ["'none'"],
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
app.use('/api/images', imageRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/stories', storyRoutes);

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
// index: false — 不让 express.static 直接返回 index.html，留给下边的 SPA fallback 处理（那里会设置 Cache-Control: no-cache）
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
});
