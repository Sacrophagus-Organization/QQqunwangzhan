import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// BGM track config
const MAIN_BGM = '/assets/audio/sarcophagus-bgm.mp3';
const EASTER_BGM = '/assets/audio/caidan.mp3';
const BGM_VOLUME = 0.15; // 低音量，不喧宾夺主
const LOOP_GAP_MS = 5000; // 循环间隔 5 秒
const FIRST_PLAY_DELAY = 3000; // 首次播放延迟，避免进入页面时突兀

// Voice greeting storage key
const WELCOME_KEY = 'ark_welcome_hour';

function playWelcomeVoice(): void {
  if (typeof speechSynthesis === 'undefined') return;

  const now = new Date();
  const currentHour = now.getHours();

  try {
    const lastHour = parseInt(localStorage.getItem(WELCOME_KEY) || '-1', 10);

    if (currentHour === lastHour) return;

    // 记录本小时已欢迎
    localStorage.setItem(WELCOME_KEY, String(currentHour));

    // 延迟 1 秒，等页面加载完毕再播
    setTimeout(() => {
      const utter = new SpeechSynthesisUtterance('Welcome back, Doctor.');
      utter.lang = 'en-US';
      utter.rate = 1.05;   // 稍快，广播播报节奏
      utter.pitch = 0.95;  // 略低沉，广播感而非面对面说话
      utter.volume = 0.5;

      // 优先选广播风格的英文女声
      const voices = speechSynthesis.getVoices();
      const broadcastVoice = voices.find(
        (v) => v.lang.startsWith('en') && (
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('moira') ||
          v.name.toLowerCase().includes('karen')
        )
      ) || voices.find(
        (v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')
      ) || voices.find(
        (v) => v.lang.startsWith('en-US')
      );
      if (broadcastVoice) {
        utter.voice = broadcastVoice;
      }

      speechSynthesis.speak(utter);
    }, 1000);
  } catch {
    // localStorage 不可用时静默失败
  }
}

export function BackgroundMusic() {
  const location = useLocation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSrcRef = useRef<string>('');
  const onEndedRef = useRef<(() => void) | null>(null);

  const isLoginPage = location.pathname === '/login';
  const isSarcophagusPage = location.pathname === '/sarcophagus';
  const isHomePage = location.pathname === '/';

  // 确定当前应该播放的音频源
  const targetSrc = (() => {
    if (isLoginPage) return '';
    if (isSarcophagusPage) return EASTER_BGM;
    return MAIN_BGM;
  })();

  // 带间隔的循环播放逻辑
  const playWithGap = useCallback((audio: HTMLAudioElement) => {
    audio.volume = BGM_VOLUME;
    audio.play().catch(() => {
      // 浏览器自动播放策略阻止，用户交互后会恢复
    });
  }, []);

  // 清理定时器
  const clearGapTimer = useCallback(() => {
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
    if (firstPlayTimerRef.current) {
      clearTimeout(firstPlayTimerRef.current);
      firstPlayTimerRef.current = null;
    }
  }, []);

  // 主 BGM 控制
  useEffect(() => {
    // 登录页：不播放
    if (isLoginPage || !targetSrc) {
      if (audioRef.current) {
        if (onEndedRef.current) {
          audioRef.current.removeEventListener('ended', onEndedRef.current);
          onEndedRef.current = null;
        }
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      clearGapTimer();
      currentSrcRef.current = '';
      return;
    }

    // 创建或复用 Audio 元素
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    // 如果音频源变了，切换源
    if (currentSrcRef.current !== targetSrc) {
      // 移除旧监听器
      if (onEndedRef.current) {
        audio.removeEventListener('ended', onEndedRef.current);
      }

      audio.src = targetSrc;
      audio.load();
      currentSrcRef.current = targetSrc;
      clearGapTimer();

      // 循环逻辑：每播完一次就等待 LOOP_GAP_MS 后重播
      const onEnded = () => {
        clearGapTimer();
        gapTimerRef.current = setTimeout(() => {
          if (audio.src && currentSrcRef.current === targetSrc) {
            audio.currentTime = 0;
            playWithGap(audio);
          }
        }, LOOP_GAP_MS);
      };
      onEndedRef.current = onEnded;
      audio.addEventListener('ended', onEnded);

      // 首次播放延迟，避免进入页面时突兀
      firstPlayTimerRef.current = setTimeout(() => {
        playWithGap(audio);
      }, FIRST_PLAY_DELAY);
    }

    return () => {
      clearGapTimer();
      if (onEndedRef.current) {
        audio.removeEventListener('ended', onEndedRef.current);
        onEndedRef.current = null;
      }
    };
  }, [targetSrc, isLoginPage, playWithGap, clearGapTimer]);

  // 首页每小时首次语音播报
  useEffect(() => {
    if (isHomePage) {
      // 确保 speechSynthesis voices 已加载
      if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.addEventListener('voiceschanged', () => playWelcomeVoice(), { once: true });
      } else {
        playWelcomeVoice();
      }
    }
  }, [isHomePage]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearGapTimer();
      if (audioRef.current) {
        if (onEndedRef.current) {
          audioRef.current.removeEventListener('ended', onEndedRef.current);
          onEndedRef.current = null;
        }
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        audioRef.current = null;
      }
    };
  }, [clearGapTimer]);

  // 该组件不渲染任何 UI
  return null;
}
