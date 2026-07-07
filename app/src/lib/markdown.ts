import MarkdownIt from 'markdown-it';

/**
 * Markdown 渲染器：关闭 html 标签解析防止 XSS（第一层防御）
 * 渲染后再由 DOMPurify 进行第二层消毒
 */
const md = new MarkdownIt({
  html: false,        // 禁止原始 HTML 标签，XSS 第一层防线
  linkify: true,      // 自动识别 URL 转为链接
  breaks: true,       // 换行即 <br>
  typographer: false, // 不自动替换引号/破折号（避免破坏 ASCII 图案）
});

/**
 * 将 Markdown 文本渲染为安全的 HTML 字符串
 * @param markdown - Markdown 源文本
 * @returns 渲染后的 HTML 字符串
 */
export function renderMarkdown(markdown: string | undefined | null): string {
  if (!markdown || typeof markdown !== 'string') return '';
  return md.render(markdown);
}

/**
 * 从 Markdown 文本中提取纯文本（摘要用）
 * @param markdown - Markdown 源文本
 * @param maxLen - 最大字符数，超出则截断并加省略号
 * @returns 纯文本摘要
 */
export function markdownToSummary(markdown: string, maxLen = 120): string {
  if (!markdown || typeof markdown !== 'string') return '';
  // 用 markdown-it 渲染后提取纯文本（比手写正则更准确）
  const html = md.render(markdown);
  // 简单去除 HTML 标签
  const text = html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}
