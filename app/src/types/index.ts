export interface User {
  id: string;
  username: string;
  password: string;
  qqNumber: string;
  role: 'admin' | 'editor' | 'member';
  avatar?: string;
  createdAt: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  uploadedAt: string;
}

export interface DecryptRecord {
  id: string;
  title: string;
  content: string;
  summary: string;
  date: string;
  tags: string[];
  author: string;
  authorId: string;
  importance: 'normal' | 'important' | 'critical';
  pinned: number;
  sortOrder: number;
  images: string[];
  attachments: FileAttachment[];
  likeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Puzzle {
  id: string;
  title: string;
  description: string;
  content: string;
  category: 'cipher' | 'logic' | 'pattern' | 'math' | 'lore' | 'other';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  hint: string;
  solution: string;
  status: 'unsolved' | 'solved';
  author: string;
  authorId: string;
  solvedBy?: string;
  solvedById?: string;
  solvedAt?: string;
  attempts: number;
  pinned: number;
  sortOrder: number;
  tags: string[];
  attachments: FileAttachment[];
  likeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  content: string;
  isAnonymous: number; // 0=公开, 1=匿名
  author: string;
  authorId: string;
  authorAvatar?: string;
  likeCount?: number;
  commentCount?: number;
  pinned: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  entityType: string;
  entityId: string;
  parentId: string | null;
  content: string;
  isAnonymous: number;
  author: string;
  authorId: string;
  authorAvatar?: string;
  likeCount?: number;
  createdAt: string;
}

export interface WikiEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  author: string;
  authorId: string;
  pinned: number;
  sortOrder: number;
  attachments: FileAttachment[];
  likeCount?: number;
  lastUpdated: string;
  createdAt: string;
}

export interface SarcophagusCode {
  id: string;
  code: string;
  file_name: string;
  file_path: string;
  download_token?: string;
  token_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: Omit<User, 'password'> | null;
  token: string | null;
  isAuthenticated: boolean;
}

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
  attachments: FileAttachment[];
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

export interface MailFolderInfo {
  folder: MailFolder;
  unread: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PageAccessConfig {
  id: string;
  route_path: string;
  route_name: string;
  access_level: 'public' | 'member' | 'admin';
  is_enabled: number;
  description: string;
  updated_at: string;
}
