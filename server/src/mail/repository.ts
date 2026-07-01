import { db } from '../db.js';
import type { MailAccount, MailAddress, MailAttachment, MailFolder, MailMessage } from './types.js';

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function mapAccount(row: any): MailAccount {
  return {
    id: row.id,
    userId: row.user_id,
    address: row.address,
    displayName: row.display_name || '',
    provider: row.provider,
    providerAccountId: row.provider_account_id || '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAttachments(messageId: string): MailAttachment[] {
  return (db.prepare('SELECT * FROM attachments WHERE entity_type=? AND entity_id=? ORDER BY uploaded_at ASC').all('mail_message', messageId) as any[])
    .map(a => ({
      id: a.id,
      name: a.name,
      size: a.size,
      type: a.mime_type,
      dataUrl: `/api/mail/messages/${messageId}/attachments/${a.id}/download`,
      uploadedAt: a.uploaded_at,
    }));
}

export function mapMessage(row: any): MailMessage {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    accountId: row.account_id,
    providerMessageId: row.provider_message_id || '',
    threadId: row.thread_id || row.id,
    folder: row.folder,
    from: { address: row.from_address, name: row.from_name || '' },
    to: parseJson<MailAddress[]>(row.to_addresses, []),
    cc: parseJson<MailAddress[]>(row.cc_addresses, []),
    bcc: parseJson<MailAddress[]>(row.bcc_addresses, []),
    subject: row.subject || '',
    bodyHtml: row.body_html || '',
    bodyText: row.body_text || '',
    isRead: row.is_read,
    isStarred: row.is_starred,
    hasAttachments: row.has_attachments,
    attachments: getAttachments(row.id),
    sentAt: row.sent_at,
    receivedAt: row.received_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAccountByUserId(userId: string): MailAccount | null {
  const row = db.prepare('SELECT * FROM mail_accounts WHERE user_id=?').get(userId) as any;
  return row ? mapAccount(row) : null;
}

export function getAccountByAddress(address: string): MailAccount | null {
  const row = db.prepare('SELECT * FROM mail_accounts WHERE address=?').get(address.toLowerCase()) as any;
  return row ? mapAccount(row) : null;
}

export function getMessageForUser(userId: string, messageId: string): MailMessage | null {
  const row = db.prepare('SELECT * FROM mail_messages WHERE owner_user_id=? AND id=? AND deleted_at IS NULL').get(userId, messageId) as any;
  return row ? mapMessage(row) : null;
}

export function listMessages(userId: string, folder: MailFolder, query: string, page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  const like = `%${query}%`;
  const where = query
    ? 'owner_user_id=? AND folder=? AND deleted_at IS NULL AND (subject LIKE ? OR body_text LIKE ? OR from_address LIKE ?)'
    : 'owner_user_id=? AND folder=? AND deleted_at IS NULL';
  const params = query ? [userId, folder, like, like, like] : [userId, folder];
  const total = (db.prepare(`SELECT COUNT(*) as count FROM mail_messages WHERE ${where}`).get(...params) as { count: number }).count;
  const rows = db.prepare(`SELECT * FROM mail_messages WHERE ${where} ORDER BY is_read ASC, received_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as any[];
  return { total, messages: rows.map(mapMessage) };
}

export function unreadCounts(userId: string) {
  const rows = db.prepare('SELECT folder, COUNT(*) as count FROM mail_messages WHERE owner_user_id=? AND is_read=0 AND deleted_at IS NULL GROUP BY folder').all(userId) as any[];
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.folder] = row.count;
    return acc;
  }, {});
}
