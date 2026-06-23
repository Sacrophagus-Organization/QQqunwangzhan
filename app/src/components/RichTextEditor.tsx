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

// 图片尺寸预设（像素宽度）
const IMAGE_SIZE_PRESETS = [
  { label: '小', width: 200 },
  { label: '中', width: 400 },
  { label: '大', width: 600 },
  { label: '100%', width: -1 }, // -1 = 全宽
] as const;
const IMAGE_DEFAULT_WIDTH = 400; // 新图片默认宽度

function setImageSize(img: HTMLImageElement, width: number) {
  if (width === -1) {
    // 全宽：移除固定宽高，依赖 max-width:100%
    img.style.removeProperty('width');
    img.style.removeProperty('height');
  } else {
    img.style.width = width + 'px';
    img.style.removeProperty('height'); // 改宽时放开高度，让 auto 自适应
  }
}

function insertImagePlaceholder(doc: Document, editorEl?: HTMLElement | null) {
  const sel = doc.getSelection();
  if (!sel) return;
  // 安全获取 range：rangeCount 可能为 0（失焦时）
  let range: Range;
  try {
    range = sel.getRangeAt(0);
  } catch {
    range = doc.createRange();
  }
  if (!range) return;
  // Create a file input trigger
  const container = doc.createElement('div');
  container.className = 'rich-image-container';
  container.contentEditable = 'false';
  container.style.cssText = 'display:inline-block;position:relative;margin:4px;vertical-align:top;border-radius:8px;overflow:hidden;';

  const fileInput = doc.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  container.appendChild(fileInput);

  // 尺寸预设工具栏
  const sizeToolbar = doc.createElement('div');
  sizeToolbar.className = 'rich-image-toolbar';
  sizeToolbar.style.cssText =
    'position:absolute;top:6px;left:50%;transform:translateX(-50%);display:none;gap:3px;z-index:20;';
  IMAGE_SIZE_PRESETS.forEach((preset) => {
    const btn = doc.createElement('button');
    btn.textContent = preset.label;
    btn.className = 'rich-image-size-btn';
    btn.style.cssText =
      'padding:2px 8px;font-size:11px;border:none;border-radius:4px;background:rgba(0,0,0,0.75);color:#e2e8f0;cursor:pointer;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.1);transition:all 0.15s;white-space:nowrap;';
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(0,212,255,0.6)';
      btn.style.color = '#fff';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(0,0,0,0.75)';
      btn.style.color = '#e2e8f0';
    });
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const img = container.querySelector('.rich-image') as HTMLImageElement | null;
      if (img) {
        setImageSize(img, preset.width);
        // 尺寸变更 → 通知编辑器状态更新
        if (editorEl) editorEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    sizeToolbar.appendChild(btn);
  });
  container.appendChild(sizeToolbar);

  // GIF 动图徽章（右上角）
  const gifBadge = doc.createElement('div');
  gifBadge.className = 'rich-image-gif-badge';
  gifBadge.style.cssText =
    'position:absolute;top:4px;right:4px;display:none;align-items:center;gap:3px;padding:2px 7px;background:rgba(147,51,234,0.85);color:#fff;font-size:10px;font-weight:600;border-radius:4px;z-index:18;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.15);';
  gifBadge.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 10h2l-1 4"/><path d="M13 10l1 4"/><path d="M16 10v4"/></svg>GIF';
  container.appendChild(gifBadge);

  const placeholder = doc.createElement('div');
  placeholder.className = 'rich-image-placeholder';
  placeholder.style.cssText =
    'width:400px;height:200px;border:2px dashed hsl(228,20%,25%);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:hsl(215,20%,60%);font-size:13px;gap:6px;transition:all 0.2s;background:rgba(0,0,0,0.15);';
  placeholder.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> 点击上传图片';
  placeholder.addEventListener('click', () => fileInput.click());
  container.appendChild(placeholder);

  // 缩放拖拽手柄（右下角）
  const resizeHandle = doc.createElement('div');
  resizeHandle.className = 'rich-image-resize';
  resizeHandle.style.cssText =
    'position:absolute;right:2px;bottom:2px;width:22px;height:22px;background:rgba(0,212,255,0.85);border-radius:4px;cursor:nwse-resize;display:none;z-index:10;border:2px solid rgba(255,255,255,0.4);box-shadow:0 0 6px rgba(0,0,0,0.5);';
  // 手柄内加一个右下角箭头图标
  resizeHandle.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" style="position:absolute;right:1px;bottom:1px;"><path d="M22 2L22 22L2 22"/></svg>';
  container.appendChild(resizeHandle);

  // 尺寸百分比标签（拖拽时显示）
  const sizeLabel = doc.createElement('div');
  sizeLabel.className = 'rich-image-size-label';
  sizeLabel.style.cssText =
    'position:absolute;bottom:4px;right:28px;display:none;font-size:10px;color:#fff;background:rgba(0,0,0,0.7);padding:1px 5px;border-radius:3px;pointer-events:none;z-index:15;';
  container.appendChild(sizeLabel);

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const isGifFile = file.type === 'image/gif';
    const reader = new FileReader();
    reader.onload = () => {
      const img = doc.createElement('img');
      img.src = reader.result as string;
      img.className = 'rich-image';
      // 不给默认宽度，先让浏览器自然加载，然后用 onload 设置
      img.style.cssText = 'display:block;border-radius:6px;';
      img.setAttribute('data-image', reader.result as string);

      // 图片加载完成后设置默认尺寸 + 通知编辑器状态更新
      img.onload = () => {
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;
        // 如果原图比默认值小，保持原图大小；否则缩到默认宽度
        const targetW = Math.min(naturalW, IMAGE_DEFAULT_WIDTH);
        img.style.width = targetW + 'px';
        // 如果有实际像素宽高，等比设置
        if (naturalW > 0 && naturalH > 0) {
          img.style.height = Math.round(targetW * naturalH / naturalW) + 'px';
        } else {
          img.style.height = 'auto';
        }
        // 通知编辑器内容已变更（替代占位框→图片的 DOM 变化不会自动触发 onInput）
        if (editorEl) editorEl.dispatchEvent(new Event('input', { bubbles: true }));
      };

      placeholder.remove();
      container.insertBefore(img, container.firstChild);
      resizeHandle.style.display = 'flex';
      sizeToolbar.style.display = 'flex';
      if (isGifFile) gifBadge.style.display = 'flex';

      // 拖拽缩放逻辑
      let startX = 0, startW = 0, startH = 0;
      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startW = img.offsetWidth;
        startH = img.offsetHeight;
        sizeLabel.style.display = 'block';
        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - startX;
          const newW = Math.max(60, Math.min(1200, startW + dx));
          const ratio = startH / startW;
          img.style.width = newW + 'px';
          img.style.height = Math.round(newW * ratio) + 'px';
          sizeLabel.textContent = newW + 'px';
        };
        const onUp = () => {
          doc.removeEventListener('mousemove', onMove);
          doc.removeEventListener('mouseup', onUp);
          sizeLabel.style.display = 'none';
          // 缩放结束 → 通知编辑器状态更新
          if (editorEl) editorEl.dispatchEvent(new Event('input', { bubbles: true }));
        };
        doc.addEventListener('mousemove', onMove);
        doc.addEventListener('mouseup', onUp);
      });

      // 鼠标悬停容器 → 显示工具栏和手柄
      container.addEventListener('mouseenter', () => {
        sizeToolbar.style.display = 'flex';
        resizeHandle.style.display = 'flex';
      });
      container.addEventListener('mouseleave', () => {
        // 如果正在拖拽，不隐藏
        if (!(doc.body.style.cursor === 'nwse-resize')) {
          sizeToolbar.style.display = 'none';
          resizeHandle.style.display = 'none';
        }
      });
    };
    reader.readAsDataURL(file);
  });

  // Delete on backspace/delete when selected
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      container.remove();
    }
  });

  // Hover events for placeholder too
  container.addEventListener('mouseenter', () => {
    sizeToolbar.style.display = 'none'; // No toolbar until image loaded
    resizeHandle.style.display = 'none';
  });

  range.insertNode(container);
  range.collapse(false);
  sel.removeAllRanges();
}

