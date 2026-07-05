import { Router, type Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';
import { mailService } from '../mail/MailService.js';
import { getAccountByAddress } from '../mail/repository.js';
import { v4 as uuid } from 'uuid';
import fs from 'fs';

const router: Router = Router();
router.use(authMiddleware);
router.use(adminOnly);

function log(adminId: string, adminName: string, action: string, targetType: string, targetId: string, detail: string) {
  db.prepare('INSERT INTO mail_admin_logs (id, admin_id, admin_name, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('maillog-' + uuid().slice(0, 8), adminId, adminName, action, targetType, targetId, detail);
}

function sendError(res: Response, err: unknown) {
  res.status(400).json({ error: err instanceof Error ? err.message : '请求失败' });
}

// ═══════════════════════════════════════════════
// 统计概览
// ═══════════════════════════════════════════════
router.get('/stats', (_req: AuthRequest, res) => {
  const totalAccounts = (db.prepare('SELECT COUNT(*) as cnt FROM mail_accounts').get() as any).cnt;
  const activeAccounts = (db.prepare("SELECT COUNT(*) as cnt FROM mail_accounts WHERE status='active'").get() as any).cnt;
  const pendingAccounts = (db.prepare("SELECT COUNT(*) as cnt FROM mail_accounts WHERE status='pending'").get() as any).cnt;
  const disabledAccounts = (db.prepare("SELECT COUNT(*) as cnt FROM mail_accounts WHERE status='disabled'").get() as any).cnt;
  const totalMessages = (db.prepare('SELECT COUNT(*) as cnt FROM mail_messages WHERE deleted_at IS NULL').get() as any).cnt;
  const inboxCount = (db.prepare("SELECT COUNT(*) as cnt FROM mail_messages WHERE folder='inbox' AND deleted_at IS NULL").get() as any).cnt;
  const sentCount = (db.prepare("SELECT COUNT(*) as cnt FROM mail_messages WHERE folder='sent' AND deleted_at IS NULL").get() as any).cnt;
  const trashCount = (db.prepare("SELECT COUNT(*) as cnt FROM mail_messages WHERE folder='deleted' AND deleted_at IS NULL").get() as any).cnt;
  const todayStart = new Date().toISOString().slice(0, 10);
  const todaySent = (db.prepare("SELECT COUNT(*) as cnt FROM mail_messages WHERE folder='sent' AND received_at >= ? AND deleted_at IS NULL").get(todayStart) as any).cnt;
  const todayReceived = (db.prepare("SELECT COUNT(*) as cnt FROM mail_messages WHERE folder='inbox' AND received_at >= ? AND deleted_at IS NULL").get(todayStart) as any).cnt;
  const attachSize = (db.prepare("SELECT COALESCE(SUM(size),0) as total FROM attachments WHERE entity_type='mail_message'").get() as any).total;
  const botCount = (db.prepare('SELECT COUNT(*) as cnt FROM mail_bots').get() as any).cnt;

  res.json({
    totalAccounts, activeAccounts, pendingAccounts, disabledAccounts,
    totalMessages, inboxCount, sentCount, trashCount,
    todaySent, todayReceived,
    totalAttachSize: attachSize,
    botCount,
  });
});

// ═══════════════════════════════════════════════
// 账号管理
// ═══════════════════════════════════════════════
router.get('/accounts', (req: AuthRequest, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const status = String(req.query.status || '');
  const role = String(req.query.role || '');
  const search = String(req.query.q || '').trim();
  const offset = (page - 1) * pageSize;

  let where = '1=1';
  const params: any[] = [];
  if (status) { where += ' AND ma.status=?'; params.push(status); }
  if (role) {
    if (role === 'bot') {
      where += " AND ma.user_id LIKE 'bot-%'";
    } else {
      where += ' AND u.role=?'; params.push(role);
    }
  }
  if (search) { where += ' AND (ma.address LIKE ? OR ma.display_name LIKE ? OR u.username LIKE ?)'; params.push('%'+search+'%', '%'+search+'%', '%'+search+'%'); }

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM mail_accounts ma LEFT JOIN users u ON ma.user_id=u.id WHERE ${where}`).get(...params) as any).cnt;
  const rows = db.prepare(`SELECT ma.*, u.username, u.role FROM mail_accounts ma LEFT JOIN users u ON ma.user_id=u.id WHERE ${where} ORDER BY ma.created_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as any[];

  res.json({
    accounts: rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      address: r.address,
      displayName: r.display_name,
      provider: r.provider,
      status: r.status,
      username: r.username || '',
      userRole: r.username ? (r.role || 'member') : 'bot',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    page, pageSize, total,
  });
});

router.patch('/accounts/:id/status', (req: AuthRequest, res) => {
  const { status } = req.body;
  if (!['active', 'pending', 'disabled'].includes(status)) {
    res.status(400).json({ error: '无效状态' }); return;
  }
  const account = db.prepare('SELECT * FROM mail_accounts WHERE id=?').get(req.params.id) as any;
  if (!account) { res.status(404).json({ error: '账号不存在' }); return; }
  db.prepare('UPDATE mail_accounts SET status=?, updated_at=? WHERE id=?').run(status, new Date().toISOString(), req.params.id);
  log(req.userId!, req.userName!, 'update_account_status', 'mail_account', req.params.id, `${account.status} -> ${status}`);
  res.json({ success: true });
});

router.delete('/accounts/:id', (req: AuthRequest, res) => {
  const account = db.prepare('SELECT * FROM mail_accounts WHERE id=?').get(req.params.id) as any;
  if (!account) { res.status(404).json({ error: '账号不存在' }); return; }

  const del = db.transaction(() => {
    const messages = db.prepare('SELECT id FROM mail_messages WHERE account_id=? OR owner_user_id=?').all(account.id, account.user_id) as any[];
    for (const m of messages) {
      const atts = db.prepare("SELECT file_path FROM attachments WHERE entity_type='mail_message' AND entity_id=?").all(m.id) as any[];
      atts.forEach((a: any) => { try { fs.unlinkSync(a.file_path); } catch {} });
      db.prepare("DELETE FROM attachments WHERE entity_type='mail_message' AND entity_id=?").run(m.id);
    }
    db.prepare('DELETE FROM mail_messages WHERE account_id=? OR owner_user_id=?').run(account.id, account.user_id);
    db.prepare('DELETE FROM mail_accounts WHERE id=?').run(req.params.id);

    // If this account belongs to a bot, cascade delete bot records too
    const bot = db.prepare('SELECT * FROM mail_bots WHERE username=?').get(account.address.split('@')[0]) as any;
    if (bot) {
      const ruleIds = db.prepare('SELECT id FROM mail_bot_rules WHERE bot_id=?').all(bot.id) as any[];
      for (const r of ruleIds) {
        db.prepare('DELETE FROM mail_bot_rule_prerequisites WHERE rule_id=? OR prerequisite_rule_id=?').run(r.id, r.id);
      }
      db.prepare('DELETE FROM mail_bot_submissions WHERE bot_id=?').run(bot.id);
      db.prepare('DELETE FROM mail_bot_rules WHERE bot_id=?').run(bot.id);
      db.prepare('DELETE FROM mail_bots WHERE id=?').run(bot.id);
    }
  });
  del();
  log(req.userId!, req.userName!, 'delete_account', 'mail_account', req.params.id, `删除账号 ${account.address}`);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════
// 邮件监控
// ═══════════════════════════════════════════════
router.get('/messages', (req: AuthRequest, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const fromQ = String(req.query.from || '').trim();
  const toQ = String(req.query.to || '').trim();
  const subjectQ = String(req.query.subject || '').trim();
  const offset = (page - 1) * pageSize;

  let where = 'deleted_at IS NULL';
  const params: any[] = [];
  if (fromQ) { where += ' AND from_address LIKE ?'; params.push('%' + fromQ + '%'); }
  if (toQ) { where += ' AND to_addresses LIKE ?'; params.push('%' + toQ + '%'); }
  if (subjectQ) { where += ' AND subject LIKE ?'; params.push('%' + subjectQ + '%'); }

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM mail_messages WHERE ${where}`).get(...params) as any).cnt;
  const rows = db.prepare(`SELECT * FROM mail_messages WHERE ${where} ORDER BY received_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as any[];

  res.json({
    messages: rows.map((r: any) => ({
      id: r.id,
      from: { address: r.from_address, name: r.from_name || '' },
      to: JSON.parse(r.to_addresses || '[]'),
      subject: r.subject,
      folder: r.folder,
      isRead: r.is_read,
      hasAttachments: r.has_attachments,
      receivedAt: r.received_at,
      bodyText: (r.body_text || '').slice(0, 200),
    })),
    page, pageSize, total,
  });
});

router.get('/messages/:id', (req: AuthRequest, res) => {
  const row = db.prepare('SELECT * FROM mail_messages WHERE id=?').get(req.params.id) as any;
  if (!row) { res.status(404).json({ error: '邮件不存在' }); return; }
  const atts = db.prepare("SELECT * FROM attachments WHERE entity_type='mail_message' AND entity_id=?").all(req.params.id) as any[];
  res.json({
    ...row,
    id: row.id,
    from: { address: row.from_address, name: row.from_name || '' },
    to: JSON.parse(row.to_addresses || '[]'),
    cc: JSON.parse(row.cc_addresses || '[]'),
    bcc: JSON.parse(row.bcc_addresses || '[]'),
    isRead: row.is_read,
    isStarred: row.is_starred,
    hasAttachments: row.has_attachments,
    attachments: atts.map((a: any) => ({ id: a.id, name: a.name, size: a.size, type: a.mime_type, dataUrl: `/api/mail/messages/${req.params.id}/attachments/${a.id}/download` })),
    sentAt: row.sent_at,
    receivedAt: row.received_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerUserId: row.owner_user_id,
    accountId: row.account_id,
    threadId: row.thread_id,
  });
});

router.delete('/messages/:id', (req: AuthRequest, res) => {
  const row = db.prepare('SELECT * FROM mail_messages WHERE id=?').get(req.params.id) as any;
  if (!row) { res.status(404).json({ error: '邮件不存在' }); return; }
  const atts = db.prepare("SELECT file_path FROM attachments WHERE entity_type='mail_message' AND entity_id=?").all(req.params.id) as any[];
  atts.forEach((a: any) => { try { fs.unlinkSync(a.file_path); } catch {} });
  db.prepare("DELETE FROM attachments WHERE entity_type='mail_message' AND entity_id=?").run(req.params.id);
  db.prepare('DELETE FROM mail_messages WHERE id=?').run(req.params.id);
  log(req.userId!, req.userName!, 'force_delete_message', 'mail_message', req.params.id, `强制删除邮件: ${(row.subject || '').slice(0, 50)}`);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════
// 群发通知
// ═══════════════════════════════════════════════
router.post('/broadcast', (req: AuthRequest, res) => {
  try {
    const { subject, bodyHtml, recipientType, recipientIds } = req.body;
    if (!subject || !bodyHtml) { res.status(400).json({ error: '主题和正文不能为空' }); return; }

    let recipients: any[];
    if (recipientType === 'all') {
      recipients = db.prepare("SELECT id, username FROM users WHERE status='active'").all() as any[];
    } else if (recipientType === 'role' && req.body.role) {
      recipients = db.prepare("SELECT id, username FROM users WHERE role=? AND status='active'").all(req.body.role) as any[];
    } else if (recipientType === 'selected' && recipientIds?.length) {
      const placeholders = recipientIds.map(() => '?').join(',');
      recipients = db.prepare(`SELECT id, username FROM users WHERE id IN (${placeholders}) AND status='active'`).all(...recipientIds) as any[];
    } else {
      res.status(400).json({ error: '请选择收件人' }); return;
    }

    const adminAccount = db.prepare("SELECT ma.* FROM mail_accounts ma JOIN users u ON ma.user_id=u.id WHERE u.role='admin' AND ma.status='active' LIMIT 1").get() as any;
    if (!adminAccount) { res.status(400).json({ error: '管理员账号未开通邮箱' }); return; }

    const now = new Date().toISOString();
    const bodyText = (req.body.bodyText || '').slice(0, 500);
    let sent = 0;

    const insertMsg = db.prepare(`INSERT INTO mail_messages
      (id, owner_user_id, account_id, provider_message_id, thread_id, folder, from_address, from_name, to_addresses, cc_addresses, bcc_addresses, subject, body_html, body_text, is_read, is_starred, has_attachments, sent_at, received_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    for (const user of recipients) {
      const userAccount = db.prepare('SELECT * FROM mail_accounts WHERE user_id=? AND status=?').get(user.id, 'active') as any;
      if (!userAccount) continue;
      const id = 'bcast-' + uuid().slice(0, 12);
      insertMsg.run(
        id, user.id, userAccount.id, '', id, 'inbox',
        adminAccount.address, adminAccount.display_name,
        JSON.stringify([{ address: userAccount.address, name: user.username }]),
        JSON.stringify([]), JSON.stringify([]),
        subject, bodyHtml, bodyText, 0, 0, 0, now, now, now, now
      );
      sent++;
    }

    log(req.userId!, req.userName!, 'broadcast', 'mail_broadcast', '', `群发通知 "${subject.slice(0, 50)}" 给 ${sent} 人`);
    res.json({ success: true, sent, total: recipients.length });
  } catch (err) { sendError(res, err); }
});

// ═══════════════════════════════════════════════
// 审计日志
// ═══════════════════════════════════════════════
router.get('/logs', (req: AuthRequest, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const offset = (page - 1) * pageSize;
  const total = (db.prepare('SELECT COUNT(*) as cnt FROM mail_admin_logs').get() as any).cnt;
  const rows = db.prepare('SELECT * FROM mail_admin_logs ORDER BY created_at DESC LIMIT ? OFFSET ?').all(pageSize, offset) as any[];
  res.json({
    logs: rows.map((r: any) => ({
      id: r.id, adminId: r.admin_id, adminName: r.admin_name,
      action: r.action, targetType: r.target_type, targetId: r.target_id,
      detail: r.detail, createdAt: r.created_at,
    })),
    page, pageSize, total,
  });
});

// ═══════════════════════════════════════════════
// Bot 管理
// ═══════════════════════════════════════════════
router.get('/bots', (_req: AuthRequest, res) => {
  const rows = db.prepare('SELECT * FROM mail_bots ORDER BY created_at DESC').all() as any[];
  res.json(rows.map((r: any) => ({
    id: r.id, username: r.username, domain: r.domain,
    displayName: r.display_name, note: r.note, status: r.status,
    address: r.username + '@' + r.domain,
    createdAt: r.created_at, updatedAt: r.updated_at,
  })));
});

router.post('/bots', (req: AuthRequest, res) => {
  const { username, domain, displayName, note } = req.body;
  if (!username || !domain) { res.status(400).json({ error: '用户名和域名不能为空' }); return; }
  const address = (username + '@' + domain).toLowerCase();
  const existing = getAccountByAddress(address);
  if (existing) { res.status(400).json({ error: '该邮箱地址已被占用' }); return; }
  const now = new Date().toISOString();
  const id = 'bot-' + uuid().slice(0, 8);
  // Create both bot record and mail_account for message delivery
  db.prepare('INSERT INTO mail_bots (id, username, domain, display_name, note, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, username, domain, displayName || username, note || '', 'active', now, now);
  // Also create a mail_account so the bot can receive messages via the mail system
  const mailAcctId = 'mailacct-' + uuid().slice(0, 8);
  db.prepare("INSERT INTO mail_accounts (id, user_id, address, display_name, provider, provider_account_id, credential_ref, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(mailAcctId, 'bot-' + id, address, displayName || username, 'local', mailAcctId, '', 'active', now, now);
  log(req.userId!, req.userName!, 'create_bot', 'mail_bot', id, `创建Bot: ${address}`);
  res.status(201).json({ id, username, domain, displayName: displayName || username, note: note || '', status: 'active', address, createdAt: now, updatedAt: now });
});

router.get('/bots/:id', (req: AuthRequest, res) => {
  const row = db.prepare('SELECT * FROM mail_bots WHERE id=?').get(req.params.id) as any;
  if (!row) { res.status(404).json({ error: 'Bot不存在' }); return; }
  res.json({
    id: row.id, username: row.username, domain: row.domain,
    displayName: row.display_name, note: row.note, status: row.status,
    address: row.username + '@' + row.domain,
    createdAt: row.created_at, updatedAt: row.updated_at,
  });
});

router.patch('/bots/:id', (req: AuthRequest, res) => {
  const bot = db.prepare('SELECT * FROM mail_bots WHERE id=?').get(req.params.id) as any;
  if (!bot) { res.status(404).json({ error: 'Bot不存在' }); return; }
  const { displayName, note, status } = req.body;
  db.prepare('UPDATE mail_bots SET display_name=?, note=?, status=?, updated_at=? WHERE id=?')
    .run(displayName ?? bot.display_name, note ?? bot.note, status ?? bot.status, new Date().toISOString(), req.params.id);
  res.json({ success: true });
});

router.delete('/bots/:id', (req: AuthRequest, res) => {
  const bot = db.prepare('SELECT * FROM mail_bots WHERE id=?').get(req.params.id) as any;
  if (!bot) { res.status(404).json({ error: 'Bot不存在' }); return; }
  const botAddress = (bot.username + '@' + bot.domain).toLowerCase();
  const del = db.transaction(() => {
    // Delete prerequisites for all bot rules
    const ruleIds = db.prepare('SELECT id FROM mail_bot_rules WHERE bot_id=?').all(req.params.id) as any[];
    for (const r of ruleIds) {
      db.prepare('DELETE FROM mail_bot_rule_prerequisites WHERE rule_id=? OR prerequisite_rule_id=?').run(r.id, r.id);
    }
    // Delete submissions, rules, bot record
    db.prepare('DELETE FROM mail_bot_submissions WHERE bot_id=?').run(req.params.id);
    db.prepare('DELETE FROM mail_bot_rules WHERE bot_id=?').run(req.params.id);
    db.prepare('DELETE FROM mail_bots WHERE id=?').run(req.params.id);
    // Delete associated mail account and its messages
    const mailAcct = db.prepare('SELECT * FROM mail_accounts WHERE address=?').get(botAddress) as any;
    if (mailAcct) {
      const msgs = db.prepare('SELECT id FROM mail_messages WHERE account_id=? OR owner_user_id=?').all(mailAcct.id, mailAcct.user_id) as any[];
      for (const m of msgs) {
        const atts = db.prepare("SELECT file_path FROM attachments WHERE entity_type='mail_message' AND entity_id=?").all(m.id) as any[];
        atts.forEach((a: any) => { try { require('fs').unlinkSync(a.file_path); } catch {} });
        db.prepare("DELETE FROM attachments WHERE entity_type='mail_message' AND entity_id=?").run(m.id);
      }
      db.prepare('DELETE FROM mail_messages WHERE account_id=? OR owner_user_id=?').run(mailAcct.id, mailAcct.user_id);
      db.prepare('DELETE FROM mail_accounts WHERE id=?').run(mailAcct.id);
    }
  });
  del();
  log(req.userId!, req.userName!, 'delete_bot', 'mail_bot', req.params.id, `删除Bot: ${botAddress}`);
  res.json({ success: true });
});

// Bot Rules
router.get('/bots/:id/rules', (req: AuthRequest, res) => {
  const rows = db.prepare('SELECT * FROM mail_bot_rules WHERE bot_id=? ORDER BY sort_order ASC, created_at ASC').all(req.params.id) as any[];
  
  const allRuleIds = rows.map((r: any) => r.id);
  let prereqs: any[] = [];
  if (allRuleIds.length > 0) {
    const placeholders = allRuleIds.map(() => '?').join(',');
    prereqs = db.prepare('SELECT * FROM mail_bot_rule_prerequisites WHERE rule_id IN (' + placeholders + ')').all(...allRuleIds) as any[];
  }
  res.json(rows.map((r: any) => ({
      id: r.id, botId: r.bot_id, title: r.title || '',
      triggerKeyword: r.trigger_keyword,
      replySubject: r.reply_subject, replyBody: r.reply_body,
      delaySeconds: r.delay_seconds, sortOrder: r.sort_order,
      prerequisiteIds: prereqs.filter((p: any) => p.rule_id === r.id).map((p: any) => p.prerequisite_rule_id),
      createdAt: r.created_at,
    })));
  });

router.post('/bots/:id/rules', (req: AuthRequest, res) => {
  const bot = db.prepare('SELECT * FROM mail_bots WHERE id=?').get(req.params.id) as any;
  if (!bot) { res.status(404).json({ error: 'Bot不存在' }); return; }
  const { triggerKeyword, replySubject, replyBody, delaySeconds, sortOrder, title } = req.body;
  if (!triggerKeyword) { res.status(400).json({ error: '触发词不能为空' }); return; }
  const id = 'botrule-' + uuid().slice(0, 8);
  db.prepare('INSERT INTO mail_bot_rules (id, bot_id, title, trigger_keyword, reply_subject, reply_body, delay_seconds, sort_order) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, req.params.id, title || '', triggerKeyword, replySubject || '', replyBody || '', delaySeconds || 0, sortOrder || 0);
  log(req.userId!, req.userName!, 'create_bot_rule', 'mail_bot_rule', id, `Bot ${bot.username} 新增规则: "${triggerKeyword}"`);
  res.status(201).json({ id, botId: req.params.id, title: title || '', triggerKeyword, replySubject: replySubject || '', replyBody: replyBody || '', delaySeconds: delaySeconds || 0, sortOrder: sortOrder || 0, prerequisiteIds: [], createdAt: new Date().toISOString() });
});

router.put('/bots/:id/rules/:ruleId', (req: AuthRequest, res) => {
  const rule = db.prepare('SELECT * FROM mail_bot_rules WHERE id=? AND bot_id=?').get(req.params.ruleId, req.params.id) as any;
  if (!rule) { res.status(404).json({ error: '规则不存在' }); return; }
  const { triggerKeyword, replySubject, replyBody, delaySeconds, sortOrder, title } = req.body;
  db.prepare('UPDATE mail_bot_rules SET title=?, trigger_keyword=?, reply_subject=?, reply_body=?, delay_seconds=?, sort_order=? WHERE id=?')
    .run(title ?? rule.title, triggerKeyword ?? rule.trigger_keyword, replySubject ?? rule.reply_subject, replyBody ?? rule.reply_body, delaySeconds ?? rule.delay_seconds, sortOrder ?? rule.sort_order, req.params.ruleId);
  res.json({ success: true });
});

router.delete('/bots/:id/rules/:ruleId', (req: AuthRequest, res) => {
  // Cleanup prerequisites: this rule as prerequisite of others, and its own prerequisites
  db.prepare('DELETE FROM mail_bot_rule_prerequisites WHERE rule_id=? OR prerequisite_rule_id=?').run(req.params.ruleId, req.params.ruleId);
  db.prepare('DELETE FROM mail_bot_submissions WHERE rule_id=?').run(req.params.ruleId);
  db.prepare('DELETE FROM mail_bot_rules WHERE id=? AND bot_id=?').run(req.params.ruleId, req.params.id);
  res.json({ success: true });
});

// Bot Submissions
// Rule Prerequisites
router.put('/bots/:id/rules/:ruleId/prerequisites', (req: AuthRequest, res) => {
  const { prerequisiteIds } = req.body;
  if (!Array.isArray(prerequisiteIds)) { res.status(400).json({ error: 'prerequisiteIds must be array' }); return; }
  const rule = db.prepare('SELECT * FROM mail_bot_rules WHERE id=? AND bot_id=?').get(req.params.ruleId, req.params.id) as any;
  if (!rule) { res.status(404).json({ error: '规则不存在' }); return; }
  db.prepare('DELETE FROM mail_bot_rule_prerequisites WHERE rule_id=?').run(req.params.ruleId);
  const insert = db.prepare('INSERT OR IGNORE INTO mail_bot_rule_prerequisites (id, rule_id, prerequisite_rule_id) VALUES (?,?,?)');
  for (const preId of prerequisiteIds) {
    insert.run('botpre-' + uuid().slice(0, 8), req.params.ruleId, preId);
  }
  res.json({ success: true });
});


// Get single bot
router.get('/bots/:id', (req: AuthRequest, res) => {
  const row = db.prepare('SELECT * FROM mail_bots WHERE id=?').get(req.params.id) as any;
  if (!row) { res.status(404).json({ error: 'Bot不存在' }); return; }
  res.json({
    id: row.id, username: row.username, domain: row.domain,
    displayName: row.display_name, note: row.note, status: row.status,
    address: row.username + '@' + row.domain,
    createdAt: row.created_at, updatedAt: row.updated_at,
  });
});


router.get('/bots/:id/submissions', (req: AuthRequest, res) => {
  const user = String(req.query.user || '');
  if (user) {
    // Get all submissions for a specific user
    const rows = db.prepare('SELECT s.*, r.trigger_keyword, r.reply_subject FROM mail_bot_submissions s LEFT JOIN mail_bot_rules r ON s.rule_id=r.id WHERE s.bot_id=? AND s.from_address=? ORDER BY s.submitted_at ASC').all(req.params.id, user) as any[];
    res.json({
      user,
      submissions: rows.map((r: any) => ({
        id: r.id, botId: r.bot_id, ruleId: r.rule_id,
        fromAddress: r.from_address, triggerKeyword: r.trigger_keyword,
        replySubject: r.reply_subject || '', submittedAt: r.submitted_at,
      })),
    });
  } else {
    // Get summary: one row per user showing last submission
    const rows = db.prepare('SELECT s.from_address, s.rule_id, s.trigger_keyword, s.submitted_at, r.reply_subject, r.trigger_keyword as rule_keyword FROM mail_bot_submissions s LEFT JOIN mail_bot_rules r ON s.rule_id=r.id WHERE s.bot_id=? AND s.id IN (SELECT id FROM mail_bot_submissions WHERE bot_id=? GROUP BY from_address HAVING MAX(submitted_at)) ORDER BY s.submitted_at DESC').all(req.params.id, req.params.id) as any[];
    res.json({
      users: rows.map((r: any) => ({
        fromAddress: r.from_address,
        lastRuleId: r.rule_id,
        lastTriggerKeyword: r.trigger_keyword || r.rule_keyword || '',
        lastReplySubject: r.reply_subject || '',
        lastSubmittedAt: r.submitted_at,
      })),
    });
  }
});

// List all users (for broadcast recipient selection)
router.get('/users', (_req: AuthRequest, res) => {
  const rows = db.prepare('SELECT id, username, role FROM users WHERE status=? ORDER BY role, username').all('active') as any[];
  res.json(rows);
});

export default router;
