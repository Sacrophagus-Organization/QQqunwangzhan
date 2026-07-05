import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { parseAddresses, stripHtml } from './address.js';
import { getMailProvider } from './providerFactory.js';
import { getAccountByAddress, getAccountByUserId, getMessageForUser, listMessages, mapMessage, unreadCounts } from './repository.js';
import type { CreateMailAccountInput, MailFolder, MailListResult, MailMessage, SendMailInput } from './types.js';

const folders: MailFolder[] = ['inbox', 'sent', 'drafts', 'spam', 'trash', 'deleted'];

function assertFolder(folder: string): MailFolder {
  if (!folders.includes(folder as MailFolder)) throw new Error('未知邮箱文件夹');
  return folder as MailFolder;
}

function saveAttachments(messageId: string, files: Express.Multer.File[] = []) {
  const insert = db.prepare('INSERT INTO attachments (id, entity_type, entity_id, name, size, mime_type, file_path) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const file of files) {
    const id = 'mailfile-' + uuid().slice(0, 8);
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8');
    insert.run(id, 'mail_message', messageId, name, file.size, file.mimetype, file.path);
  }
}

function uniqueRecipients(recipients: ReturnType<typeof parseAddresses>) {
  const seen = new Set<string>();
  return recipients.filter(recipient => {
    if (seen.has(recipient.address)) return false;
    seen.add(recipient.address);
    return true;
  });
}

export class MailService {
  async getAccount(userId: string) {
    return getAccountByUserId(userId);
  }

  async createAccount(input: CreateMailAccountInput) {
    const existing = getAccountByUserId(input.userId);
    if (existing) return existing;
    return getMailProvider().createAccount(input);
  }

  getFolders(userId: string) {
    const unread = unreadCounts(userId);
    return folders.map(folder => ({ folder, unread: unread[folder] || 0 }));
  }

  listMessages(options: { userId: string; folder?: string; query?: string; page?: number; pageSize?: number }): MailListResult {
    const folder = assertFolder(options.folder || 'inbox');
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
    const { total, messages } = listMessages(options.userId, folder, options.query?.trim() || '', page, pageSize);
    return { messages, page, pageSize, total };
  }

  getMessage(userId: string, id: string): MailMessage {
    const message = getMessageForUser(userId, id);
    if (!message) throw new Error('邮件不存在');
    if (!message.isRead) this.markRead(userId, id, true);
    return getMessageForUser(userId, id) || message;
  }

