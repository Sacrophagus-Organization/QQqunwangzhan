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
