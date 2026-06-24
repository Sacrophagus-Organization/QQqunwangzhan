import sanitizeHtml from 'sanitize-html';

/**
 * 服务端富文本 HTML 消毒（defense-in-depth）。
 * 在写入数据库前调用，剥离 script、内联事件、javascript: 协议等，
 * 保留富文本编辑器常用格式标签与 class/style。
 */
export function sanitizeRichHtml(html: string): string {
  if (!html || typeof html !== 'string') return html || '';
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'strike', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'ul', 'ol', 'li', 'a', 'img', 'hr', 'div', 'span',
      'table', 'thead', 'tbody', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
      'figure', 'figcaption', 'details', 'summary',
    ],
    allowedAttributes: {
      '*': ['class', 'style', 'title'],
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'class'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      col: ['span', 'width'],
      colgroup: ['span'],
    },
    allowedSchemes: ['http', 'https', 'data', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
      }),
    },
  });
}
