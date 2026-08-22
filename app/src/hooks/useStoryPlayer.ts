import { useState, useRef, useCallback, useEffect } from 'react';
import type { StoryLine, StoryScene, PlayerPhase, StoryChoice, StoryPlayData, StoryEffect } from '@/types';
import { apiGet } from '@/api/client';
import TEST_STORY from '@/data/testStory';

const TEXT_SPEED = 45; // ms per char
const NARRATOR_AUTO_ADVANCE = 2800; // ms
const CLICK_COOLDOWN = 150; // 防连点（原先 500ms 导致点击明显卡顿）

// 中文标点停顿时间倍率
const PUNCTUATION_DELAY_CHARS = new Set('，。！？、；：…—');

interface UseStoryPlayerOptions {
  storyId: string;
  onComplete: () => void;
}

interface PlayerState {
  phase: PlayerPhase;
  currentSceneIndex: number;
  currentLineIndex: number;
  displayedChars: number;
  leftImage: string | null;
  rightImage: string | null;
  isNarrator: boolean;
  choices: StoryChoice[];
  leftSpeaking: boolean;
  rightSpeaking: boolean;
  effect: StoryEffect;
}

export function useStoryPlayer({ storyId, onComplete }: UseStoryPlayerOptions) {
  const [playData, setPlayData] = useState<StoryPlayData | null>(null);
  const [state, setState] = useState<PlayerState>({
    phase: 'loading',
    currentSceneIndex: 0,
    // currentLineIndex = 当前正在显示的行索引；-1 表示尚未开播（首行由自动 advance 播放）
    currentLineIndex: -1,
    displayedChars: 0,
    leftImage: null,
    rightImage: null,
    isNarrator: false,
    choices: [],
    leftSpeaking: false,
    rightSpeaking: false,
    effect: 'none',
  });

  // Typing timer ref
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const narratorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickRef = useRef(0);
  const isProcessingRef = useRef(false);
  // 当前正在显示的行（避免用 currentLineIndex-1 取错行导致的闪烁/加载不全）
  const currentLineRef = useRef<StoryLine | null>(null);
  // 用 ref 解耦 startTyping <-> advance 的循环 useCallback 依赖
  const startTypingRef = useRef<(text: string, isNarrator: boolean) => void>(() => {});
  const advanceRef = useRef<(nextIndexOverride?: number) => void>(() => {});

  // Load story data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (storyId === '__test__') {
          if (!cancelled) {
            setPlayData(TEST_STORY);
            setState(s => ({ ...s, phase: 'idle' }));
          }
          return;
        }
        const data = await apiGet<StoryPlayData>(`/stories/${storyId}/play`);
        if (!cancelled) {
          setPlayData(data);
          setState(s => ({ ...s, phase: 'idle' }));
        }
      } catch (err) {
        console.error('加载剧情失败:', err);
        if (!cancelled) setState(s => ({ ...s, phase: 'ending' }));
      }
    })();
    return () => { cancelled = true; };
  }, [storyId]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (narratorTimerRef.current) clearTimeout(narratorTimerRef.current);
    };
  }, []);

  // Stop all timers
  const clearTimers = useCallback(() => {
    if (typingTimerRef.current) { clearTimeout(typingTimerRef.current); typingTimerRef.current = null; }
    if (narratorTimerRef.current) { clearTimeout(narratorTimerRef.current); narratorTimerRef.current = null; }
  }, []);

  // Get current line
  const getCurrentLine = useCallback((): StoryLine | null => {
    if (!playData) return null;
    if (state.currentLineIndex < 0 || state.currentLineIndex >= playData.lines.length) return null;
    return playData.lines[state.currentLineIndex];
  }, [playData, state.currentLineIndex]);

  // Get current scene
  const getCurrentScene = useCallback((): StoryScene | null => {
    if (!playData) return null;
    const line = getCurrentLine();
    if (!line) return playData.scenes[state.currentSceneIndex] || null;
    const scene = playData.scenes.find(s => s.id === line.sceneId);
    return scene || null;
  }, [playData, state.currentSceneIndex, getCurrentLine]);

  // Typewriter effect
  const startTyping = useCallback((text: string, isNarrator: boolean) => {
    clearTimers();
    let charIndex = 0;
    const totalChars = text.length;
    setState(s => ({ ...s, phase: 'typing', displayedChars: 0, isNarrator }));

    const typeNext = () => {
      if (charIndex >= totalChars) {
        setState(s => ({ ...s, phase: 'waiting', displayedChars: totalChars }));
        if (isNarrator) {
          narratorTimerRef.current = setTimeout(() => advanceRef.current(), NARRATOR_AUTO_ADVANCE);
        }
        return;
      }
      const chunkSize = Math.random() < 0.3 ? 2 : 1;
      charIndex = Math.min(charIndex + chunkSize, totalChars);
      setState(s => ({ ...s, displayedChars: charIndex }));
      const lastChar = text.charAt(charIndex - 1);
      let delay = TEXT_SPEED;
      if (PUNCTUATION_DELAY_CHARS.has(lastChar)) delay = TEXT_SPEED * 3.5;
      else if (lastChar === '\n') delay = TEXT_SPEED * 4;
      typingTimerRef.current = setTimeout(typeNext, delay);
    };
    typingTimerRef.current = setTimeout(typeNext, TEXT_SPEED);
  }, [clearTimers]);

  // Finish typing immediately
  const completeTyping = useCallback(() => {
    const line = currentLineRef.current;
    if (!line) return;
    clearTimers();
    const isNarr = line.speaker === 'narrator';
    setState(s => ({
      ...s,
      phase: 'waiting',
      displayedChars: line.text.length,
      isNarrator: isNarr,
    }));
    if (isNarr) {
      narratorTimerRef.current = setTimeout(() => advanceRef.current(), NARRATOR_AUTO_ADVANCE);
    }
  }, [clearTimers]);

  // Advance to next line (nextIndexOverride 用于分支跳转）
  const advance = useCallback((nextIndexOverride?: number) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    clearTimers();

    if (!playData) {
      isProcessingRef.current = false;
      return;
    }

    // 默认播完当前行后推进到下一行；首屏（-1）播第 0 行；分支用 override 直接跳转
    const nextIndex = nextIndexOverride ?? state.currentLineIndex + 1;
    if (nextIndex >= playData.lines.length) {
      setState(s => ({ ...s, phase: 'ending' }));
      isProcessingRef.current = false;
      onComplete();
      return;
    }
    if (nextIndex < 0) {
      isProcessingRef.current = false;
      return;
    }

    const line = playData.lines[nextIndex];

    // Check for scene change
    let nextSceneIndex = state.currentSceneIndex;
    const lineScene = playData.scenes.find(s => s.id === line.sceneId);
    if (lineScene) {
      const sceneIdx = playData.scenes.findIndex(s => s.id === line.sceneId);
      if (sceneIdx >= 0) nextSceneIndex = sceneIdx;
    }

    // Determine sprite states
    const leftImg = line.leftImage ?? state.leftImage;
    const rightImg = line.rightImage ?? state.rightImage;
    const leftSpeaking = line.speaker === 'left';
    const rightSpeaking = line.speaker === 'right';

    currentLineRef.current = line;

    const isNarr = line.speaker === 'narrator';
    // 首屏：第一条旁白（> [Confidential] █████████ LOG）直接完整显示在屏幕中央，随后自动推进
    const instantFull = isNarr && nextIndex === 0;

    // 行索引与 displayedChars 原子更新，避免“新行+旧字数”错位导致的闪烁/加载不全
    setState(s => ({
      ...s,
      currentSceneIndex: nextSceneIndex,
      currentLineIndex: nextIndex,
      displayedChars: instantFull ? line.text.length : 0,
      leftImage: leftImg,
      rightImage: rightImg,
      leftSpeaking,
      rightSpeaking,
      isNarrator: isNarr,
      phase: instantFull ? 'waiting' : 'typing',
      effect: line.effect || 'none',
    }));

    if (instantFull) {
      // LOG 行保持当前索引，定时自动推进到下一行
      narratorTimerRef.current = setTimeout(() => advanceRef.current(), NARRATOR_AUTO_ADVANCE);
    } else {
      // 同步启动打字，避免延迟窗口期内的点击/渲染错乱
      startTypingRef.current(line.text, isNarr);
    }

    setTimeout(() => { isProcessingRef.current = false; }, 50);
  }, [playData, state, clearTimers, onComplete]);

  // 保持 refs 指向最新的实现
  startTypingRef.current = startTyping;
  advanceRef.current = advance;

  // 数据加载完成后自动开始播放第一句（无需点击）
  useEffect(() => {
    if (state.phase === 'idle' && playData) {
      advance();
    }
  }, [state.phase, playData, advance]);

  // Handle click / key press
  const handleClick = useCallback(() => {
    const now = Date.now();
    if (isProcessingRef.current) return;

    // Script ended
    if (state.phase === 'ending') return;

    if (now - lastClickRef.current < CLICK_COOLDOWN) return;
    lastClickRef.current = now;

    // Initial click to start (fallback：自动播放失效时的兜底)
    if (state.phase === 'idle') {
      advance();
      return;
    }

    // Typing → complete
    if (state.phase === 'typing') {
      completeTyping();
      return;
    }

    // Waiting → advance
    if (state.phase === 'waiting') {
      clearTimers();
      setState(s => ({ ...s, effect: 'none' }));
      advance();
      return;
    }

    // Choosing - handled by choice click
  }, [state.phase, advance, completeTyping, clearTimers]);

  // Choose option
  const chooseOption = useCallback((choice: StoryChoice) => {
    if (!playData) return;
    // Find the line with the target order
    const targetLine = playData.lines.find(l => l.order === choice.targetLineOrder);
    if (targetLine) {
      const idx = playData.lines.findIndex(l => l.id === targetLine.id);
      if (idx >= 0) {
        setState(s => ({ ...s, phase: 'waiting', choices: [], effect: 'none' }));
        advance(idx);
      }
    }
  }, [playData, advance]);

  // Skip to line index
  const skipTo = useCallback((index: number) => {
    if (!playData) return;
    clearTimers();
    const clampedIndex = Math.max(0, Math.min(index, playData.lines.length));
    setState(s => ({
      ...s,
      currentLineIndex: clampedIndex,
      phase: 'waiting',
      displayedChars: 0,
      isNarrator: false,
      choices: [],
      effect: 'none',
    }));
    isProcessingRef.current = false;
  }, [playData, clearTimers]);

  return {
    playData,
    state,
    currentLine: getCurrentLine(),
    currentScene: getCurrentScene(),
    handleClick,
    chooseOption,
    skipTo,
  };
}
