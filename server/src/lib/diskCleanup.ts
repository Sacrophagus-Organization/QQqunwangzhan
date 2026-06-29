import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 定期清理过期的上传文件和旧的 SQLite WAL 文件
 * 防止 40G 系统盘被占满
 */

// 图片/附件过期天数（30天未引用则删除）
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

/**
 * 清理过期上传文件
 */
function cleanupOldUploads() {
  const cutoff = Date.now() - FILE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  for (const dir of uploadDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile() && stat.mtimeMs < cutoff) {
            fs.unlinkSync(filePath);
            console.log(`[Cleanup] 已删除过期文件: ${filePath}`);
          }
        } catch { /* 跳过无法访问的文件 */ }
      }
    } catch { /* 跳过无法读取的目录 */ }
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
  console.log('[Cleanup] 磁盘清理任务已启动（每12小时执行一次）');
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
