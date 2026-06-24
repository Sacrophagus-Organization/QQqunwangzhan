import DOMPurify from 'dompurify';

/**
 * 前端 HTML 消毒：在所有 dangerouslySetInnerHTML 渲染用户内容前调用。
 * 移除 script、内联事件处理器(onerror 等)、javascript: 协议等危险内容，
 * 保留富文本编辑器所需的格式标签、class、style 与 data-* 属性。
 */
export function sanitizeHtml(dirty: string | undefined | null): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ADD_ATTR: ['target'],
    // 默认即允许 data-* 属性；保留 style（DOMPurify 会过滤其中的危险值）
    ALLOW_DATA_ATTR: true,
  });
}
