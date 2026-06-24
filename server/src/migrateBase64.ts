/**
 * One-time migration script: extracts all existing base64 images
 * from messages and comments, saves them as files, and updates DB records.
 *
 * Usage: cd server && npx tsx src/migrateBase64.ts
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractBase64Images, countBase64Images } from './lib/imageExtractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'arkoverseer.db');

console.log('🗿 石棺 Base64 图片迁移工具');
console.log(`📂 数据库: ${dbPath}\n`);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// ── Messages ──
const messages = db.prepare('SELECT id, content FROM messages WHERE content LIKE ?').all('%data:image/%') as any[];
console.log(`📨 留言: ${messages.length} 条含 Base64 图片`);

let msgConverted = 0;
let msgImgCount = 0;
const updateMsg = db.prepare('UPDATE messages SET content = ? WHERE id = ?');
for (const row of messages) {
  const beforeCount = countBase64Images(row.content);
  const newContent = extractBase64Images(row.content);
  const afterCount = countBase64Images(newContent);
  if (afterCount < beforeCount) {
    updateMsg.run(newContent, row.id);
    msgConverted++;
    msgImgCount += beforeCount - afterCount;
  }
}
console.log(`   ✅ ${msgConverted} 条留言已转换，共提取 ${msgImgCount} 张图片`);

// ── Comments ──
const comments = db.prepare('SELECT id, content FROM comments WHERE content LIKE ?').all('%data:image/%') as any[];
console.log(`💬 评论: ${comments.length} 条含 Base64 图片`);

let cmtConverted = 0;
let cmtImgCount = 0;
const updateCmt = db.prepare('UPDATE comments SET content = ? WHERE id = ?');
for (const row of comments) {
  const beforeCount = countBase64Images(row.content);
  const newContent = extractBase64Images(row.content);
  const afterCount = countBase64Images(newContent);
  if (afterCount < beforeCount) {
    updateCmt.run(newContent, row.id);
    cmtConverted++;
    cmtImgCount += beforeCount - afterCount;
  }
}
console.log(`   ✅ ${cmtConverted} 条评论已转换，共提取 ${cmtImgCount} 张图片`);

db.close();

console.log(`\n🎉 迁移完成！共提取 ${msgImgCount + cmtImgCount} 张图片到 uploads/images/`);
console.log('提示: 运行 npx tsx src/seed.ts 重新 seed 不会影响已迁移的数据。');
