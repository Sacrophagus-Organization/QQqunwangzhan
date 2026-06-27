import { useState, useCallback, useRef } from 'react';
import { AlertTriangle, Bug, Zap } from 'lucide-react';
import SystemCrashOverlay, { playButtonError } from '@/components/SystemCrashOverlay';

/* ═══════════════════════════════════════
   Button Jam — 按钮文字随机乱码
   ═══════════════════════════════════════ */

const JAM_SEQUENCE = [
  '提交答案',
  '提?答案',
  '??#??',
  'SYN_ERR',
  'SYS.BREAK',
];

const JAM_INTERVALS = [120, 100, 80, 60];

export default function TestPage() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [buttonJammed, setButtonJammed] = useState(false);
  const [jamTextIndex, setJamTextIndex] = useState(0);
  const jamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = useCallback(() => {
    if (buttonJammed || showOverlay) return;

    // 🔴 Play harsh error sound immediately on click
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
        // Done jamming → launch overlay
        if (jamTimerRef.current) clearTimeout(jamTimerRef.current);
        jamTimerRef.current = setTimeout(() => {
          setShowOverlay(true);
        }, 200);
      }
    };
    runJam();
  }, [buttonJammed, showOverlay]);

  const handleComplete = useCallback(() => {
    // Auth token cleared by SystemCrashOverlay before redirect
    window.location.href = '/login';
  }, []);

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-6">
      {/* Test environment card */}
      <div className="w-full max-w-lg">
        <div className="card-elevated p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Bug className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-semibold text-foreground">
                系统崩溃特效测试
              </h2>
              <p className="text-xs text-muted-foreground">System Crash Transition Demo</p>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="flex items-start gap-3 mb-6 p-4 rounded-lg bg-red-500/5 border border-red-500/15">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-300/80 leading-relaxed">
              <p className="font-semibold mb-1">⚠ 测试警告</p>
              <p>
                点击下方按钮将触发全屏崩溃转场特效动画（约 9 秒），
                动画结束后将自动跳转至登录页面。
                请在安静环境中体验，建议佩戴耳机。时长约 18 秒。
              </p>
            </div>
          </div>

          {/* Tech Specs */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/30 text-center">
              <div className="text-lg font-mono text-primary mb-1">~18s</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/30 text-center">
              <div className="text-lg font-mono text-amber-400 mb-1">4</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Phases</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/30 text-center">
              <div className="text-lg font-mono text-red-400 mb-1">ON</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Audio</div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={buttonJammed}
              className={`
                relative group
                px-10 py-4 rounded-lg font-heading font-semibold text-lg
                transition-all duration-300
                ${buttonJammed
                  ? 'crash-button-jitter bg-red-900/60 border border-red-500/40 text-red-300 cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:scale-95'
                }
              `}
            >
              {buttonJammed ? (
                <span className="font-mono tracking-widest">{JAM_SEQUENCE[jamTextIndex]}</span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  提交答案
                </span>
              )}
            </button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground/50 mt-4">
            This is a demo page for future puzzle transition effect testing.
          </p>
        </div>
      </div>

      {/* Crash Overlay */}
      <SystemCrashOverlay
        trigger={showOverlay}
        onComplete={handleComplete}
      />
    </div>
  );
}
