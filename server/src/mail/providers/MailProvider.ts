import type { CreateMailAccountInput, MailAccount, MailFolder, MailMessage, SendMailInput } from '../types.js';

export interface MailProvider {
  readonly name: string;
  createAccount(input: CreateMailAccountInput): Promise<MailAccount>;
  sendMail(input: SendMailInput): Promise<{ providerMessageId: string }>;
  syncFolder(account: MailAccount, folder: MailFolder): Promise<MailMessage[]>;
  markRead(account: MailAccount, message: MailMessage, read: boolean): Promise<void>;
  deleteMessage(account: MailAccount, message: MailMessage): Promise<void>;
  moveMessage(account: MailAccount, message: MailMessage, folder: MailFolder): Promise<void>;
}
