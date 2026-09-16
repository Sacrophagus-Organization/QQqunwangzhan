import { useEffect, useRef, useState } from 'react';
import { FileWarning, Loader2 } from 'lucide-react';
import { apiBlobUrl } from '../api/client';

/**
 * 纸质化论文阅读器：带鉴权加载服务器端预渲染的 PDF 页面图片（论文接口要求登录，
 * <img> 无法携带 Authorization header，故用 fetch + blob 加载后转为 objectURL），
 * 以「泛黄纸张钉在木板上」的质感呈现，与谜题页整体风格一致。
 * 浏览器端不解析 PDF，兼容所有现代浏览器。
 */
export default function PdfPaperViewer({ pages }: { pages: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [hasError, setHasError] = useState(false);
  const createdUrls = useRef<string[]>([]);

  useEffect(() => {
    let alive = true;
    createdUrls.current.forEach((u) => URL.revokeObjectURL(u));
    createdUrls.current = [];
    setUrls([]);
    setHasError(false);

    (async () => {
      const got: string[] = [];
      for (const src of pages) {
        try {
          got.push(await apiBlobUrl(src));
          if (!alive) break;
        } catch {
          if (alive) setHasError(true);
          break;
        }
      }
      if (alive) {
        createdUrls.current = got;
        setUrls(got);
      }
    })();

    return () => {
      alive = false;
      createdUrls.current.forEach((u) => URL.revokeObjectURL(u));
      createdUrls.current = [];
    };
  }, [pages]);

  const pending = urls.length === 0 && !hasError;

  return (
    <div className="loop-wood-bg relative min-h-0 flex-1 overflow-y-auto">
      <div className="loop-wood-vignette pointer-events-none absolute inset-0" />
      <div className="relative flex flex-col items-center gap-8 px-4 py-8 sm:px-8">
        {pending && (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#E5C98A]" />
            <p className="font-mono text-[11px] tracking-[0.35em] text-[#C9A87C]">
              LOADING PAPER …
            </p>
          </div>
        )}
        {hasError && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FileWarning className="h-8 w-8 text-[#C96A4A]" />
            <p className="font-mono text-xs tracking-widest text-[#E5C98A]">
              论文加载失败，请稍后重试
            </p>
          </div>
        )}
        {urls.map((src, idx) => (
          <div
            key={src}
            className={`loop-paper-card relative w-full max-w-[900px] p-2 sm:p-3 ${
              idx % 2 === 0 ? 'rotate-[-0.4deg]' : 'rotate-[0.4deg]'
            }`}
          >
            <span className="loop-pushpin absolute -top-3 left-1/2 -translate-x-1/2" />
            <img
              src={src}
              alt={`论文第 ${idx + 1} 页`}
              className="h-auto w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
