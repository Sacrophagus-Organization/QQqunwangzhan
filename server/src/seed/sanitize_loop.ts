import { db } from '../db.js';
import { sanitizeRichHtml } from '../lib/sanitize.js';

// 用法: npx tsx src/seed/sanitize_loop.ts [puzzleId]（默认 puz-loop-node1）
const puzzleId = process.argv[2] ?? 'puz-loop-node1';
const row = db.prepare('SELECT id, content FROM puzzles WHERE id = ?').get(puzzleId) as any;
if (!row) {
  console.error('puzzle not found:', puzzleId);
  process.exit(1);
}
const clean = sanitizeRichHtml(row.content);
db.prepare('UPDATE puzzles SET content = ? WHERE id = ?').run(clean, row.id);
console.log('sanitized:', clean === row.content ? 'unchanged' : 'changed');
console.log('tail:', clean.slice(-240));
