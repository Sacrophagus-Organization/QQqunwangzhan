import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'images');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

/**
 * Scans HTML content for base64 <img> tags, extracts them to files,
 * and replaces src with URL references. Returns the modified HTML.
 */
export function extractBase64Images(html: string): string {
  if (!html || typeof html !== 'string') return html;

  // Regex to match <img ... src="data:image/..." ...> tags
  const imgRegex = /<img\s+[^>]*src\s*=\s*"data:image\/([^;]+);base64,([^"]+)"[^>]*>/gi;

  return html.replace(imgRegex, (match, mimeType: string, base64Data: string) => {
    try {
      // Detect real extension from MIME (gif -> .gif, jpeg -> .jpg, png -> .png, webp -> .webp, etc.)
      let ext = '.' + (mimeType === 'jpeg' ? 'jpg' : mimeType);
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
        ext = '.png'; // fallback
      }
      const filename = `${uuid()}${ext}`;
      const filePath = path.join(uploadDir, filename);
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);
      const url = `/api/images/${filename}`;
      return match.replace(/src\s*=\s*"data:image\/[^"]+"/, `src="${url}"`);
    } catch (e) {
      console.error('Base64 image extraction failed:', e);
      return match; // Keep original on error
    }
  });
}

/**
 * Migration counter — returns how many base64 images exist in the given HTML
 */
export function countBase64Images(html: string): number {
  if (!html || typeof html !== 'string') return 0;
  const matches = html.match(/<img\s+[^>]*src\s*=\s*"data:image\/[^;]+;base64,[^"]+"[^>]*>/gi);
  return matches ? matches.length : 0;
}
