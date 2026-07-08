import { useState, useRef, useCallback } from 'react';
import { Eye, Pencil, ImagePlus, Bold, Italic, Heading, Code, Quote, List, ListOrdered, Minus } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitize';
import { renderMarkdown } from '@/lib/markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

/**
 * 图片上传 — 复用现有 /api/images/upload 端点
 */
function uploadImage(file: File): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('arkoverseer_token');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/images/upload');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error('解析响应失败')); }
      } else {
        let msg = '上传失败';
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch { /* */ }
        reject(new Error(msg));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('网络错误')));
    xhr.send(formData);
  });
}

/** 在光标处插入文本，或包裹选中文本 */
function insertAtCursor(textarea: HTMLTextAreaElement, before: string, after: string = '') {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);
  const replacement = before + selected + after;
  textarea.setRangeText(replacement, start, end, 'select');
  // 选中刚插入的文本中部（方便继续输入）
  textarea.selectionStart = start + before.length;
  textarea.selectionEnd = start + before.length + selected.length;
  textarea.focus();
}

type ToolAction =
  | { type: 'bold' | 'italic' | 'code' | 'strikethrough' }
  | { type: 'heading'; level: number }
  | { type: 'quote' | 'ul' | 'ol' | 'hr' | 'link' };

const TOOL_ACTIONS: { icon: React.ReactNode; label: string; action: ToolAction; className?: string }[] = [
  { icon: <Bold className="h-3.5 w-3.5" />, label: '加粗', action: { type: 'bold' } },
  { icon: <Italic className="h-3.5 w-3.5" />, label: '斜体', action: { type: 'italic' } },
  { icon: <Heading className="h-3.5 w-3.5" />, label: '标题', action: { type: 'heading', level: 3 } },
  { icon: <Quote className="h-3.5 w-3.5" />, label: '引用', action: { type: 'quote' } },
  { icon: <Code className="h-3.5 w-3.5" />, label: '代码', action: { type: 'code' } },
  { icon: <List className="h-3.5 w-3.5" />, label: '无序列表', action: { type: 'ul' } },
  { icon: <ListOrdered className="h-3.5 w-3.5" />, label: '有序列表', action: { type: 'ol' } },
  { icon: <Minus className="h-3.5 w-3.5" />, label: '分隔线', action: { type: 'hr' }, className: 'hidden sm:flex' },
];

