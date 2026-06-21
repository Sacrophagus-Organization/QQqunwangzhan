import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bold,
  Underline,
  EyeOff,
  Image,
  Type,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
const COLORS = [
  '#e2e8f0', '#00d4ff', '#a855f7', '#f0c040', '#4ade80',
  '#f87171', '#fb923c', '#f472b6', '#94a3b8', '#ffffff',
];

function insertSpoiler(doc: Document, editorEl?: HTMLElement | null) {
  const sel = doc.getSelection();
  if (!sel || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);

  // 如果光标已在 spoiler 内 → 取消马赛克（unwrap）
  const existingSpoiler = sel.anchorNode?.parentElement?.closest('.spoiler-text');
  if (existingSpoiler) {
    const parent = existingSpoiler.parentNode;
    if (!parent) return;
    while (existingSpoiler.firstChild) {
      parent.insertBefore(existingSpoiler.firstChild, existingSpoiler);
    }
    parent.removeChild(existingSpoiler);
    parent.normalize();
    return;
  }

  // 创建 spoiler span，保留富文本格式
  const span = doc.createElement('span');
  span.className = 'spoiler-text';
  span.setAttribute('data-spoiler', 'true');
  span.addEventListener('click', (e) => {
    e.stopPropagation();
    span.classList.toggle('revealed');
  });

  // 用 extractContents 保留选区内的 HTML 格式
  const fragment = range.extractContents();
  span.appendChild(fragment);
  range.insertNode(span);

  // 在 spoiler 后面插入零宽空格作为光标锚点
  const cursorAnchor = doc.createTextNode('\u200B');
  span.after(cursorAnchor);

  // 光标放到锚点之后
  const newRange = doc.createRange();
  newRange.setStartAfter(cursorAnchor);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);

  // 强制聚焦编辑器
  if (editorEl) editorEl.focus();
}

