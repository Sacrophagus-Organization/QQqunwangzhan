import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 定期清理过期的上传文件和旧的 SQLite WAL 文件
 * 防止 40G 系统盘被占满
 *
 * ⚠️ 2026-08-23 修复：原实现按 mtime 无差别删除 30 天前的上传文件，
 * 导致仍被数据库引用的头像/评论图片/附件被误删（8/6-8/7 事故）。
 * 现在改为「引用感知」清理：先扫描数据库全部引用，只删除
 * 【未被任何记录引用】且超期的孤儿文件，用户内容永不清除。
 */

// 孤儿文件过期天数（未被数据库引用且超过该天数才删除）
const FILE_MAX_AGE_DAYS = 30;
// WAL 文件最大大小 (MB)，超过则 checkpoint 并删除
const WAL_MAX_SIZE_MB = 50;
// 清理间隔 (12小时)
const CLEANUP_INTERVAL_MS = 12 * 60 * 60 * 1000;

const uploadDirs = [
  path.join(__dirname, '..', '..', 'uploads', 'images'),
  path.join(__dirname, '..', '..', 'uploads', 'avatars'),
  path.join(__dirname, '..', '..', 'uploads'), // 根目录附件
];

/** 从 HTML/Markdown 文本中提取 /api/images/<filename> 的文件名列表 */
function extractImageFiles(text: string | null | undefined): string[] {
  if (!text || typeof text !== 'string') return [];
  // jpeg 必须放在 jpg 前面，否则 "image.jpeg" 会被匹配为 "image.jpg"
  const regex = /\/api\/images\/([\w.\-]+\.(?:jpeg|jpg|png|gif|webp|bmp))/gi;
  const files: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    files.push(match[1]);
  }
  return files;
}

/**
 * 扫描数据库中仍被引用的上传文件名（含 /api/images/ 的正文、头像、附件、石棺 codes）。
 * 返回的集合内的文件是「用户内容」，永不清除。
 */
function getReferencedFiles(): Set<string> {
  const refs = new Set<string>();

  // 正文/富文本字段中引用的 /api/images/<filename>
  const htmlTables: Array<[string, string]> = [
    ['comments', 'content'],
    ['messages', 'content'],
    ['records', 'content'],
    ['records', 'summary'],
    ['puzzles', 'content'],
    ['puzzles', 'description'],
    ['puzzles', 'hint'],
    ['puzzles', 'solution'],
    ['wiki_entries', 'content'],
    ['stories', 'cover'],
    ['stories', 'description'],
    ['story_scenes', 'background'],
    ['story_lines', 'left_image'],
    ['story_lines', 'right_image'],
    ['story_characters', 'default_sprite'],
    ['story_characters', 'sprites'],
    ['mail_messages', 'body_html'],
    ['mail_messages', 'body_text'],
  ];
  for (const [table, col] of htmlTables) {
    try {
      const rows = db.prepare(`SELECT ${col} FROM ${table}`).all() as Array<Record<string, unknown>>;
      for (const row of rows) {
        for (const f of extractImageFiles(row[col] as string)) refs.add(f);
      }
    } catch { /* 表或列不存在则跳过 */ }
  }

  // 用户头像（存的是 uploads/avatars/<name> 相对路径）
  try {
    const rows = db.prepare('SELECT avatar_url FROM users').all() as Array<{ avatar_url: string }>;
    for (const r of rows) {
      if (!r.avatar_url) continue;
      const name = path.basename(r.avatar_url);
      if (name) refs.add(name);
    }
  } catch { /* 忽略 */ }

  // 附件（file_path 指向 uploads 根目录，如 crash log / zip）
  for (const table of ['attachments', 'sarcophagus_codes']) {
    try {
      const rows = db.prepare(`SELECT file_path FROM ${table}`).all() as Array<{ file_path: string }>;
      for (const r of rows) {
        if (!r.file_path) continue;
        const name = path.basename(r.file_path);
        if (name) refs.add(name);
      }
    } catch { /* 忽略 */ }
  }

  return refs;
}

/**
 * 清理过期孤儿上传文件（未被数据库引用且超过保留期）
 */
function cleanupOldUploads() {
  const cutoff = Date.now() - FILE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const referenced = getReferencedFiles();
  let deleted = 0;

  for (const dir of uploadDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          const stat = fs.statSync(filePath);
          if (!stat.isFile()) continue;
          if (referenced.has(file)) continue; // 仍被引用：用户内容，绝不删除
          if (stat.mtimeMs < cutoff) {
            fs.unlinkSync(filePath);
            deleted++;
            console.log(`[Cleanup] 已删除过期孤儿文件: ${filePath}`);
          }
        } catch { /* 跳过无法访问的文件 */ }
      }
    } catch { /* 跳过无法读取的目录 */ }
  }

  if (deleted > 0) {
    console.log(`[Cleanup] 本次清理过期孤儿文件 ${deleted} 个`);
  }
}

/**
 * 检查并清理 SQLite WAL 文件
 */
function cleanupWAL() {
  const dataDir = path.join(__dirname, '..', '..', 'data');
  const walPath = path.join(dataDir, 'arkoverseer.db-wal');
  const shmPath = path.join(dataDir, 'arkoverseer.db-shm');

  try {
    if (fs.existsSync(walPath)) {
      const stat = fs.statSync(walPath);
      const sizeMB = stat.size / (1024 * 1024);
      if (sizeMB > WAL_MAX_SIZE_MB) {
        // WAL 文件过大，提示需要 checkpoint（better-sqlite3 会自动管理）
        console.log(`[Cleanup] WARNING: WAL 文件过大 (${sizeMB.toFixed(1)}MB)，建议重启服务以触发 checkpoint`);
      }
    }
  } catch { /* 忽略 */ }
}

/**
 * 检查磁盘使用情况
 */
function checkDiskUsage() {
  try {
    // 检查 data 和 uploads 目录的总大小
    let totalSize = 0;
    const dirsToCheck = [
      path.join(__dirname, '..', '..', 'data'),
      ...uploadDirs,
    ];
    for (const dir of dirsToCheck) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          try {
            const stat = fs.statSync(filePath);
            if (stat.isFile()) totalSize += stat.size;
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }
    const totalMB = totalSize / (1024 * 1024);
    console.log(`[Cleanup] 数据存储使用: ${totalMB.toFixed(1)}MB`);
  } catch { /* 忽略 */ }
}

/**
 * 启动定期清理任务
 */
export function startDiskCleanup() {
  console.log('[Cleanup] 磁盘清理任务已启动（每12小时执行一次，仅清理未被引用的孤儿文件）');
  // 立即执行一次
  cleanupOldUploads();
  cleanupWAL();
  checkDiskUsage();
  // 定期执行
  const timer = setInterval(() => {
    cleanupOldUploads();
    cleanupWAL();
    checkDiskUsage();
  }, CLEANUP_INTERVAL_MS);
  timer.unref(); // 不阻止进程退出
}
