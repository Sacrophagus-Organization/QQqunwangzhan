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


// 销毁邮箱账号 — 软删除
router.delete('/account', (req: AuthRequest, res) => {
  try {
    const account = db.prepare('SELECT * FROM mail_accounts WHERE user_id=?').get(req.userId!) as any;
    if (!account) { res.status(404).json({ error: '未找到邮箱账号' }); return; }
    db.prepare('UPDATE mail_accounts SET status=?, updated_at=? WHERE user_id=?').run('disabled', new Date().toISOString(), req.userId!);
    res.json({ success: true, message: '邮箱已停用，已有邮件将保留90天后自动清除' });
  } catch (err) { sendError(res, err); }
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

// Poll for new mail notifications
router.get('/poll', (req: AuthRequest, res) => {
  try {
    const since = String(req.query.since || '');
    const account = db.prepare('SELECT id FROM mail_accounts WHERE user_id=? AND status=?').get(req.userId!, 'active') as any;
    if (!account) { res.json({ newCount: 0, unreadCounts: {} }); return; }
    
    // New inbox messages since timestamp
    let newCount = 0;
    let latestMessages: any[] = [];
    if (since) {
      latestMessages = db.prepare(
        "SELECT id, from_address, from_name, subject, received_at FROM mail_messages WHERE owner_user_id=? AND folder='inbox' AND is_read=0 AND received_at > ? AND deleted_at IS NULL ORDER BY received_at DESC LIMIT 10"
      ).all(req.userId!, since) as any[];
      newCount = latestMessages.length;
    }
    
    // Unread counts per folder
    const unreadRows = db.prepare(
      "SELECT folder, COUNT(*) as cnt FROM mail_messages WHERE owner_user_id=? AND is_read=0 AND deleted_at IS NULL GROUP BY folder"
    ).all(req.userId!) as any[];
    const unreadCounts: Record<string, number> = {};
    for (const r of unreadRows) { unreadCounts[r.folder] = r.cnt; }
    
    res.json({
      newCount,
      unreadCounts,
      latest: latestMessages.map(function(m: any) { return {
        id: m.id,
        fromAddress: m.from_address,
        fromName: m.from_name,
        subject: m.subject,
        receivedAt: m.received_at,
      };}),
    });
  } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'Request failed' }); }
});

// Recent recipients for compose autocomplete
router.get('/recipients', (req: AuthRequest, res) => {
  try {
    const account = db.prepare('SELECT id FROM mail_accounts WHERE user_id=? AND status=?').get(req.userId!, 'active') as any;
    if (!account) { res.json([]); return; }
      // Get all active mail accounts as base recipient pool
      const accounts = db.prepare(
        "SELECT ma.address, ma.display_name FROM mail_accounts ma WHERE ma.status='active' AND ma.user_id!=? ORDER BY ma.address"
      ).all(req.userId!) as any[];
      const seen = new Set<string>();
      const result: {address:string;name:string}[] = [];
      for (const a of accounts) {
        const key = a.address.toLowerCase();
        if (!seen.has(key)) { seen.add(key); result.push({ address: a.address, name: a.display_name || "" }); }
      }
      // Also add recipients from inbox senders (if any)
      const inboxRows = db.prepare(
        "SELECT DISTINCT from_address, from_name FROM mail_messages WHERE owner_user_id=? AND folder='inbox' ORDER BY received_at DESC LIMIT 30"
      ).all(req.userId!) as any[];
      for (const r of inboxRows) {
        const key = r.from_address.toLowerCase();
        if (!seen.has(key)) { seen.add(key); result.push({ address: r.from_address, name: r.from_name || "" }); }
      }
      // Plus recipients from sent messages (to_addresses JSON)
      const sentRows = db.prepare(
        "SELECT to_addresses FROM mail_messages WHERE owner_user_id=? AND folder='sent' ORDER BY received_at DESC LIMIT 30"
      ).all(req.userId!) as any[];
      for (const r of sentRows) {
        try {
          const tos = JSON.parse(r.to_addresses || "[]");
          for (const t of tos) {
            if (!t || !t.address) continue;
            const key = t.address.toLowerCase();
            if (!seen.has(key)) { seen.add(key); result.push({ address: t.address, name: t.name || "" }); }
          }
        } catch(e) {}
      }
    res.json(result);
  } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'Request failed' }); }
});

export default router;
