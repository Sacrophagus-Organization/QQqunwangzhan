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

// ═══ 邮箱管理/Bot 模块 ═══
export interface MailAdminAccount { id: string; address: string; displayName: string; username?: string; userRole?: string; status: string; userId: string; createdAt: string; }
export interface MailAdminLog { id: string; action: string; detail: string; adminName?: string; createdAt: string; }
export interface MailAdminMessage { id: string; subject: string; from: { address: string; name?: string }; to: { address: string; name?: string }[]; isRead?: number; receivedAt: string; createdAt: string; }
export interface MailAdminStats { totalAccounts: number; activeAccounts: number; pendingAccounts?: number; totalMessages: number; todayReceived?: number; bots?: number; botCount?: number; }

export interface MailBot {
  id: string;
  username: string;
  displayName?: string;
  address: string;
  note?: string;
  status: 'active' | 'stopped';
  createdAt: string;
}

// ═══════════════════════════════════════
//  剧情模块类型定义
// ═══════════════════════════════════════

export interface Story {
  id: string;
  title: string;
  description: string;
  cover?: string;
  author: string;
  authorId: string;
  bgm?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface StoryScene {
  id: string;
  storyId: string;
  name: string;
  background?: string;
  bgm?: string;
  bgmVolume?: number;
  order: number;
  transition: 'fade' | 'slide' | 'none';
}

export type StorySpeaker = 'left' | 'right' | 'narrator';
export type StoryEffect = 'shake' | 'fadein' | 'zoom' | 'flash' | 'none';

export interface StoryLine {
  id: string;
  storyId: string;
  sceneId: string;
  speaker: StorySpeaker;
  characterName: string;
  text: string;
  leftImage?: string;
  rightImage?: string;
  effect?: StoryEffect;
  sfx?: string;
  order: number;
}

export interface StoryCharacter {
  id: string;
  storyId: string;
  name: string;
  defaultSprite?: string;
  nameTagColor?: string;
  sprites: Record<string, string>; // { expressionKey: imageUrl }
}

export interface StoryChoice {
  id: string;
  storyId: string;
  lineId: string;
  text: string;
  targetLineOrder: number;
}

export interface StoryProgress {
  id: string;
  userId: string;
  storyId: string;
  sceneIndex: number;
  lineIndex: number;
  updatedAt: string;
}

/** 播放器用——一次加载全部数据 */
export interface StoryPlayData {
  story: Story;
  characters: StoryCharacter[];
  scenes: StoryScene[];
  lines: StoryLine[];
  choices: StoryChoice[];
}

export type PlayerPhase = 'loading' | 'idle' | 'typing' | 'waiting' | 'choosing' | 'ending';
