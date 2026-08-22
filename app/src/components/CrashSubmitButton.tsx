import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiPost } from '@/api/client';
import SystemCrashOverlay, {
  playButtonError,
  JAM_SEQUENCE,
  JAM_INTERVALS,
} from '@/components/SystemCrashOverlay';

/* ═══════════════════════════════════════
   CrashSubmitButton — 提交答案按钮
   点击后播放错误音效 → 按钮文字乱码 JAM → 触发全屏系统崩溃动画
   （与 /test 页面行为一致，供节点一谜题等"陷阱"按钮复用）

   触发过一次 glitch 后，服务端按账号记录封印状态（puzzle_progress 表），
   按钮变为 ◆ 菱形并禁用；仅管理员可解除封印（便于反复测试）。
   ═══════════════════════════════════════ */

interface CrashSubmitButtonProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  onComplete?: () => void;
  /** 谜题 id，用于记录封印状态（默认节点一） */
  puzzleId?: string;
  /** 当前账号是否已被封印（由服务端返回） */
  sealed?: boolean;
  /** 封印成功后回调（父组件可刷新列表） */
  onSealed?: () => void;
}

export default function CrashSubmitButton({
  label = '提交答案',
  className = '',
  size = 'sm',
  onComplete,
  puzzleId = 'puz-loop-node1',
  sealed = false,
  onSealed,
}: CrashSubmitButtonProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [buttonJammed, setButtonJammed] = useState(false);
  const [jamTextIndex, setJamTextIndex] = useState(0);
  const jamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 崩溃动画拉起后再异步记录封印状态：不阻塞"点击→立即崩溃"的反馈节奏
  const recordSeal = useCallback(async () => {
    try {
      await apiPost(`/puzzles/${puzzleId}/seal`);
      onSealed?.();
    } catch {
      // 封印记录失败不打断已触发的崩溃动画（下次点击可再次尝试）
    }
  }, [puzzleId, onSealed]);

  const handleSubmit = useCallback(async () => {
    if (sealed || buttonJammed || showOverlay) return;

    // Play harsh error sound immediately on click
    playButtonError();
    setButtonJammed(true);

    // Run jam sequence with accelerating intervals
    let currentStep = 0;
    const runJam = () => {
      if (currentStep < JAM_SEQUENCE.length) {
        setJamTextIndex(currentStep);
        currentStep++;
        const delay = JAM_INTERVALS[Math.min(currentStep - 1, JAM_INTERVALS.length - 1)];
        jamTimerRef.current = setTimeout(runJam, delay);
      } else {
        // Done jamming → launch overlay immediately, then record seal in background
        if (jamTimerRef.current) clearTimeout(jamTimerRef.current);
        jamTimerRef.current = setTimeout(() => {
          setShowOverlay(true);
          recordSeal();
        }, 200);
      }
    };
    runJam();
  }, [sealed, buttonJammed, showOverlay, recordSeal]);

  // 封印态仅在未播放崩溃动画时展示（崩溃期间若 sealed 已由后台落库变 true，
  // 仍保持 JAM 按钮 + 全屏动画，避免崩溃层被封印分支提前顶掉）
  const isSealedDisplay = sealed && !showOverlay;

  return (
    <>
      {isSealedDisplay ? (
        <Button
          size={size}
          className={`${className} crash-sealed-btn`}
          disabled
          variant="ghost"
          title="谜题已被封印，无法再次提交"
          aria-label="谜题已被封印"
        >
          <span className="crash-sealed-diamond">◆</span>
        </Button>
      ) : (
        <Button
          size={size}
          className={`${className} ${buttonJammed ? 'crash-button-jitter bg-red-900/60 border border-red-500/40 text-red-300 cursor-not-allowed' : ''}`}
          onClick={handleSubmit}
          disabled={buttonJammed}
          variant={buttonJammed ? 'destructive' : 'default'}
        >
          {buttonJammed ? (
            <span className="font-mono tracking-widest">{JAM_SEQUENCE[jamTextIndex]}</span>
          ) : (
            <span className="flex items-center gap-1">
              <Key className="h-4 w-4" />
              {label}
            </span>
          )}
        </Button>
      )}
      {/* 崩溃层需挂载到 body：卡片容器含 transform（tilt-3d 等），否则 fixed 定位会被包含块破坏。
          portal 挂在分支之外，确保任何封印状态下崩溃动画都能正常显示 */}
      {showOverlay && createPortal(
        <SystemCrashOverlay trigger={showOverlay} onComplete={onComplete} />,
        document.body,
      )}
    </>
  );
}