  async sendMessage(userId: string, payload: any, files: Express.Multer.File[] = [], draft = false): Promise<MailMessage> {
    const account = getAccountByUserId(userId);
    if (!account) throw new Error('请先申请企业邮箱');

    const to = parseAddresses(payload.to);
    const cc = parseAddresses(payload.cc);
    const bcc = parseAddresses(payload.bcc);
    if (!draft && to.length === 0) throw new Error('请填写收件人');
    if (!draft) this.assertLocalRecipients([...to, ...cc, ...bcc]);

    const bodyHtml = payload.bodyHtml || payload.body || '';
    const bodyText = payload.bodyText || stripHtml(bodyHtml);
    const subject = (payload.subject || '').trim() || '(无主题)';
    const now = new Date().toISOString();
    const id = 'mail-' + uuid().slice(0, 12);
    const threadId = payload.threadId || id;
    const folder: MailFolder = draft ? 'drafts' : 'sent';
    const providerInput: SendMailInput = { account, to, cc, bcc, subject, bodyHtml, bodyText, attachments: files };
    const providerResult = draft ? { providerMessageId: '' } : await getMailProvider().sendMail(providerInput);

    db.prepare(`INSERT INTO mail_messages
      (id, owner_user_id, account_id, provider_message_id, thread_id, folder, from_address, from_name, to_addresses, cc_addresses, bcc_addresses, subject, body_html, body_text, is_read, is_starred, has_attachments, sent_at, received_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, userId, account.id, providerResult.providerMessageId, threadId, folder, account.address, account.displayName,
        JSON.stringify(to), JSON.stringify(cc), JSON.stringify(bcc), subject, bodyHtml, bodyText, 1, 0,
        files.length > 0 ? 1 : 0, now, now, now, now);
    saveAttachments(id, files);

    if (!draft) this.deliverLocalCopies(account, { to, cc, bcc, subject, bodyHtml, bodyText, files, threadId, now });
    const row = db.prepare('SELECT * FROM mail_messages WHERE id=?').get(id) as any;
    return mapMessage(row);
  }

  private assertLocalRecipients(recipients: ReturnType<typeof parseAddresses>) {
    const missing = uniqueRecipients(recipients)
      .filter(recipient => {
        if (getAccountByAddress(recipient.address)) return false;
        // Also check bot table
        const localPart = recipient.address.split('@')[0];
        const bot = db.prepare('SELECT id FROM mail_bots WHERE username=? AND status=?').get(localPart, 'active');
        return !bot;
      })
      .map(recipient => recipient.address);
    if (missing.length > 0) {
      throw new Error(`只能发送给已开通的站内邮箱：${missing.join(', ')}`);
    }
  }

  private deliverLocalCopies(sender: { address: string; displayName: string }, payload: {
    to: ReturnType<typeof parseAddresses>;
    cc: ReturnType<typeof parseAddresses>;
    bcc: ReturnType<typeof parseAddresses>;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    files: Express.Multer.File[];
    threadId: string;
    now: string;
  }) {
    const recipients = uniqueRecipients([...payload.to, ...payload.cc, ...payload.bcc]);
    for (const recipient of recipients) {
      const account = getAccountByAddress(recipient.address);
      if (!account) continue;
      const id = 'mail-' + uuid().slice(0, 12);
      db.prepare(`INSERT INTO mail_messages
        (id, owner_user_id, account_id, provider_message_id, thread_id, folder, from_address, from_name, to_addresses, cc_addresses, bcc_addresses, subject, body_html, body_text, is_read, is_starred, has_attachments, sent_at, received_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, account.userId, account.id, '', payload.threadId, 'inbox', sender.address, sender.displayName,
          JSON.stringify(payload.to), JSON.stringify(payload.cc), JSON.stringify([]), payload.subject,
          payload.bodyHtml, payload.bodyText, 0, 0, payload.files.length > 0 ? 1 : 0,
          payload.now, payload.now, payload.now, payload.now);
      saveAttachments(id, payload.files);
      this.processBotReply(recipient.address, id, sender, payload.subject, payload.bodyText, recipient);
    }
  }

  async saveDraft(userId: string, payload: any, files: Express.Multer.File[] = []) {
    return this.sendMessage(userId, payload, files, true);
  }

  markRead(userId: string, id: string, read: boolean) {
    const message = getMessageForUser(userId, id);
    if (!message) throw new Error('邮件不存在');
    db.prepare('UPDATE mail_messages SET is_read=?, updated_at=? WHERE owner_user_id=? AND id=?')
      .run(read ? 1 : 0, new Date().toISOString(), userId, id);
    return { success: true };
  }

  star(userId: string, id: string, starred: boolean) {
    const message = getMessageForUser(userId, id);
    if (!message) throw new Error('邮件不存在');
    db.prepare('UPDATE mail_messages SET is_starred=?, updated_at=? WHERE owner_user_id=? AND id=?')
      .run(starred ? 1 : 0, new Date().toISOString(), userId, id);
    return { success: true };
  }

  move(userId: string, id: string, folder: string) {
    const target = assertFolder(folder);
    const message = getMessageForUser(userId, id);
    if (!message) throw new Error('邮件不存在');
    db.prepare('UPDATE mail_messages SET folder=?, updated_at=? WHERE owner_user_id=? AND id=?')
      .run(target, new Date().toISOString(), userId, id);
    return { success: true };
  }

