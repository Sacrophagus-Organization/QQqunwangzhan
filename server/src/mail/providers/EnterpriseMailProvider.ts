import { v4 as uuid } from 'uuid';
import { db } from '../../db.js';
import { buildAddress } from '../address.js';
import { getAccountByAddress, mapAccount } from '../repository.js';
import type { MailProvider } from './MailProvider.js';
import type { CreateMailAccountInput, MailAccount, MailFolder, MailMessage, SendMailInput } from '../types.js';

/**
 * Provider shell for real enterprise mailbox vendors.
 *
 * Account provisioning uses MAIL_ADMIN_API_URL and MAIL_ADMIN_API_TOKEN when
 * available. SMTP/IMAP credentials must stay in the provider or secret manager;
 * this app stores only credential_ref.
 */
export class EnterpriseMailProvider implements MailProvider {
  readonly name = process.env.MAIL_PROVIDER || 'enterprise';

  async createAccount(input: CreateMailAccountInput): Promise<MailAccount> {
    const address = (input.requestedAddress || buildAddress(input.username)).toLowerCase();
    const existing = getAccountByAddress(address);
    if (existing) throw new Error('邮箱地址已存在');

    let providerAccountId = '';
    let credentialRef = '';
    let status: 'active' | 'pending' = 'pending';

    if (process.env.MAIL_ADMIN_API_URL && process.env.MAIL_ADMIN_API_TOKEN) {
      const res = await fetch(process.env.MAIL_ADMIN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.MAIL_ADMIN_API_TOKEN}`,
        },
        body: JSON.stringify({
          address,
          displayName: input.displayName || input.username,
          userId: input.userId,
        }),
      });
      if (!res.ok) throw new Error(`企业邮箱服务商创建账号失败: ${res.status}`);
      const data = await res.json().catch(() => ({}));
      providerAccountId = data.id || data.accountId || address;
      credentialRef = data.credentialRef || '';
      status = data.status === 'pending' ? 'pending' : 'active';
    }

    const now = new Date().toISOString();
    const id = 'mailacct-' + uuid().slice(0, 8);
    db.prepare(`INSERT INTO mail_accounts
      (id, user_id, address, display_name, provider, provider_account_id, credential_ref, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, input.userId, address, input.displayName || input.username, this.name, providerAccountId, credentialRef, status, now, now);

    const row = db.prepare('SELECT * FROM mail_accounts WHERE id=?').get(id) as any;
    return mapAccount(row);
  }

  async sendMail(_input: SendMailInput): Promise<{ providerMessageId: string }> {
    if (!process.env.MAIL_SMTP_HOST) {
      throw new Error('SMTP 未配置，请设置 MAIL_SMTP_HOST/MAIL_SMTP_PORT/MAIL_SMTP_USER/MAIL_SMTP_PASSWORD');
    }
    // Keep the provider boundary explicit. Add nodemailer or vendor SDK here.
    return { providerMessageId: 'smtp-' + uuid() };
  }

  async syncFolder(_account: MailAccount, _folder: MailFolder): Promise<MailMessage[]> {
    if (!process.env.MAIL_IMAP_HOST) {
      throw new Error('IMAP 未配置，请设置 MAIL_IMAP_HOST/MAIL_IMAP_PORT/MAIL_IMAP_USER/MAIL_IMAP_PASSWORD');
    }
    // Add imapflow/mailparser or vendor SDK here.
    return [];
  }

  async markRead(): Promise<void> {}
  async deleteMessage(): Promise<void> {}
  async moveMessage(): Promise<void> {}
}
