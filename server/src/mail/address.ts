import type { MailAddress } from './types.js';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeLocalPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');
}

export function getMailDomain(): string {
  return process.env.DOMAIN || 'example.com';
}

export function buildAddress(localPart: string): string {
  return `${normalizeLocalPart(localPart)}@${getMailDomain()}`;
}

export function parseAddresses(value: unknown): MailAddress[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === 'string' ? { address: item } : item)
      .filter((item): item is MailAddress => !!item && typeof item.address === 'string')
      .map((item) => ({ address: item.address.trim().toLowerCase(), name: item.name?.trim() || '' }))
      .filter((item) => emailRe.test(item.address));
  }

  if (typeof value !== 'string') return [];
  return value
    .split(/[;,]/)
    .map((address) => address.trim().toLowerCase())
    .filter((address) => emailRe.test(address))
    .map((address) => ({ address }));
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 将 Markdown 文本转换为用于列表预览、Bot 关键词匹配的纯文本。
 * 新邮件正文统一保存为 Markdown，因此这里同时兼容旧版 HTML 正文。
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') return '';
  let text = markdown;

  // 代码块 / 行内代码：保留代码文字
  text = text.replace(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g, '$1');
  text = text.replace(/`([^`\n]+)`/g, '$1');

  // 图片与链接：保留显示文字
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  // 标题、引用、列表、分隔线
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  text = text.replace(/^\s{0,3}>\s?/gm, '');
  text = text.replace(/^\s{0,3}[-+*]\s+/gm, '');
  text = text.replace(/^\s{0,3}\d+[.)]\s+/gm, '');
  text = text.replace(/^\s{0,3}([-*_])\1{2,}\s*$/gm, '');

  // 粗体、斜体、删除线
  text = text.replace(/(\*\*|__)([^*_]+)\1/g, '$2');
  text = text.replace(/(\*|_)([^*_]+)\1/g, '$2');
  text = text.replace(/~~([^~]+)~~/g, '$1');

  // 旧版富文本 HTML
  text = text
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ');

  // 常见 HTML 实体
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");

  return text.replace(/\s+/g, ' ').trim();
}