  delete(userId: string, id: string) {
    const message = getMessageForUser(userId, id);
    if (!message) throw new Error('邮件不存在');
    const now = new Date().toISOString();
    if (message.folder === 'deleted') {
      const atts = db.prepare('SELECT * FROM attachments WHERE entity_type=? AND entity_id=?').all('mail_message', id) as any[];
      for (const att of atts) { try { fs.unlinkSync(att.file_path); } catch {} }
      db.prepare('DELETE FROM attachments WHERE entity_type=? AND entity_id=?').run('mail_message', id);
      db.prepare('UPDATE mail_messages SET deleted_at=?, updated_at=? WHERE owner_user_id=? AND id=?').run(now, now, userId, id);
      return { success: true };
    }
    db.prepare('UPDATE mail_messages SET folder=?, updated_at=? WHERE owner_user_id=? AND id=?').run('deleted', now, userId, id);
    return { success: true };
  }

  private processBotReply(recipientAddress: string, messageId: string, sender: { address: string; displayName: string }, subject: string, bodyText: string, recipient: { address: string }) {
    const bot = db.prepare('SELECT * FROM mail_bots WHERE username=?').get(recipientAddress.split('@')[0]) as any;
    if (!bot || bot.status !== 'active') return;

    const rules = db.prepare('SELECT * FROM mail_bot_rules WHERE bot_id=? ORDER BY sort_order ASC').all(bot.id) as any[];
    for (const rule of rules) {
      const keyword = rule.trigger_keyword.trim();
      if (!keyword) continue;
      if (!bodyText.toLowerCase().includes(keyword.toLowerCase())) continue;

      // Check prerequisites: all prerequisite rules must have been triggered by this sender
      const prereqs = db.prepare('SELECT prerequisite_rule_id FROM mail_bot_rule_prerequisites WHERE rule_id=?').all(rule.id) as any[];
      let allPrereqsMet = true;
      for (const pre of prereqs) {
        const subExists = db.prepare('SELECT COUNT(*) as cnt FROM mail_bot_submissions WHERE bot_id=? AND rule_id=? AND from_address=?').get(bot.id, pre.prerequisite_rule_id, sender.address) as any;
        if (!subExists || subExists.cnt === 0) { allPrereqsMet = false; break; }
      }
      if (!allPrereqsMet) continue; // Skip if prerequisites not met

      // Record submission
      const subId = 'botsub-' + uuid().slice(0, 8);
      db.prepare('INSERT INTO mail_bot_submissions (id, bot_id, rule_id, from_address, trigger_keyword, submitted_at) VALUES (?,?,?,?,?,?)')
        .run(subId, bot.id, rule.id, sender.address, keyword, new Date().toISOString());

      // Auto-reply after delay
      const delayMs = (rule.delay_seconds || 0) * 1000;
      const botAddress = bot.username + '@' + bot.domain;
      const botDisplayName = bot.display_name || bot.username;
      const replySubject = rule.reply_subject || ('Re: ' + subject);
      const replyBody = rule.reply_body || '';

      if (delayMs > 0) {
        setTimeout(() => {
          this.deliverBotReply(bot, botAddress, botDisplayName, sender.address, replySubject, replyBody);
        }, delayMs);
      } else {
        this.deliverBotReply(bot, botAddress, botDisplayName, sender.address, replySubject, replyBody);
      }
      break; // Only match first rule with met prerequisites
    }
  }

  private deliverBotReply(bot: any, botAddress: string, botDisplayName: string, toAddress: string, subject: string, bodyHtml: string) {
    const now = new Date().toISOString();
    const replyId = 'botreply-' + uuid().slice(0, 12);
    // Find recipient account
    const recipientAcct = db.prepare('SELECT * FROM mail_accounts WHERE address=? AND status=?').get(toAddress, 'active') as any;
    if (!recipientAcct) return;

    db.prepare(`INSERT INTO mail_messages
      (id, owner_user_id, account_id, provider_message_id, thread_id, folder, from_address, from_name, to_addresses, cc_addresses, bcc_addresses, subject, body_html, body_text, is_read, is_starred, has_attachments, sent_at, received_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(replyId, recipientAcct.user_id, recipientAcct.id, '', replyId, 'inbox',
        botAddress, botDisplayName,
        JSON.stringify([{ address: toAddress, name: '' }]),
        JSON.stringify([]), JSON.stringify([]),
        subject, bodyHtml, bodyHtml, 0, 0, 0,
        now, now, now, now);
  }
}

export const mailService = new MailService();