function applyTool(textarea: HTMLTextAreaElement, action: ToolAction) {
  const lineStart = textarea.value.lastIndexOf('\n', textarea.selectionStart - 1) + 1;

  switch (action.type) {
    case 'bold': insertAtCursor(textarea, '**', '**'); break;
    case 'italic': insertAtCursor(textarea, '*', '*'); break;
    case 'code': insertAtCursor(textarea, '`', '`'); break;
    case 'strikethrough': insertAtCursor(textarea, '~~', '~~'); break;
    case 'quote': {
      const prefix = '> ';
      textarea.setRangeText(prefix + textarea.value.substring(lineStart, textarea.selectionEnd), lineStart, textarea.selectionEnd, 'end');
      textarea.focus(); break;
    }
    case 'heading': {
      const prefix = '#'.repeat(action.level) + ' ';
      textarea.setRangeText(prefix + textarea.value.substring(lineStart, textarea.selectionEnd), lineStart, textarea.selectionEnd, 'end');
      textarea.focus(); break;
    }
    case 'ul': {
      const prefix = '- ';
      textarea.setRangeText(prefix + textarea.value.substring(lineStart, textarea.selectionEnd), lineStart, textarea.selectionEnd, 'end');
      textarea.focus(); break;
    }
    case 'ol': {
      const prefix = '1. ';
      textarea.setRangeText(prefix + textarea.value.substring(lineStart, textarea.selectionEnd), lineStart, textarea.selectionEnd, 'end');
      textarea.focus(); break;
    }
    case 'hr': {
      const sep = '\n\n---\n\n';
      textarea.setRangeText(sep, textarea.selectionStart, textarea.selectionEnd, 'end');
      textarea.focus(); break;
    }
    case 'link':
      insertAtCursor(textarea, '[', '](url)');
      break;
  }
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = '开始编写 Markdown...',
  minHeight = '400px',
  className = '',
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    [onChange],
  );

  const handleToolClick = useCallback((action: ToolAction) => {
    if (textareaRef.current) applyTool(textareaRef.current, action);
    // 触发 React onChange 以同步状态
    if (textareaRef.current) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype, 'value'
      )?.set;
      nativeInputValueSetter?.call(textareaRef.current, textareaRef.current.value);
      textareaRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, []);

  /** 粘贴/拖放图片上传 */
  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      if (textareaRef.current) {
        insertAtCursor(textareaRef.current, `![](${url})`, '');
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype, 'value'
        )?.set;
        nativeInputValueSetter?.call(textareaRef.current, textareaRef.current.value);
        textareaRef.current.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (e: any) {
      alert('图片上传失败：' + e.message);
    } finally {
      setUploading(false);
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        handleImageUpload(items[i].getAsFile()!);
        return;
      }
    }
  }, [handleImageUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files?.[0]?.type.startsWith('image/')) {
      handleImageUpload(files[0]);
    }
  }, [handleImageUpload]);

  const handleFileSelect = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) handleImageUpload(file);
    };
    input.click();
  }, [handleImageUpload]);

  // 在预览模式按任意键切回编辑
  const handlePreviewKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape' || e.key.length === 1) {
      setMode('edit');
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, []);

  const baseInput =
    'w-full resize-none bg-[hsl(230,25%,3.5%)] text-[hsl(215,30%,82%)] p-4 ' +
    'border-x border-b border-[hsl(230,20%,14%)] rounded-b-lg ' +
    'focus:outline-none focus:ring-1 focus:ring-primary/30 transition-shadow ' +
    'placeholder:text-[hsl(215,20%,30%)]';

  return (
    <div className={className}>
      {/* ─── 工具栏 ─── */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[hsl(230,20%,10%)] border border-[hsl(230,20%,14%)] rounded-t-lg border-b-0">
        {/* 编辑 / 预览 切换 */}
        <div className="flex rounded-md overflow-hidden border border-[hsl(230,20%,18%)] mr-2">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors ${
              mode === 'edit'
                ? 'bg-primary/20 text-primary border-r border-[hsl(230,20%,18%)]'
                : 'text-[hsl(215,20%,50%)] hover:text-[hsl(215,30%,80%)] hover:bg-[hsl(230,20%,15%)] border-r border-[hsl(230,20%,18%)]'
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />编辑
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors ${
              mode === 'preview'
                ? 'bg-primary/20 text-primary'
                : 'text-[hsl(215,20%,50%)] hover:text-[hsl(215,30%,80%)] hover:bg-[hsl(230,20%,15%)]'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />预览
          </button>
        </div>

        {/* 仅在编辑模式显示格式化按钮 */}
        {mode === 'edit' && (
          <>
            <div className="w-px h-5 bg-[hsl(230,20%,18%)] mx-1" />
            {TOOL_ACTIONS.map((t, i) => (
              <button
                key={i}
                type="button"
                title={t.label}
                onClick={() => handleToolClick(t.action)}
                className={`flex items-center justify-center w-7 h-7 rounded text-[hsl(215,20%,50%)] hover:text-[hsl(215,30%,85%)] hover:bg-[hsl(230,20%,18%)] transition-colors ${t.className || ''}`}
              >
                {t.icon}
              </button>
            ))}
            <div className="w-px h-5 bg-[hsl(230,20%,18%)] mx-1" />
            <button
              type="button"
              title="插入图片（支持粘贴/拖放）"
              onClick={handleFileSelect}
              disabled={uploading}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[hsl(215,20%,55%)] hover:text-[hsl(215,30%,85%)] hover:bg-[hsl(230,20%,18%)] transition-colors disabled:opacity-50"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {uploading ? '上传中...' : '图片'}
            </button>
          </>
        )}

        {mode === 'preview' && (
          <span className="text-[10px] text-[hsl(215,20%,35%)] ml-auto">按任意键切回编辑</span>
        )}
        {mode === 'edit' && (
          <span className="text-[10px] text-[hsl(215,20%,35%)] ml-auto hidden sm:block">支持粘贴/拖放图片</span>
        )}
      </div>

      {/* ─── 编辑区 / 预览区 ─── */}
      {mode === 'edit' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          onDrop={handleDrop}
          placeholder={placeholder}
          className={baseInput}
          style={{
            minHeight,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            fontSize: '14px',
            lineHeight: 1.7,
            caretColor: 'hsl(190,100%,48%)',
          }}
          spellCheck={false}
        />
      ) : (
        <div
          className="w-full px-4 py-4 bg-[hsl(230,20%,8%)] border-x border-b border-[hsl(230,20%,14%)] rounded-b-lg overflow-y-auto cursor-text focus:outline-none"
          style={{ minHeight }}
          tabIndex={0}
          onKeyDown={handlePreviewKeyDown}
          onClick={() => setMode('edit')}
        >
          {value.trim() ? (
            <div
              className="markdown-content prose prose-invert prose-sm max-w-none text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMarkdown(value)) }}
            />
          ) : (
            <p className="text-[hsl(215,20%,35%)] italic">暂无内容，点击此处开始编辑</p>
          )}
        </div>
      )}
    </div>
  );
}
