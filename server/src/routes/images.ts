import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'images');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPEG、PNG、GIF、WebP、BMP 格式'));
    }
  },
});

const router = Router();

// POST /api/images/upload — requires auth
// GET /api/images/:filename — served by express.static in index.ts (no auth needed for display)
router.post('/upload', authMiddleware, (req: AuthRequest, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: '图片大小不能超过10MB' });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: '请选择图片文件' });
      return;
    }
    const url = `/api/images/${req.file.filename}`;
    res.json({ url, filename: req.file.filename, size: req.file.size });
  });
});

export default router;
