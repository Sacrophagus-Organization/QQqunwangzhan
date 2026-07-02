import { useState, useRef, useCallback, useEffect } from 'react';
import type { StoryLine, StoryScene, PlayerPhase, StoryChoice, StoryPlayData, StoryEffect } from '@/types';
import { apiGet } from '@/api/client';
import TEST_STORY from '@/data/testStory';

const TEXT_SPEED = 45; // ms per char
const NARRATOR_AUTO_ADVANCE = 2800; // ms
const CLICK_COOLDOWN = 500;

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
    currentLineIndex: 0,
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
    if (state.currentLineIndex >= playData.lines.length) return null;
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
          narratorTimerRef.current = setTimeout(() => advance(), NARRATOR_AUTO_ADVANCE);
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
    if (!playData) return;
    const line = playData.lines[Math.max(0, state.currentLineIndex - 1)];
    if (!line) return;
    clearTimers();
    setState(s => ({
      ...s,
      phase: 'waiting',
      displayedChars: line.text.length,
    }));
    if (line.speaker === 'narrator') {
      narratorTimerRef.current = setTimeout(() => advance(), NARRATOR_AUTO_ADVANCE);
    }
  }, [playData, state.currentLineIndex, clearTimers]);

  // Advance to next line
  const advance = useCallback(() => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    clearTimers();

    if (!playData) {
      isProcessingRef.current = false;
      return;
    }

    const nextIndex = state.currentLineIndex;
    if (nextIndex >= playData.lines.length) {
      setState(s => ({ ...s, phase: 'ending' }));
      isProcessingRef.current = false;
      onComplete();
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

    setState(s => ({
      ...s,
      currentSceneIndex: nextSceneIndex,
      currentLineIndex: nextIndex + 1,
      leftImage: leftImg,
      rightImage: rightImg,
      leftSpeaking,
      rightSpeaking,
      effect: line.effect || 'none',
    }));

    // Start typing after a small delay for sprite transitions
    setTimeout(() => {
      startTyping(line.text, line.speaker === 'narrator');
    }, line.speaker !== 'narrator' ? 100 : 0);

    setTimeout(() => { isProcessingRef.current = false; }, CLICK_COOLDOWN);
  }, [playData, state, clearTimers, onComplete, startTyping]);

  // Handle click / key press
  const handleClick = useCallback(() => {
    const now = Date.now();
    if (isProcessingRef.current || (now - lastClickRef.current < CLICK_COOLDOWN)) return;

    // Script ended
    if (state.phase === 'ending') return;

    // Initial click to start
    if (state.phase === 'idle') {
      lastClickRef.current = now;
      advance();
      return;
    }

    // Typing → complete
    if (state.phase === 'typing') {
      lastClickRef.current = now;
      completeTyping();
      return;
    }

    // Waiting → advance
    if (state.phase === 'waiting') {
      lastClickRef.current = now;
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
        setState(s => ({ ...s, currentLineIndex: idx, phase: 'waiting', choices: [] }));
        advance();
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
