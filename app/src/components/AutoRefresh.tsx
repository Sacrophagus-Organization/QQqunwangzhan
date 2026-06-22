import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const POLL_INTERVAL = 5 * 60 * 1000; // 5分钟轮询
const AUTO_RELOAD_DELAY = 10; // 10秒倒计时

export function AutoRefresh() {
  const versionRef = useRef<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_RELOAD_DELAY);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissedRef = useRef(false);

  // 启动时记录当前版本，之后定时检查
  useEffect(() => {
    const check = async () => {
      if (dismissedRef.current) return;
      try {
        const res = await fetch('/version.json?t=' + Date.now(), {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!versionRef.current) {
          // 首次加载，记录版本
          versionRef.current = data.version;
        } else if (versionRef.current !== data.version) {
          // 版本变化！
          setUpdateAvailable(true);
        }
      } catch {
        // 忽略网络错误
      }
    };

    check(); // 立即检查
    const interval = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // 倒计时自动刷新
  useEffect(() => {
    if (!updateAvailable) return;
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [updateAvailable]);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] animate-fade-in-up">
      <div className="flex items-center gap-3 bg-card border border-primary/30 rounded-lg px-4 py-3 shadow-lg shadow-primary/10 backdrop-blur-md">
        <RefreshCw className="h-4 w-4 text-primary animate-spin" />
        <span className="text-sm text-foreground">
          网站已更新，<span className="text-primary font-medium">{countdown}s</span> 后自动刷新
        </span>
        <button
          className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded font-medium hover:bg-primary/80 transition-colors"
          onClick={() => window.location.reload()}
        >
          立即刷新
        </button>
        <button
          className="text-xs text-muted-foreground hover:text-foreground px-1"
          onClick={() => {
            dismissedRef.current = true;
            setUpdateAvailable(false);
            if (timerRef.current) clearInterval(timerRef.current);
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
