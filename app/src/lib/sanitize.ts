import DOMPurify from 'dompurify';

/**
 * 前端 HTML 消毒：在所有 dangerouslySetInnerHTML 渲染用户内容前调用。
 * 同时兼容 Markdown 渲染后的 HTML（code/pre/table/input[checkbox] 等标签）
 * 和旧版富文本编辑器内容。
 */
export function sanitizeHtml(dirty: string | undefined | null): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ADD_ATTR: ['target'],
    ALLOW_DATA_ATTR: true,
    // 显式允许 Markdown 渲染输出的标签（含复选框任务列表）
    ADD_TAGS: ['del'],
  });
}
