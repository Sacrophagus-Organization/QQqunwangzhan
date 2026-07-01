import { v4 as uuid } from 'uuid';
import { db } from '../../db.js';
import { buildAddress } from '../address.js';
import { getAccountByAddress, mapAccount } from '../repository.js';
import type { MailProvider } from './MailProvider.js';
import type { CreateMailAccountInput, MailAccount, MailFolder, MailMessage, SendMailInput } from '../types.js';

export class LocalMailProvider implements MailProvider {
  readonly name = 'local';

  async createAccount(input: CreateMailAccountInput): Promise<MailAccount> {
    const address = (input.requestedAddress || buildAddress(input.username)).toLowerCase();
    const existing = getAccountByAddress(address);
    if (existing) throw new Error('邮箱地址已存在');

    const now = new Date().toISOString();
    const id = 'mailacct-' + uuid().slice(0, 8);
    db.prepare(`INSERT INTO mail_accounts
      (id, user_id, address, display_name, provider, provider_account_id, credential_ref, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, input.userId, address, input.displayName || input.username, this.name, id, '', 'active', now, now);

    const row = db.prepare('SELECT * FROM mail_accounts WHERE id=?').get(id) as any;
    return mapAccount(row);
  }

  async sendMail(_input: SendMailInput): Promise<{ providerMessageId: string }> {
    return { providerMessageId: 'local-' + uuid() };
  }

  async syncFolder(_account: MailAccount, _folder: MailFolder): Promise<MailMessage[]> {
    return [];
  }

  async markRead(): Promise<void> {}
  async deleteMessage(): Promise<void> {}
  async moveMessage(): Promise<void> {}
}
