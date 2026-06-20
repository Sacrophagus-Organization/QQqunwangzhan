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
import sarcophagusRoutes from './routes/sarcophagus.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
app.use('/api/sarcophagus', sarcophagusRoutes);

// Serve static frontend build
const staticDir = path.join(__dirname, '..', '..', 'app', 'dist');
app.use(express.static(staticDir));

// SPA fallback: all non-API routes serve index.html
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🗿 石棺 (arkoverseer) 后端已启动`);
  console.log(`  📡 API:  http://0.0.0.0:${PORT}/api`);
  console.log(`  🌐 Web:  http://0.0.0.0:${PORT}/\n`);
});
