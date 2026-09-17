import { sanitizeHtml } from './sanitize';
import { renderMarkdown } from './markdown';

const htmlLikeRe = /<(p|div|br|blockquote|strong|em|b|i|u|ul|ol|li|h[1-6]|span|a|table|tr|td|th|font)\b/i;
const htmlEntityRe = /&(nbsp|amp|lt|gt|quot|apos);/i;

/** 兼容旧版富文本 HTML 与新的 Markdown 正文。 */
export function isHtmlBody(value: string | null | undefined): boolean {
  if (!value) return false;
  return htmlLikeRe.test(value) || htmlEntityRe.test(value);
}

/** 渲染邮件正文：旧 HTML 直接消毒，Markdown 先渲染再消毒。 */
export function renderEmailBody(value: string | null | undefined): string {
  if (!value) return '';
  return sanitizeHtml(isHtmlBody(value) ? value : renderMarkdown(value));
}

/** 邮件列表摘要：去除 HTML/Markdown 标记，返回用于多行截断的纯文本。 */
export function previewEmailBody(value: string | null | undefined): string {
  if (!value) return '';
  const html = renderEmailBody(value);
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
}

/** 将邮件正文转为可引用的 Markdown 引用块，Markdown 保留原格式，旧 HTML 降级为纯文本。 */
export function quoteEmailBody(value: string | null | undefined): string {
  if (!value) return '';
  const source = value.replace(/\r\n?/g, '\n');
  const rawLines = isHtmlBody(value)
    ? (() => {
        const div = document.createElement('div');
        div.innerHTML = value;
        return (div.textContent || div.innerText || '').replace(/\r\n?/g, '\n');
      })()
    : source;
  return rawLines.split('\n').map(line => line ? `> ${line}` : '>').join('\n');
}
