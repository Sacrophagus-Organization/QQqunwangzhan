import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Check,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  LockOpen,
} from 'lucide-react';
import { apiGet, apiPost } from '@/api/client';
import { renderMarkdown } from '@/lib/markdown';
import { sanitizeHtml } from '@/lib/sanitize';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PdfPaperViewer from '@/components/PdfPaperViewer';

interface LoopAppendixDTO {
  key: string;
  title: string;
  subtitle: string;
  unlocked: boolean;
  content?: string;
  pages?: string[];
}

interface LoopPaperDTO {
  title: string;
  titleEn: string;
  abstract: string;
  keywords: string;
}

interface Node6Response {
  paper: LoopPaperDTO;
  appendices: LoopAppendixDTO[];
}

interface UnlockResponse {
  correct: boolean;
  pages?: string[];
}

// 每张附录卡的轻微倾斜角度（模拟随手钉上的质感）
const TILTS = [
  '-rotate-2',
  'rotate-1.5',
  '-rotate-1',
  'rotate-2',
  '-rotate-1.5',
  'rotate-1',
  'rotate-2',
  '-rotate-1',
  'rotate-1.5',
  '-rotate-2',
  'rotate-1',
];

// 服务器端预渲染的论文页面图片（7 页正文，无附录）
const PAPER_PAGES = Array.from({ length: 7 }, (_, i) => `/loop6/paper/pages/${i + 1}.png`);

