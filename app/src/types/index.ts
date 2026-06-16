export interface User {
  id: string;
  username: string;
  password: string;
  qqNumber: string;
  role: 'admin' | 'member';
  avatar?: string;
  createdAt: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string; // base64 encoded data URL
  uploadedAt: string;
}

export interface DecryptRecord {
  id: string;
  title: string;
  content: string; // HTML rich text
  summary: string;
  date: string;
  tags: string[];
  author: string;
  authorId: string;
  importance: 'normal' | 'important' | 'critical';
  images: string[];
  attachments: FileAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Puzzle {
  id: string;
  title: string;
  description: string;
  content: string; // HTML rich text
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
  tags: string[];
  attachments: FileAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface WikiEntry {
  id: string;
  title: string;
  content: string; // HTML rich text
  category: string;
  subcategory?: string;
  tags: string[];
  author: string;
  authorId: string;
  attachments: FileAttachment[];
  lastUpdated: string;
  createdAt: string;
}

export interface AuthState {
  user: Omit<User, 'password'> | null;
  token: string | null;
  isAuthenticated: boolean;
}
