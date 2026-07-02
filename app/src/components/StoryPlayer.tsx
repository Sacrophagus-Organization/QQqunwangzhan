import { useCallback, useRef, useEffect, useState } from 'react';
import { useStoryPlayer } from '@/hooks/useStoryPlayer';
import { useStoryBGM } from '@/components/StoryBGM';

interface StoryPlayerProps {
  storyId: string;
  onComplete: () => void;
  allowSkip?: boolean;
}

/* ═══════════════════════════════════════
   内联 SVG 图标
   ═══════════════════════════════════════ */
const ArrowDownIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="#c9a96e">
    <polygon points="12,16 4,6 20,6" />
  </svg>
);

/* ═══════════════════════════════════════
   StoryPlayer 主组件
   ═══════════════════════════════════════ */
export default function StoryPlayer({ storyId, onComplete, allowSkip = true }: StoryPlayerProps) {
  const { playData, state, currentLine, currentScene, handleClick, chooseOption } = useStoryPlayer({
    storyId,
    onComplete,
  });

  // BGM (playSFX intentionally unused for now, reserved for future sfx integration)
  useStoryBGM({
    bgmUrl: currentScene?.bgm,
    bgmVolume: currentScene?.bgmVolume ?? 0.3,
    paused: state.phase === 'ending',
  });

  // Sprite crossfade state
  const [leftDisplay, setLeftDisplay] = useState<{ front: string; back: string; activeLayer: 'front' | 'back' }>({
    front: '', back: '', activeLayer: 'front',
  });
  const [rightDisplay, setRightDisplay] = useState<{ front: string; back: string; activeLayer: 'front' | 'back' }>({
    front: '', back: '', activeLayer: 'front',
  });
  const [bgImages, setBgImages] = useState<{ front: string; back: string; frontAlpha: number }>({
    front: '', back: '', frontAlpha: 1,
  });

  const leftSwitchingRef = useRef(false);
  const rightSwitchingRef = useRef(false);
  const bgSwitchingRef = useRef(false);

  // Crossfade sprite helper
  const switchSprite = useCallback(
    (side: 'left' | 'right', newUrl: string | null | undefined) => {
      const switchingRef = side === 'left' ? leftSwitchingRef : rightSwitchingRef;
      const setDisplay = side === 'left' ? setLeftDisplay : setRightDisplay;

      const currentDisplay = side === 'left' ? leftDisplay : rightDisplay;
      const currentActive = currentDisplay.activeLayer === 'front' ? currentDisplay.front : currentDisplay.back;
      const url = newUrl || '';

      if (url === currentActive && url !== '' && !switchingRef.current) return;
      if (url === '' && currentActive === '' && !switchingRef.current) return;

      switchingRef.current = true;

      if (!url || url === '') {
        // Hide sprite
        setDisplay(prev => {
          const newFront = prev.activeLayer === 'front' ? '' : prev.front;
          const newBack = prev.activeLayer === 'back' ? '' : prev.back;
          return { front: newFront, back: newBack, activeLayer: prev.activeLayer };
        });
        setTimeout(() => { switchingRef.current = false; }, 500);
        return;
      }

      // Preload new image
      const preload = new Image();
      preload.onload = () => {
        setDisplay(prev => {
          const inactiveLayer = prev.activeLayer === 'front' ? 'back' : 'front';
          return {
            ...prev,
            [inactiveLayer]: url,
            [prev.activeLayer]: prev.activeLayer === 'front' ? prev.front : prev.back,
          };
        });

        // Trigger crossfade
        requestAnimationFrame(() => {
          setDisplay(prev => {
            const newActive = prev.activeLayer === 'front' ? 'back' : 'front';
            return { ...prev, activeLayer: newActive };
          });
          setTimeout(() => {
            switchingRef.current = false;
          }, 500);
        });
      };
      preload.onerror = () => { switchingRef.current = false; };
      preload.src = url;
    },
    [leftDisplay, rightDisplay],
  );

  // Switch background
  const switchBackground = useCallback((newBg: string | undefined | null) => {
    if (bgSwitchingRef.current) return;
    const url = newBg || '';
    if (!url || url === bgImages.front) return;

    bgSwitchingRef.current = true;
    // Preload
    const preload = new Image();
    preload.onload = () => {
      setBgImages(prev => ({ ...prev, back: url }));
      requestAnimationFrame(() => {
        setBgImages(prev => ({ ...prev, frontAlpha: 0 }));
        setTimeout(() => {
          setBgImages({ front: url, back: '', frontAlpha: 1 });
          bgSwitchingRef.current = false;
        }, 500);
      });
    };
    preload.onerror = () => { bgSwitchingRef.current = false; };
    preload.src = url;
  }, [bgImages.front]);

  // React to line changes — update sprites and background
  useEffect(() => {
    if (!currentLine || !playData) return;

    const lineData = currentLine;

    // Derive sprite from character data instead of line.leftImage/line.rightImage
    if (lineData.speaker === 'left' && lineData.characterName) {
      const char = playData.characters.find(c => c.name === lineData.characterName);
      if (char?.defaultSprite) switchSprite('left', char.defaultSprite);
    } else if (lineData.speaker === 'right' && lineData.characterName) {
      const char = playData.characters.find(c => c.name === lineData.characterName);
      if (char?.defaultSprite) switchSprite('right', char.defaultSprite);
    }
    // Also check for explicitly set images (backward compat)
    if (lineData.leftImage) switchSprite('left', lineData.leftImage);
    if (lineData.rightImage) switchSprite('right', lineData.rightImage);

    // Switch background on scene change
    if (currentScene?.background) switchBackground(currentScene.background);
  }, [currentLine?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['Space', 'Enter', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleClick]);

  // Touch handler
  const touchRef = useRef(false);

  // Effect class
  const getEffectClass = () => {
    if (state.effect === 'none') return '';
    return `effect-${state.effect}`;
  };

  // Loading state
  if (state.phase === 'loading') {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-300/60 text-sm">加载剧情中...</p>
        </div>
      </div>
    );
  }

  // Ending state — brief fade then call onComplete
  if (state.phase === 'ending') {
    return (
      <div className="fixed inset-0 z-[100] bg-black animate-[storyFadeOut_1.5s_ease_forwards] pointer-events-none" />
    );
  }

  // Choose character color by name
  const getCharacterColor = (name: string) => {
    if (!playData) return '#c9a96e';
    const char = playData.characters.find(c => c.name === name);
    return char?.nameTagColor || '#c9a96e';
  };

  const isNarrator = currentLine?.speaker === 'narrator';

  return (
    <div
      className={`fixed inset-0 z-[100] select-none overflow-hidden bg-[#1a1a2e] cursor-pointer ${getEffectClass()}`}
      onClick={handleClick}
      onTouchStart={(e) => { e.preventDefault(); if (!touchRef.current) { touchRef.current = true; handleClick(); setTimeout(() => { touchRef.current = false; }, 300); }}}
    >
      {/* ── 样式注入 ── */}
      <style>{`
        .sprite-hidden { opacity:0; transform:translateY(20px) scale(0.95); pointer-events:none; }
        .sprite-speaking { opacity:1; filter:brightness(1) saturate(1); transform:translateY(0) scale(1); }
        .sprite-dimmed { opacity:0.65; filter:brightness(0.45) saturate(0.7); transform:translateY(2px) scale(0.98); }

        @keyframes storyFadeOut { to { opacity:0; } }
        @keyframes indicatorPulse {
          0%,100% { transform:translateY(0); opacity:0.6; }
          50% { transform:translateY(6px); opacity:1; }
        }
        @keyframes effect-shake {
          0%,100% { transform:translateX(0); }
          10%,30%,50%,70%,90% { transform:translateX(-6px); }
          20%,40%,60%,80% { transform:translateX(6px); }
        }
        @keyframes effect-fadein {
          0% { opacity:0; }
          100% { opacity:1; }
        }
        @keyframes effect-zoom {
          0% { transform:scale(1.05); }
          100% { transform:scale(1); }
        }
        @keyframes effect-flash {
          0% { filter:brightness(1); }
          50% { filter:brightness(1.8); }
          100% { filter:brightness(1); }
        }
        .effect-shake { animation:effect-shake 0.6s ease; }
        .effect-fadein { animation:effect-fadein 0.8s ease; }
        .effect-zoom { animation:effect-zoom 0.8s ease; }
        .effect-flash { animation:effect-flash 0.4s ease; }
      `}</style>

      {/* ── 场景背景 ── */}
      <div className="absolute inset-0 z-0 transition-opacity duration-500">
        {/* Back layer */}
        {bgImages.back && (
          <div className="absolute inset-0 bg-center bg-cover bg-no-repeat" style={{ backgroundImage: `url(${bgImages.back})` }} />
        )}
        {/* Front layer */}
        {bgImages.front ? (
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat"
            style={{ backgroundImage: `url(${bgImages.front})`, opacity: bgImages.frontAlpha, transition: 'opacity 0.5s cubic-bezier(0.4,0,0.2,1)' }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              opacity: bgImages.frontAlpha,
              transition: 'opacity 0.5s cubic-bezier(0.4,0,0.2,1)',
              background: 'linear-gradient(180deg, #1a1a3e 0%, #1e2a3a 15%, #2a3a4a 30%, #3a4a5a 50%, #2a3a3a 70%, #1a2a2a 85%, #0f1a1a 100%)',
            }}
          >
            {/* Ambient light overlays */}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(255,220,180,0.12) 0%, transparent 60%)' }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 70%, rgba(180,200,220,0.08) 0%, transparent 50%)' }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 65%, rgba(200,180,160,0.06) 0%, transparent 50%)' }} />
          </div>
        )}
      </div>

      {/* ── 左侧立绘 ── */}
      <div
        className={`absolute bottom-0 left-[2vw] z-[2] pointer-events-none max-sm:left-[1vw] max-sm:w-[65vw] max-sm:h-[85vh]`}
        style={{
          width: '55vw',
          maxWidth: '700px',
          height: '95vh',
          transition: 'opacity 0.5s cubic-bezier(0.4,0,0.2,1), filter 0.5s cubic-bezier(0.4,0,0.2,1), transform 0.5s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {(['front', 'back'] as const).map(layer => (
          <img
            key={layer}
            className="absolute bottom-0 left-0 w-full h-full object-contain object-bottom-center pointer-events-none"
            src={(layer === leftDisplay.activeLayer ? leftDisplay.front : leftDisplay.back) || (layer === leftDisplay.activeLayer ? leftDisplay.back : leftDisplay.front)}
            alt=""
            style={{
              zIndex: layer === leftDisplay.activeLayer ? 2 : 1,
              opacity: layer === leftDisplay.activeLayer ? 1 : 0,
              transition: 'opacity 0.5s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        ))}
      </div>

      {/* ── 右侧立绘 ── */}
      <div
        className={`absolute bottom-0 right-[2vw] z-[2] pointer-events-none max-sm:right-[1vw] max-sm:w-[65vw] max-sm:h-[85vh]`}
        style={{
          width: '55vw',
          maxWidth: '700px',
          height: '95vh',
          transition: 'opacity 0.5s cubic-bezier(0.4,0,0.2,1), filter 0.5s cubic-bezier(0.4,0,0.2,1), transform 0.5s cubic-bezier(0.4,0,0.2,1)',
          transform: 'scaleX(-1)',
        }}
      >
        {(['front', 'back'] as const).map(layer => (
          <img
            key={layer}
            className="absolute bottom-0 left-0 w-full h-full object-contain object-bottom-center pointer-events-none"
            src={(layer === rightDisplay.activeLayer ? rightDisplay.front : rightDisplay.back) || (layer === rightDisplay.activeLayer ? rightDisplay.back : rightDisplay.front)}
            alt=""
            style={{
              zIndex: layer === rightDisplay.activeLayer ? 2 : 1,
              opacity: layer === rightDisplay.activeLayer ? 1 : 0,
              transition: 'opacity 0.5s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        ))}
      </div>

      {/* ── 旁白模式覆盖层 ── */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-500"
        style={{
          background: 'rgba(0,0,0,0.92)',
          opacity: isNarrator ? 1 : 0,
          pointerEvents: isNarrator ? 'auto' : 'none',
        }}
      >
        {isNarrator && currentLine && (
          <div className="text-center max-w-[70vw] px-[3vw] max-sm:max-w-[85vw]">
            <p
              className="text-[#dcd8d0] text-[1.3rem] leading-[2] tracking-[0.05em] whitespace-pre-wrap min-h-[2em] max-sm:text-[1.1rem]"
              style={{ textShadow: '0 0 20px rgba(200,180,150,0.3)' }}
            >
              {currentLine.text.slice(0, state.displayedChars)}
            </p>
            {state.phase === 'waiting' && (
              <div className="mt-6 opacity-60 animate-[indicatorPulse_1.4s_ease-in-out_infinite] flex justify-center">
                <ArrowDownIcon />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 底部对话栏 ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[5] px-[3vw] pb-[3vh] pt-[2.5vh] transition-all duration-500 max-sm:pb-[2.5vh] max-sm:px-[2vw] max-sm:pt-[2vh]"
        style={{
          background: 'linear-gradient(180deg, rgba(10,10,20,0.75) 0%, rgba(10,10,20,0.9) 20%, rgba(8,8,16,0.95) 100%)',
          borderTop: '2px solid rgba(255,255,255,0.15)',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
          minHeight: '28vh',
          opacity: isNarrator ? 0 : 1,
          transform: isNarrator ? 'translateY(30px)' : 'translateY(0)',
          pointerEvents: isNarrator ? 'none' : 'auto',
        }}
      >
        <div className="flex flex-col items-start">
          {/* 角色名标签 */}
          {currentLine && !isNarrator && (
            <div
              className="inline-block px-[22px] py-[6px] -mt-[18px] mb-2 rounded-[2px] text-[#1a1a1a] font-bold text-[1rem] tracking-[0.08em] text-center min-w-[60px] transition-all duration-500 max-sm:text-[0.9rem] max-sm:px-[16px] max-sm:py-[5px]"
              style={{
                background: `linear-gradient(135deg, ${getCharacterColor(currentLine.characterName)} 0%, ${getCharacterColor(currentLine.characterName)}88 100%)`,
                boxShadow: '0 3px 12px rgba(0,0,0,0.4)',
              }}
            >
              {currentLine.characterName || '\u00A0'}
              {/* 小三角 */}
              <div style={{
                position: 'absolute', bottom: '-6px', left: '18px',
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: `8px solid ${getCharacterColor(currentLine.characterName)}`,
              }} />
            </div>
          )}

          {/* 对话文字 */}
          {currentLine && !isNarrator && (
            <p className="text-[#e8e4dd] text-[1.15rem] leading-[1.8] tracking-[0.03em] min-h-[3.6em] whitespace-pre-wrap break-words pr-10 max-sm:text-[1rem] max-sm:leading-[1.6] max-sm:pr-[30px]">
              {currentLine.text.slice(0, state.displayedChars)}
            </p>
          )}

          {/* 初始提示 */}
          {state.phase === 'idle' && (
            <p className="text-[#e8e4dd] text-[1.15rem] leading-[1.8] tracking-[0.03em] min-h-[3.6em]">
              点击屏幕开始...
            </p>
          )}
        </div>

        {/* 继续提示箭头 */}
        <div
          className="absolute bottom-[2.5vh] right-[3vw] z-[6] pointer-events-none transition-opacity duration-400"
          style={{ opacity: state.phase === 'waiting' && !isNarrator ? 0.8 : 0 }}
        >
          {state.phase === 'waiting' && !isNarrator && (
            <div className="animate-[indicatorPulse_1.4s_ease-in-out_infinite]">
              <ArrowDownIcon />
            </div>
          )}
        </div>
      </div>

      {/* ── 选项分支 ── */}
      {state.phase === 'choosing' && playData && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <div className="flex flex-col gap-3 max-w-md w-full px-6">
            {playData.choices
              .filter(c => currentLine && c.lineId === currentLine.id)
              .map(choice => (
                <button
                  key={choice.id}
                  onClick={(e) => { e.stopPropagation(); chooseOption(choice); }}
                  className="px-6 py-4 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 text-amber-100 hover:from-amber-500/40 hover:to-amber-600/40 hover:border-amber-400/50 transition-all duration-300 text-left"
                >
                  {choice.text}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ── 跳过按钮 ── */}
      {allowSkip && (
        <button
          onClick={(e) => { e.stopPropagation(); onComplete(); }}
          className="absolute top-4 right-4 z-30 px-3 py-1.5 rounded-md bg-black/40 border border-white/10 text-white/50 text-xs hover:bg-black/60 hover:text-white/80 hover:border-white/20 transition-all"
        >
          跳过
        </button>
      )}
    </div>
  );
}
