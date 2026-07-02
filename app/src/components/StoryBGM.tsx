import { useCallback, useRef, useEffect } from 'react';

/**
 * 剧情专用 BGM / SFX 管理器
 * 使用 Web Audio API 或 HTMLAudioElement 播放音效
 */
export interface StoryBGMProps {
  /** 场景 BGM URL（变化时自动 crossfade） */
  bgmUrl?: string;
  /** BGM 音量 0-1 */
  bgmVolume?: number;
  /** 是否暂停 BGM */
  paused?: boolean;
}

export function useStoryBGM({ bgmUrl, bgmVolume = 0.3, paused = false }: StoryBGMProps = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const crossfadeRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string>('');

  // Create audio element if needed
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }
    return audioRef.current;
  }, []);

  // Handle BGM changes
  useEffect(() => {
    if (!bgmUrl || paused) {
      // Fade out and stop
      if (audioRef.current) {
        const audio = audioRef.current;
        const fadeOut = () => {
          if (audio.volume > 0.01) {
            audio.volume = Math.max(0, audio.volume - 0.05);
            requestAnimationFrame(fadeOut);
          } else {
            audio.pause();
            audio.volume = bgmVolume;
          }
        };
        fadeOut();
      }
      currentUrlRef.current = '';
      return;
    }

    // Same URL, just adjust volume
    if (bgmUrl === currentUrlRef.current && audioRef.current) {
      audioRef.current.volume = bgmVolume;
      return;
    }

    // Different URL - crossfade
    const current = audioRef.current;
    if (current && currentUrlRef.current) {
      // Crossfade: start new audio, fade out old
      const newAudio = new Audio(bgmUrl);
      newAudio.loop = true;
      newAudio.volume = 0;
      newAudio.play().catch(() => {});

      let fadeStep = 0;
      const crossfade = () => {
        fadeStep++;
        if (fadeStep <= 20) {
          newAudio.volume = Math.min(bgmVolume, (fadeStep / 20) * bgmVolume);
          if (current) current.volume = Math.max(0, bgmVolume - (fadeStep / 20) * bgmVolume);
          requestAnimationFrame(crossfade);
        } else {
          if (current) {
            current.pause();
            current.removeAttribute('src');
          }
        }
      };
      crossfade();

      audioRef.current = newAudio;
      crossfadeRef.current = newAudio;
    } else {
      // First BGM - simple start
      const audio = getAudio();
      audio.src = bgmUrl;
      audio.volume = bgmVolume;
      audio.load();
      audio.play().catch(() => {});
    }

    currentUrlRef.current = bgmUrl;

    return () => {
      // Cleanup old crossfade
    };
  }, [bgmUrl, bgmVolume, paused, getAudio]);

  // Play one-shot SFX
  const playSFX = useCallback((sfxUrl: string, volume = 0.5) => {
    if (!sfxUrl) return;
    const sfx = new Audio(sfxUrl);
    sfx.volume = volume;
    sfx.play().catch(() => {});
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
    };
  }, []);

  return { playSFX };
}