export default function LoopNode6Board() {
  const navigate = useNavigate();
  const [data, setData] = useState<Node6Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 密码解锁状态
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [shake, setShake] = useState(false);

  // 内容阅读
  const [readingKey, setReadingKey] = useState<string | null>(null);
  // 论文网页版阅读模态框
  const [readerOpen, setReaderOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiGet<Node6Response>('/loop/node6');
        if (alive) setData(res);
      } catch (e: any) {
        if (alive) setError(e?.message || '线索板加载失败');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const activeAppendix = useMemo(
    () => (data ? data.appendices.find((a) => a.key === activeKey) : undefined),
    [data, activeKey]
  );
  const readingAppendix = useMemo(
    () => (data ? data.appendices.find((a) => a.key === readingKey) : undefined),
    [data, readingKey]
  );
  const unlockedCount = useMemo(
    () => (data ? data.appendices.filter((a) => a.unlocked).length : 0),
    [data]
  );

  const handleCardClick = (a: LoopAppendixDTO) => {
    if (a.unlocked) {
      setReadingKey(a.key);
    } else {
      setActiveKey(a.key);
      setPassword('');
      setUnlockError('');
    }
  };

  const handleUnlock = async () => {
    if (!activeKey || !password.trim()) return;
    setSubmitting(true);
    setUnlockError('');
    try {
      const res = await apiPost<UnlockResponse>('/loop/node6/unlock', {
        appendix: activeKey,
        password: password.trim(),
      });
      if (res.correct) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                appendices: prev.appendices.map((a) =>
                  a.key === activeKey
                    ? { ...a, unlocked: true, pages: res.pages || [] }
                    : a
                ),
              }
            : prev
        );
        setActiveKey(null);
      } else {
        setUnlockError('密钥无效，请再试一次。');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (e: any) {
      setUnlockError(e?.message || '解锁请求失败，请稍后再试。');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loop-wood-bg flex min-h-screen items-center justify-center">
        <div className="loop-wood-vignette pointer-events-none absolute inset-0" />
        <div className="relative flex items-center gap-3 text-amber-100/80">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-mono text-sm tracking-widest">LOADING BOARD…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="loop-wood-bg flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="loop-wood-vignette pointer-events-none absolute inset-0" />
        <p className="relative font-mono text-sm text-red-300">{error || '数据不存在'}</p>
        <Button variant="outline" className="relative mt-6 border-[#6B4525] bg-[#3C2C1B] text-amber-100 hover:bg-[#4A3722]" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> 返回
        </Button>
      </div>
    );
  }

  const renderAppendixCard = (a: LoopAppendixDTO, idx: number) => {
    const unlocked = a.unlocked;
    return (
      <button
        key={a.key}
        onClick={() => handleCardClick(a)}
        className={`group relative flex flex-col p-6 pb-7 text-left transition-all duration-300 ${TILTS[idx]} ${
          unlocked
            ? 'loop-paper-card hover:z-20 hover:rotate-0 hover:shadow-[0_14px_30px_rgba(40,20,4,0.65)]'
            : 'loop-locked-card hover:z-20 hover:rotate-0 hover:shadow-[0_14px_30px_rgba(20,10,2,0.7)]'
        }`}
      >
        {/* 图钉 */}
        <span
          className={`loop-pushpin absolute -top-3 left-1/2 -translate-x-1/2 ${
            unlocked ? 'loop-pushpin-live' : 'loop-pushpin-dim'
          }`}
        />

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`font-mono text-xs tracking-widest ${unlocked ? 'text-[#8C6B3F]/80' : 'text-[#8A7C68]/70'}`}>
              附录 {a.key}
            </p>
            <h3
              className={`mt-1 font-serif text-lg font-semibold leading-snug ${
                unlocked ? 'text-[#3A2F1B]' : 'text-[#CBBBA0]'
              }`}
            >
              {a.title}
            </h3>
          </div>
          {unlocked ? (
            <LockOpen className="mt-1 h-4 w-4 shrink-0 text-[#8C6B3F]" />
          ) : (
            <Lock className="mt-1 h-4 w-4 shrink-0 text-[#8A7C68]" />
          )}
        </div>

        <p
          className={`mt-3 font-mono text-xs leading-relaxed ${
            unlocked ? 'text-[#6B563A]' : 'text-[#8A7C68]'
          }`}
        >
          {a.subtitle}
        </p>

        {unlocked && (
          <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#8C6B3F]">
            <Check className="h-3.5 w-3.5" /> 已解锁 · 点击阅读
          </span>
        )}
        {!unlocked && (
          <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-[#8A7C68] group-hover:text-amber-200/80">
            <KeyRound className="h-3.5 w-3.5" /> 需要密钥
          </span>
        )}
      </button>
    );
  };

  // 动态划分：左列前 4 张、右列后 4 张、底部剩余（移动端自上而下依序排列）
  const left = data.appendices.slice(0, 4);
  const right = data.appendices.slice(4, 8);
  const bottom = data.appendices.slice(8);

  return (
    <div className="loop-wood-bg relative min-h-screen overflow-hidden">
      {/* 木板纵深暗角 + 高光 */}
      <div className="loop-wood-vignette pointer-events-none absolute inset-0" />
      <div className="loop-wood-sheen pointer-events-none absolute inset-0" />

      {/* 顶部栏：木质横梁 */}
      <header className="relative z-10 flex items-center justify-between border-b border-black/40 bg-[#3C2C1B]/85 px-5 py-4 shadow-[0_4px_18px_rgba(20,8,2,0.55)] backdrop-blur-sm">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 font-mono text-xs tracking-widest text-[#CBBBA0] transition-colors hover:text-amber-200"
        >
          <ArrowLeft className="h-4 w-4" /> 返回
        </button>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#6B4525] bg-[#4A3722] px-3 py-1 font-mono text-xs text-amber-100 shadow-inner">
          <LockOpen className="h-3.5 w-3.5 text-[#E5C98A]" />
          已解锁 {unlockedCount} / {data.appendices.length}
        </span>
      </header>

      {/* 主区域：论文大卡居中，附录卡环绕 */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 lg:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-6">
          {/* 左列附录 */}
          <div className="order-2 flex flex-col gap-8 lg:order-none lg:col-start-1 lg:gap-6">
            {left.map((a, i) => renderAppendixCard(a, i))}
          </div>

          {/* 论文大卡 */}
          <article className="order-first lg:col-start-2 lg:order-none">
            <div className="loop-thesis-card relative flex h-full flex-col p-8">
              <span className="loop-pushpin absolute -top-3 left-1/2 -translate-x-1/2" />
              <p className="font-mono text-[11px] tracking-[0.35em] text-[#A07040]">
                LOOP — NODE VI
              </p>
              <h2 className="mt-4 font-serif text-2xl font-bold leading-snug text-[#3A2A14] lg:text-[28px]">
                {data.paper.title}
              </h2>
              <p className="mt-2 font-mono text-xs leading-relaxed text-[#6B563A]">
                {data.paper.titleEn}
              </p>

              <div className="mt-6 border-t border-[#D8C191] pt-5">
                <p className="font-mono text-[11px] tracking-widest text-[#A07040]">摘要</p>
                <p className="mt-2 text-sm leading-relaxed text-[#4A3620]">
                  {data.paper.abstract}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {data.paper.keywords
                  .split('；')
                  .filter(Boolean)
                  .map((k) => (
                    <span
                      key={k}
                      className="rounded-full border border-[#C8A878] bg-[#EAD9B2] px-2.5 py-1 font-mono text-[11px] text-[#6B4420]"
                    >
                      {k}
                    </span>
                  ))}
              </div>

              <div className="mt-8">
                <Button
                  onClick={() => setReaderOpen(true)}
                  className="w-full bg-[#8A5C30] text-[#F7EFDC] hover:bg-[#A07040]"
                >
                  <BookOpen className="h-4 w-4" /> 在线阅读
                </Button>
              </div>

              <p className="mt-6 text-center font-mono text-[11px] tracking-[0.25em] text-[#8A7C68]">
                TAP A PINNED NOTE TO UNLOCK
              </p>
            </div>
          </article>

          {/* 右列附录 */}
          <div className="order-3 flex flex-col gap-8 lg:order-none lg:col-start-3 lg:gap-6">
            {right.map((a, i) => renderAppendixCard(a, i + 4))}
          </div>

          {/* 底部附录 */}
          <div className="order-4 flex flex-col gap-8 lg:col-span-3 lg:flex-row lg:flex-wrap lg:items-start lg:justify-center lg:gap-6">
            {bottom.map((a, i) => renderAppendixCard(a, i + 8))}
          </div>
        </div>
      </main>

      {/* 密码解锁 Dialog：深色木桌 */}
      <Dialog
        open={!!activeKey}
        onOpenChange={(open) => {
          if (!open) setActiveKey(null);
        }}
      >
        <DialogContent
          className={`max-w-md border-[#4A3622] bg-[#241A0E] text-[#E8D5B0] ${shake ? 'animate-loop-shake' : ''}`}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-[#E5C98A]">
              <KeyRound className="h-4 w-4" /> 解锁附录 {activeAppendix?.key}
            </DialogTitle>
            <DialogDescription className="text-[#B39C78]">
              {activeAppendix?.title} — 请输入密钥。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="PASSWORD"
              autoFocus
              className="border-[#4A3622] bg-[#1A1208] font-mono text-amber-100 placeholder:text-[#7A664C] focus-visible:border-[#C8A878] focus-visible:ring-[#C8A878]/30"
            />
            {unlockError && (
              <p className="font-mono text-xs text-red-300">{unlockError}</p>
            )}
            <Button
              onClick={handleUnlock}
              disabled={submitting || !password.trim()}
              className="w-full bg-[#8A5C30] text-[#F7EFDC] hover:bg-[#A07040]"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LockOpen className="h-4 w-4" />
              )}
              解锁
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 内容阅读 Dialog：纸张上阅读 */}
      <Dialog
        open={!!readingAppendix}
        onOpenChange={(open) => {
          if (!open) setReadingKey(null);
        }}
      >
        <DialogContent className="loop-paper-card max-w-[min(1100px,calc(100vw-2rem))] border-[#C8A878] p-0 text-[#3A2F1B]">
          <div className="flex h-[85vh] flex-col">
            <div className="flex items-center justify-between border-b border-[#D8C191] px-5 py-3">
              <DialogHeader className="p-0">
                <DialogTitle className="font-serif text-[#3A2A14]">
                  附录 {readingAppendix?.key} · {readingAppendix?.title}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 text-[#6B563A]">
                  <FileText className="h-3.5 w-3.5" /> 已解锁文件内容
                </DialogDescription>
              </DialogHeader>
            </div>
            {readingAppendix?.pages?.length ? (
              <PdfPaperViewer pages={readingAppendix.pages} />
            ) : (
              <div
                className="markdown-content markdown-paper max-h-[60vh] overflow-y-auto p-5 text-sm leading-relaxed text-[#4A3620]"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(renderMarkdown(readingAppendix?.content || '')),
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 论文网页版阅读模态框 */}
      <Dialog open={readerOpen} onOpenChange={setReaderOpen}>
        <DialogContent
          showCloseButton
          className="max-w-[calc(100vw-2rem)] border-[#4A3622] bg-[#1A1208] p-0 sm:max-w-[1000px]"
        >
          <div className="flex h-[82vh] flex-col">
            <div className="flex items-center justify-between border-b border-[#3C2C1B] px-5 py-3">
              <p className="font-mono text-xs tracking-widest text-[#E5C98A]">
                LOOP — NODE VI
              </p>
            </div>
            <PdfPaperViewer pages={PAPER_PAGES} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
