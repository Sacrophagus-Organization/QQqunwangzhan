import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { createPortal } from 'react-dom';
import { apiDownload } from '@/api/client';
import { renderEmailBody } from '@/lib/mailBody';

interface EmailBodyProps {
  value?: string | null;
  className?: string;
}

interface PreviewImage {
  src: string;
  alt: string;
}

const downloadIconSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function wrapImagesInHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const match = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    const src = match?.[2] || '';
    const escapedSrc = escapeAttribute(src);
    return `<span class="email-image-wrap">${tag}<button type="button" class="email-image-download" data-src="${escapedSrc}" title="下载图片" aria-label="下载图片">${downloadIconSvg}</button></span>`;
  });
}

function clampScale(value: number): number {
  return Math.min(5, Math.max(0.2, value));
}

export default function EmailBody({ value, className = '' }: EmailBodyProps) {
  const [preview, setPreview] = useState<PreviewImage | null>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const scaleRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef(0);

  const html = wrapImagesInHtml(renderEmailBody(value));

  const downloadImage = useCallback(async (src: string) => {
    if (!src) return;
    const filename = src.split('/').pop()?.split('?')[0] || '邮件图片';
    try {
      await apiDownload(src, filename);
    } catch {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const openPreview = useCallback((src: string, alt: string) => {
    setPreview({ src, alt });
    setScale(1);
    setPos({ x: 0, y: 0 });
    setRotation(0);
    scaleRef.current = 1;
    posRef.current = { x: 0, y: 0 };
    rotationRef.current = 0;
    dragState.current.dragging = false;
  }, [dragState]);

  const closePreview = useCallback(() => {
    setPreview(null);
    setScale(1);
    setPos({ x: 0, y: 0 });
    setRotation(0);
    scaleRef.current = 1;
    posRef.current = { x: 0, y: 0 };
    rotationRef.current = 0;
    dragState.current.dragging = false;
  }, [dragState]);

  useEffect(() => {
    if (!preview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePreview();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [preview, closePreview]);

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const currentScale = scaleRef.current;
    const nextScale = clampScale(currentScale * factor);
    const currentPos = posRef.current;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const offsetX = (clientX - centerX - currentPos.x) / currentScale;
    const offsetY = (clientY - centerY - currentPos.y) / currentScale;
    const nextPos = {
      x: clientX - centerX - nextScale * offsetX,
      y: clientY - centerY - nextScale * offsetY,
    };
    scaleRef.current = nextScale;
    posRef.current = nextPos;
    setScale(nextScale);
    setPos(nextPos);
  }, []);

  const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const downloadButton = target.closest('.email-image-download') as HTMLElement | null;
    if (downloadButton) {
      event.preventDefault();
      event.stopPropagation();
      downloadImage(downloadButton.dataset.src || '');
      return;
    }

    const image = target.closest('img') as HTMLImageElement | null;
    if (image) {
      event.preventDefault();
      event.stopPropagation();
      openPreview(image.src, image.alt || '');
    }
  };

  const handlePreviewBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('img')) return;
    closePreview();
  };

  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    dragState.current.dragging = true;
    dragState.current.startX = event.clientX;
    dragState.current.startY = event.clientY;
    dragState.current.baseX = posRef.current.x;
    dragState.current.baseY = posRef.current.y;
  };

  const handlePreviewPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.dragging) return;
    const nextPos = {
      x: dragState.current.baseX + event.clientX - dragState.current.startX,
      y: dragState.current.baseY + event.clientY - dragState.current.startY,
    };
    posRef.current = nextPos;
    setPos(nextPos);
  };

  const handlePreviewPointerUp = () => {
    dragState.current.dragging = false;
  };

  const handlePreviewWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.1 : 0.9);
  };

  const rotateBy = (delta: number) => {
    const next = (rotationRef.current + delta) % 360;
    rotationRef.current = next;
    setRotation(next);
  };

  return (
    <>
      <div
        className={`markdown-content prose prose-invert prose-sm max-w-none text-sm leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handleContainerClick}
      />

      {createPortal(preview && (
        <div className="fixed inset-0 z-[80] bg-black/80">
          <div
            className="relative h-screen w-screen overflow-hidden"
            onClick={handlePreviewBackdropClick}
          >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="pointer-events-auto select-none"
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: dragState.current.dragging ? 'none' : 'transform 120ms ease-out',
                cursor: dragState.current.dragging ? 'grabbing' : 'grab',
              }}
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={handlePreviewPointerUp}
              onPointerLeave={handlePreviewPointerUp}
              onWheel={handlePreviewWheel}
            >
              <img
                src={preview.src}
                alt={preview.alt}
                draggable={false}
                className="h-auto max-h-[86vh] w-auto max-w-[86vw] object-contain"
              />
            </div>
          </div>

            <div className="absolute left-4 top-4 flex items-center gap-2">
              <button type="button" onClick={() => rotateBy(-90)} className="email-preview-control" title="向左旋转">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => rotateBy(90)} className="email-preview-control" title="向右旋转">
                <RotateCw className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.25)} className="email-preview-control" title="放大">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 0.8)} className="email-preview-control" title="缩小">
                <ZoomOut className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => { setScale(1); setPos({ x: 0, y: 0 }); setRotation(0); scaleRef.current = 1; posRef.current = { x: 0, y: 0 }; rotationRef.current = 0; }} className="email-preview-control" title="重置">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <button type="button" onClick={closePreview} className="email-preview-control absolute right-4 top-4" title="关闭">
              <X className="h-4 w-4" />
            </button>

            <button type="button" onClick={() => downloadImage(preview.src)} className="email-preview-control absolute bottom-4 right-4" title="下载图片">
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      ), document.body)}
    </>
  );
}


