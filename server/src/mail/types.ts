export type MailFolder = 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'deleted';

export interface MailAddress {
  address: string;
  name?: string;
}

export interface MailAccount {
  id: string;
  userId: string;
  address: string;
  displayName: string;
  provider: string;
  providerAccountId: string;
  status: 'active' | 'pending' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface MailAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  uploadedAt: string;
}

export interface MailMessage {
  id: string;
  ownerUserId: string;
  accountId: string;
  providerMessageId: string;
  threadId: string;
  folder: MailFolder;
  from: MailAddress;
  to: MailAddress[];
  cc: MailAddress[];
  bcc: MailAddress[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  isRead: number;
  isStarred: number;
  hasAttachments: number;
  attachments: MailAttachment[];
  sentAt: string;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MailListResult {
  messages: MailMessage[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CreateMailAccountInput {
  userId: string;
  username: string;
  displayName?: string;
  requestedAddress?: string;
}

export interface SendMailInput {
  account: MailAccount;
  to: MailAddress[];
  cc?: MailAddress[];
  bcc?: MailAddress[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  attachments?: Express.Multer.File[];
}

export interface MailSearchOptions {
  userId: string;
  folder?: MailFolder;
  query?: string;
  page?: number;
  pageSize?: number;
}
