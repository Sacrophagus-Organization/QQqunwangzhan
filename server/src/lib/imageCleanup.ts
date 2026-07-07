import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imageDir = path.join(__dirname, '..', '..', 'uploads', 'images');

/** 从 HTML/Markdown 文本中提取 /api/images/<filename> 的文件名列表 */
function extractImageFiles(html: string | null | undefined): string[] {
  if (!html || typeof html !== 'string') return [];
  // jpeg 必须放在 jpg 前面，否则 "image.jpeg" 会被匹配为 "image.jpg"
  // 同时匹配 Markdown ![](url) 和 HTML <img src=url> 两种引用格式
  const regex = /\/api\/images\/([\w.\-]+\.(?:jpeg|jpg|png|gif|webp|bmp))/gi;
  const files: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    files.push(match[1]);
  }
  return files;
}

/** 删除 HTML 内容中引用的所有图片文件（删除留言/评论时调用） */
export function deleteImagesFromHtml(html: string | null | undefined): void {
  for (const filename of extractImageFiles(html)) {
    try { fs.unlinkSync(path.join(imageDir, filename)); } catch { /* 文件可能已不存在 */ }
  }
}

/** 对比新旧 HTML，删除新内容中不再引用的图片文件（编辑内容时调用） */
export function deleteUnusedImages(oldHtml: string, newHtml: string): void {
  const oldImgs = new Set(extractImageFiles(oldHtml));
  const newImgs = new Set(extractImageFiles(newHtml));
  for (const filename of oldImgs) {
    if (!newImgs.has(filename)) {
      try { fs.unlinkSync(path.join(imageDir, filename)); } catch { /* 忽略 */ }
    }
  }
}
