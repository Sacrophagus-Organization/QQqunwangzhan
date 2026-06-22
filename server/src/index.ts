import express from 'express';
import cors from 'cors';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure avatar upload directory
import * as fs from 'fs';
const avatarDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

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

// Serve uploaded avatars as static files
app.use('/uploads/avatars', express.static(path.join(__dirname, '..', 'uploads', 'avatars')));

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
});
