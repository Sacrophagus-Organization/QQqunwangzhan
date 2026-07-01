import { Router, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { mailService } from '../mail/MailService.js';
import { db } from '../db.js';
import { buildAddress, normalizeLocalPart } from '../mail/address.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'mail');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024, files: 10 } });

const router: Router = Router();
router.use(authMiddleware);

function sendError(res: Response, err: unknown) {
  res.status(400).json({ error: err instanceof Error ? err.message : '请求失败' });
}

router.get('/account', async (req: AuthRequest, res) => {
  res.json(await mailService.getAccount(req.userId!));
});

router.post('/account', async (req: AuthRequest, res) => {
  try {
    const requestedLocal = normalizeLocalPart(req.body.localPart || req.userName || '');
    if (!requestedLocal) { res.status(400).json({ error: '邮箱前缀不能为空' }); return; }
    const account = await mailService.createAccount({
      userId: req.userId!,
      username: req.userName!,
      displayName: req.body.displayName || req.userName,
      requestedAddress: buildAddress(requestedLocal),
    });
    res.status(201).json(account);
  } catch (err) { sendError(res, err); }
});

router.get('/folders', (req: AuthRequest, res) => {
  res.json(mailService.getFolders(req.userId!));
});

router.get('/messages', (req: AuthRequest, res) => {
  try {
    res.json(mailService.listMessages({
      userId: req.userId!,
      folder: String(req.query.folder || 'inbox'),
      query: String(req.query.q || ''),
      page: Number(req.query.page || 1),
      pageSize: Number(req.query.pageSize || 20),
    }));
  } catch (err) { sendError(res, err); }
});

router.get('/messages/:id', (req: AuthRequest, res) => {
  try { res.json(mailService.getMessage(req.userId!, String(req.params.id))); }
  catch (err) { sendError(res, err); }
});

router.post('/messages', upload.array('attachments', 10), async (req: AuthRequest, res) => {
  try {
    const message = await mailService.sendMessage(req.userId!, req.body, req.files as Express.Multer.File[]);
    res.status(201).json(message);
  } catch (err) { sendError(res, err); }
});

router.post('/drafts', upload.array('attachments', 10), async (req: AuthRequest, res) => {
  try {
    const message = await mailService.saveDraft(req.userId!, req.body, req.files as Express.Multer.File[]);
    res.status(201).json(message);
  } catch (err) { sendError(res, err); }
});

router.put('/messages/:id/read', (req: AuthRequest, res) => {
  try { res.json(mailService.markRead(req.userId!, String(req.params.id), req.body.read !== false)); }
  catch (err) { sendError(res, err); }
});

router.put('/messages/:id/star', (req: AuthRequest, res) => {
  try { res.json(mailService.star(req.userId!, String(req.params.id), req.body.starred !== false)); }
  catch (err) { sendError(res, err); }
});

router.put('/messages/:id/move', (req: AuthRequest, res) => {
  try { res.json(mailService.move(req.userId!, String(req.params.id), String(req.body.folder))); }
  catch (err) { sendError(res, err); }
});

router.delete('/messages/:id', (req: AuthRequest, res) => {
  try { res.json(mailService.delete(req.userId!, String(req.params.id))); }
  catch (err) { sendError(res, err); }
});

router.get('/messages/:messageId/attachments/:attachmentId/download', (req: AuthRequest, res) => {
  const message = db.prepare('SELECT id FROM mail_messages WHERE owner_user_id=? AND id=? AND deleted_at IS NULL')
    .get(req.userId!, String(req.params.messageId)) as any;
  if (!message) { res.status(404).json({ error: '邮件不存在' }); return; }
  const att = db.prepare('SELECT * FROM attachments WHERE id=? AND entity_type=? AND entity_id=?')
    .get(String(req.params.attachmentId), 'mail_message', String(req.params.messageId)) as any;
  if (!att || !fs.existsSync(att.file_path)) { res.status(404).json({ error: '附件不存在' }); return; }
  res.attachment(att.name);
  res.setHeader('Content-Type', att.mime_type || 'application/octet-stream');
  res.sendFile(att.file_path);
});

export default router;