// 为已保存 HTML 中的图片容器重新绑定交互事件
function bindImageInteractions(container: HTMLElement, doc: Document) {
  const imageContainers = container.querySelectorAll('.rich-image-container');
  imageContainers.forEach((ctr) => {
    if (ctr.querySelector('.rich-image-placeholder')) return; // 还未上传，跳过

    const img = ctr.querySelector('.rich-image') as HTMLImageElement | null;
    if (!img) return;

    // 确保已存在或创建尺寸工具栏
    let sizeToolbar = ctr.querySelector('.rich-image-toolbar') as HTMLElement | null;
    if (!sizeToolbar) {
      sizeToolbar = doc.createElement('div');
      sizeToolbar.className = 'rich-image-toolbar';
      IMAGE_SIZE_PRESETS.forEach((preset) => {
        const btn = doc.createElement('button');
        btn.textContent = preset.label;
        btn.className = 'rich-image-size-btn';
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); });
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (img) {
            setImageSize(img, preset.width);
            // 尺寸变更 → 通知编辑器状态更新
            container.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
        sizeToolbar!.appendChild(btn);
      });
      ctr.appendChild(sizeToolbar);
    }

    // 确保已存在或创建缩放手柄
    let resizeHandle = ctr.querySelector('.rich-image-resize') as HTMLElement | null;
    if (!resizeHandle) {
      resizeHandle = doc.createElement('div');
      resizeHandle.className = 'rich-image-resize';
      resizeHandle.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" style="position:absolute;right:1px;bottom:1px;"><path d="M22 2L22 22L2 22"/></svg>';
      ctr.appendChild(resizeHandle);
    }

    // 确保已存在尺寸标签
    let sizeLabel = ctr.querySelector('.rich-image-size-label') as HTMLElement | null;
    if (!sizeLabel) {
      sizeLabel = doc.createElement('div');
      sizeLabel.className = 'rich-image-size-label';
      ctr.appendChild(sizeLabel);
    }

    // 检测 GIF 并确保徽章存在
    let gifBadge = ctr.querySelector('.rich-image-gif-badge') as HTMLElement | null;
    const isGif = img.src.startsWith('data:image/gif') || img.src.toLowerCase().endsWith('.gif');
    if (isGif) {
      if (!gifBadge) {
        gifBadge = doc.createElement('div');
        gifBadge.className = 'rich-image-gif-badge';
        gifBadge.style.cssText =
          'position:absolute;top:4px;right:4px;display:flex;align-items:center;gap:3px;padding:2px 7px;background:rgba(147,51,234,0.85);color:#fff;font-size:10px;font-weight:600;border-radius:4px;z-index:18;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.15);';
        gifBadge.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 10h2l-1 4"/><path d="M13 10l1 4"/><path d="M16 10v4"/></svg>GIF';
        ctr.appendChild(gifBadge);
      } else {
        gifBadge.style.display = 'flex';
      }
    }

    // 重新绑定鼠标事件
    ctr.addEventListener('mouseenter', () => {
      sizeToolbar && (sizeToolbar.style.display = 'flex');
      resizeHandle && (resizeHandle.style.display = 'flex');
    });
    ctr.addEventListener('mouseleave', () => {
      if (doc.body.style.cursor !== 'nwse-resize') {
        sizeToolbar && (sizeToolbar.style.display = 'none');
        resizeHandle && (resizeHandle.style.display = 'none');
      }
    });

    // 重新绑定拖拽缩放
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = (e as MouseEvent).clientX;
      const startW = img.offsetWidth;
      const startH = img.offsetHeight;
      sizeLabel && (sizeLabel.style.display = 'block');
      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const newW = Math.max(60, Math.min(1200, startW + dx));
        const ratio = startH / startW;
        img.style.width = newW + 'px';
        img.style.height = Math.round(newW * ratio) + 'px';
        sizeLabel && (sizeLabel.textContent = newW + 'px');
      };
      const onUp = () => {
        doc.removeEventListener('mousemove', onMove);
        doc.removeEventListener('mouseup', onUp);
        sizeLabel && (sizeLabel.style.display = 'none');
        // 缩放结束 → 通知编辑器状态更新
        container.dispatchEvent(new Event('input', { bubbles: true }));
      };
      doc.addEventListener('mousemove', onMove);
      doc.addEventListener('mouseup', onUp);
    });

    // 删除快捷键
    const el = ctr as HTMLElement;
    el.addEventListener('keydown', (e) => {
      const ke = e as unknown as KeyboardEvent;
      if (ke.key === 'Backspace' || ke.key === 'Delete') {
        el.remove();
      }
    });
  });
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
        // 重新绑定图片交互（加载已保存内容时）
        requestAnimationFrame(() => {
          if (editorRef.current) {
            bindImageInteractions(editorRef.current, document);
          }
        });
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
    // 先聚焦编辑器再插入，防止 toolbar 按钮偷走 selection
    editorRef.current?.focus();
    // 延迟一帧确保 focus 生效
    requestAnimationFrame(() => {
      insertImagePlaceholder(document, editorRef.current);
      handleInput();
    });
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
