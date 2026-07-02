import { useState, useCallback, useRef } from 'react';
import { AlertTriangle, Bug, Zap, Play } from 'lucide-react';
import SystemCrashOverlay, { playButtonError } from '@/components/SystemCrashOverlay';
import StoryPlayer from '@/components/StoryPlayer';

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

  // Story player state
  const [showStoryPlayer, setShowStoryPlayer] = useState(false);

  const handleSubmit = useCallback(() => {
    if (buttonJammed || showOverlay) return;

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
        // Done jamming → launch overlay
        if (jamTimerRef.current) clearTimeout(jamTimerRef.current);
        jamTimerRef.current = setTimeout(() => {
          setShowOverlay(true);
        }, 200);
      }
    };
    runJam();
  }, [buttonJammed, showOverlay]);

  const handleCrashComplete = useCallback(() => {
    window.location.href = '/login';
  }, []);

  const handleStoryComplete = useCallback(() => {
    setShowStoryPlayer(false);
  }, []);

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center p-6 gap-8">
      {/* ── 第一张卡片：崩溃特效测试 ── */}
      <div className="w-full max-w-lg">
        <div className="card-elevated p-8">
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

          <div className="flex items-start gap-3 mb-6 p-4 rounded-lg bg-red-500/5 border border-red-500/15">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-300/80 leading-relaxed">
              <p className="font-semibold mb-1">警告</p>
              <p>点击下方按钮将触发全屏崩溃转场特效动画（约18秒），动画结束后自动跳转至登录页面。</p>
            </div>
          </div>

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
        </div>
      </div>

      {/* ── 第二张卡片：剧情播放器测试 ── */}
      <div className="w-full max-w-lg">
        <div className="card-elevated p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-semibold text-foreground">
                剧情播放器测试
              </h2>
              <p className="text-xs text-muted-foreground">Visual Novel Player Demo</p>
            </div>
          </div>

          <div className="flex items-start gap-3 mb-6 p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/15">
            <AlertTriangle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-indigo-300/80 leading-relaxed">
              <p className="font-semibold mb-1">测试剧本：明日方舟·孤星</p>
              <p>
                点击下方按钮将启动全屏剧情播放器，播放凯尔希与普瑞赛斯的对峙片段。
                点击屏幕任意位置推进对话，支持键盘（空格/回车/方向键）操作。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/30 text-center">
              <div className="text-lg font-mono text-indigo-400 mb-1">27</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">台词数</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/30 text-center">
              <div className="text-lg font-mono text-amber-400 mb-1">3</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">角色</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/30 text-center">
              <div className="text-lg font-mono text-indigo-400 mb-1">1</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">场景</div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setShowStoryPlayer(true)}
              className="relative group px-10 py-4 rounded-lg font-heading font-semibold text-lg bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                播放测试剧情
              </span>
            </button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground/50 mt-4">
            StoryPlayer Core — 内嵌测试剧本，无需后端即可完整运行
          </p>
        </div>
      </div>

      {/* Crash Overlay */}
      <SystemCrashOverlay
        trigger={showOverlay}
        onComplete={handleCrashComplete}
      />

      {/* Story Player */}
      {showStoryPlayer && (
        <StoryPlayer
          storyId="__test__"
          onComplete={handleStoryComplete}
        />
      )}
    </div>
  );
}