function insertImagePlaceholder(doc: Document) {
  const sel = doc.getSelection();
  if (!sel) return;
  const range = sel.getRangeAt(0) || doc.createRange();
  // Create a file input trigger
  const container = doc.createElement('div');
  container.className = 'rich-image-container';
  container.contentEditable = 'false';
  container.style.cssText = 'display:inline-block;position:relative;margin:4px;vertical-align:top;';

  const fileInput = doc.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  container.appendChild(fileInput);

  const placeholder = doc.createElement('div');
  placeholder.className = 'rich-image-placeholder';
  placeholder.style.cssText =
    'width:200px;height:150px;border:2px dashed hsl(228,20%,25%);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:hsl(215,20%,60%);font-size:13px;gap:6px;transition:all 0.2s;';
  placeholder.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> 点击上传图片';
  placeholder.addEventListener('click', () => fileInput.click());
  container.appendChild(placeholder);

  const resizeHandle = doc.createElement('div');
  resizeHandle.className = 'rich-image-resize';
  resizeHandle.style.cssText =
    'position:absolute;right:-6px;bottom:-6px;width:14px;height:14px;background:hsl(190,100%,50%);border-radius:3px;cursor:nwse-resize;display:none;z-index:10;';
  container.appendChild(resizeHandle);

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = doc.createElement('img');
      img.src = reader.result as string;
      img.className = 'rich-image';
      img.style.cssText = 'max-width:100%;height:auto;display:block;border-radius:6px;';
      img.setAttribute('data-image', reader.result as string);
      placeholder.remove();
      container.insertBefore(img, container.firstChild);
      resizeHandle.style.display = 'block';

      // Resize logic
      let startX = 0, startW = 0, startH = 0;
      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startW = img.offsetWidth;
        startH = img.offsetHeight;
        const onMove = (ev: MouseEvent) => {
          const newW = Math.max(60, startW + (ev.clientX - startX));
          const ratio = startH / startW;
          img.style.width = newW + 'px';
          img.style.height = (newW * ratio) + 'px';
        };
        const onUp = () => {
          doc.removeEventListener('mousemove', onMove);
          doc.removeEventListener('mouseup', onUp);
        };
        doc.addEventListener('mousemove', onMove);
        doc.addEventListener('mouseup', onUp);
      });
    };
    reader.readAsDataURL(file);
  });

  // Delete on backspace when selected
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      container.remove();
    }
  });

  range.insertNode(container);
  range.collapse(false);
  sel.removeAllRanges();
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '开始输入...',
  minHeight = '200px',
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      const currentContent = editorRef.current.innerHTML;
      if (currentContent !== value && value !== undefined) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const execCmd = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }, []);

  const handleBold = () => execCmd('bold');
  const handleUnderline = () => execCmd('underline');
  const handleFontSize = (size: string) => {
    execCmd('fontSize', '3');
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = size;
    try {
      range.surroundContents(span);
    } catch {
      // Partial selection, wrap in parts
    }
    setShowFontSize(false);
    handleInput();
  };
  const handleColor = (color: string) => {
    execCmd('foreColor', color);
    setShowColor(false);
  };
  const handleSpoiler = () => {
    insertSpoiler(document, editorRef.current);
    handleInput();
  };
  const handleImage = () => {
    insertImagePlaceholder(document);
    handleInput();
  };
  const handleAlign = (align: string) => execCmd('justify' + align);

  const handleLink = () => {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed) {
      setShowLinkInput(!showLinkInput);
      return;
    }
    setShowLinkInput(!showLinkInput);
    if (showLinkInput) return;
    // Try to get existing link
    const node = sel.anchorNode?.parentElement?.closest('a');
    setLinkUrl(node?.getAttribute('href') || '');
  };

  const insertLink = () => {
    if (!linkUrl.trim()) return;
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const a = document.createElement('a');
    a.href = linkUrl.trim();
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.cssText = 'color:#00d4ff;text-decoration:underline;';
    a.textContent = range.toString() || linkUrl.trim();
    range.deleteContents();
    range.insertNode(a);
    sel.removeAllRanges();
    setShowLinkInput(false);
    setLinkUrl('');
    handleInput();
  };

  // Check if bold/underline is active
  const isBold = () => document.queryCommandState('bold');
  const isUnderline = () => document.queryCommandState('underline');

  return (
    <div className={`rich-editor-wrapper ${className}`}>
      {/* Toolbar */}
      <div className={`flex flex-wrap items-center gap-0.5 p-1.5 border-b border-border/40 bg-secondary/20 rounded-t-lg transition-all ${isFocused ? 'border-primary/30' : ''}`}>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${isBold() ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={handleBold}
          title="加粗"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${isUnderline() ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={handleUnderline}
          title="下划线"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border/50 mx-1" />

        {/* Font Size */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1"
            onClick={() => { setShowFontSize(!showFontSize); setShowColor(false); }}
            title="字号"
          >
            <Type className="h-4 w-4" />
            <span className="text-xs">Aa</span>
          </Button>
          {showFontSize && (
            <div className="absolute top-full left-0 mt-1 bg-popover border border-border/50 rounded-lg p-1.5 shadow-xl z-50">
              <div className="flex flex-col gap-0.5">
                {FONT_SIZES.map(size => (
                  <button
                    key={size}
                    className="px-3 py-1.5 text-sm hover:bg-primary/10 hover:text-primary rounded-md text-left whitespace-nowrap"
                    onClick={() => handleFontSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Color */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => { setShowColor(!showColor); setShowFontSize(false); }}
            title="文字颜色"
          >
            <Palette className="h-4 w-4" />
          </Button>
          {showColor && (
            <div className="absolute top-full left-0 mt-1 bg-popover border border-border/50 rounded-lg p-2 shadow-xl z-50">
              <div className="flex flex-wrap gap-1.5 w-[180px]">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className="w-7 h-7 rounded-md border border-border/30 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => handleColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-border/50 mx-1" />

        {/* Align */}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => handleAlign('Left')} title="左对齐">
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => handleAlign('Center')} title="居中">
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => handleAlign('Right')} title="右对齐">
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border/50 mx-1" />

        {/* Link */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1"
            onClick={handleLink}
            title="插入超链接"
          >
            <Link className="h-4 w-4" />
            <span className="text-xs">链接</span>
          </Button>
          {showLinkInput && (
            <div className="absolute top-full left-0 mt-1 bg-popover border border-border/50 rounded-lg p-2 shadow-xl z-50 flex gap-1">
              <Input
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="输入URL..."
                className="w-48 h-8 text-xs bg-secondary/30 border-border/50"
                onKeyDown={e => { if (e.key === 'Enter') insertLink(); if (e.key === 'Escape') setShowLinkInput(false); }}
              />
              <Button size="sm" className="h-8 text-xs" onClick={insertLink}>确认</Button>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-border/50 mx-1" />

        {/* Spoiler */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 gap-1"
          onClick={handleSpoiler}
          title="黑色马赛克（鼠标悬停显示）"
        >
          <EyeOff className="h-4 w-4" />
          <span className="text-xs">马赛克</span>
        </Button>

        {/* Image */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-accent hover:bg-accent/10 gap-1"
          onClick={handleImage}
          title="插入图片"
        >
          <Image className="h-4 w-4" />
          <span className="text-xs">图片</span>
        </Button>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        className="rich-editor-content w-full bg-secondary/30 border border-border/40 border-t-0 rounded-b-lg px-4 py-3 text-sm leading-relaxed outline-none focus:border-primary/30 transition-colors"
        contentEditable
        suppressContentEditableWarning
        style={{ minHeight }}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
      />
    </div>
  );
}

// Helper to extract plain text from HTML
export function htmlToPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

// Helper to get summary from HTML
export function htmlToSummary(html: string, maxLen = 100): string {
  const text = htmlToPlainText(html);
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}
