import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/* ═══════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════ */

type CrashPhase = 'idle' | 'glitch' | 'dialogs' | 'code' | 'finale' | 'blackout' | 'crt-off' | 'redirect';

interface CrashDialog {
  id: number;
  title: string;
  text: string;
  appearAt: number;
  top: number;
  left: number;
}

interface SystemCrashOverlayProps {
  trigger: boolean;
  onComplete?: () => void;
}

const DIALOGS: CrashDialog[] = [
  { id: 1, title: 'svchost.exe - Application Error', text: 'The instruction at 0x7c910f33 referenced memory at 0x00000010. The memory could not be read.\n\nClick on OK to terminate the program.', appearAt: 2400, top: 8, left: 5 },
  { id: 2, title: 'Windows - Virtual Memory Minimum Too Low', text: 'Your system is low on virtual memory. Windows is increasing the size of your virtual memory paging file. During this process, memory requests for some applications may be denied.', appearAt: 3600, top: 22, left: 35 },
  { id: 3, title: 'ntoskrnl.exe - System Error', text: '*** STOP: 0x0000007B (0xF78D2524, 0xC0000034, 0x00000000, 0x00000000)\n\nINACCESSIBLE_BOOT_DEVICE\n\nIf this is the first time you\'ve seen this error screen, restart your computer.', appearAt: 4800, top: 40, left: 15 },
  { id: 4, title: 'OBSERVER.EXE - Fatal Exception', text: 'SANITY_CHECK_FAILED at 0xDEADBEEF.\n\nThe observer process has been corrupted. Memory integrity compromised.\n\nStack trace: 0x1A3F → 0xBEEF → 0xNULL', appearAt: 5800, top: 15, left: 55 },
  { id: 5, title: 'TERMINAL_SARCO - Signal Lost', text: 'Connection to Sarcophagus terminal severed.\n\nLast known signal: ████ ERROR ████\nRetry count exceeded. Operator status: UNKNOWN.\n\nRecommend immediate evacuation.', appearAt: 6800, top: 55, left: 40 },
  { id: 6, title: 'ORIGINIUM_CORE - Critical Alert', text: 'Originium crystal matrix destabilized.\nLeak detected in containment field.\n\nCore temperature: ███°C (CRITICAL)\nContainment integrity: 12% and falling.\n\nEVACUATE IMMEDIATELY.', appearAt: 7600, top: 35, left: 65 },
  { id: 7, title: 'KERNEL32.DLL — Stack Overflow', text: 'Stack overflow at 0x7FFA3C001.\nRecursive call depth exceeded.\nThread aborted.', appearAt: 8000, top: 5, left: 5 },
  { id: 8, title: 'WS2_32.DLL — Winsock Error 10054', text: 'Connection reset by peer.\nRemote host forcibly closed the socket.\n\nPackets lost: ████', appearAt: 8300, top: 12, left: 12 },
  { id: 9, title: 'CRYPT32.DLL — Certificate Revoked', text: 'The revocation function was unable to check revocation.\n\nChain validation failed.\nTrust terminated.', appearAt: 8550, top: 20, left: 20 },
  { id: 10, title: 'NTDLL.DLL — Heap Corruption', text: 'HEAP_CORRUPTION_DETECTED at 0x1A3F5B7D.\n\nCritical memory region overwritten.\nDumping core... FAILED.', appearAt: 8750, top: 28, left: 28 },
  { id: 11, title: 'USER32.DLL — Win32k Desynchronization', text: 'GDI object count exceeded.\n\nDesktop heap exhausted.\nWindow creation blocked.', appearAt: 8900, top: 36, left: 36 },
  { id: 12, title: 'HAL.DLL — Interrupt Storm', text: 'IRQ_NOT_LESS_OR_EQUAL\n\nInterrupt storm detected on vector 0xFF.\nProcessor halted.', appearAt: 9020, top: 44, left: 44 },
  { id: 13, title: 'RPCSS.DLL — RPC Server Unavailable', text: 'The RPC server is unavailable.\n\nEndpoint resolution failed.\nService dependency broken.', appearAt: 9120, top: 52, left: 52 },
  { id: 14, title: 'COMCTL32.DLL — Control Corrupted', text: 'Invalid window handle referenced.\n\nNested dialog limit exceeded.\nMessage pump deadlocked.', appearAt: 9200, top: 60, left: 60 },
  { id: 15, title: 'WINHTTP.DLL — SSL/TLS Fatal', text: 'SEC_E_INTERNAL_ERROR\n\nEncryption handshake failed.\nAll cipher suites rejected.', appearAt: 9260, top: 68, left: 68 },
  { id: 16, title: 'VCRUNTIME140.DLL — Pure Virtual Call', text: 'R6025 — pure virtual function call.\n\nAbstract destructor invoked.\nProgram terminated.', appearAt: 9300, top: 76, left: 76 },
];

const CODE_LINES: string[] = [
  'at 0x7FFA3C001 memory violation (read access)',
  '*** stack smashing detected ***: terminated',
  'Segmentation fault (core dumped)',
  '[KERNEL] Page fault at 0xFFFFFFFF80000000',
  'heap corruption detected at 0x1A2B3C4D',
  '>>> SANITY_CHECK_FAILED <<<',
  '0xDEADBEEF: unreachable code executed',
  'SIGABRT received. Process terminating.',
  'core.19384 dumped to /var/crash/',
  '>>> HELP <<<',
  '>>> CANNOT EXIT <<<',
  '>>> THE CYCLE CONTINUES <<<',
  'WARNING: recursive lock detected in thread 0x4F2A',
  'malloc(): memory corruption (fast)',
  'double free or corruption (out)',
  'Unhandled exception at 0x7FFA3C001',
  'Access violation reading location 0x00000000',
  'Stack cookie instrumentation code detected a stack-based buffer overrun',
  'Kernel panic - not syncing: Attempted to kill init!',
  'BUG: unable to handle kernel NULL pointer dereference at 00000000',
  '>>> LOOP <<<',
  '>>> ETERNAL <<<',
];

/* ═══════════════════════════════════════
   Standalone Error Sound
   ═══════════════════════════════════════ */

export function playButtonError(): void {
  const ctx = new AudioContext();
  [2000, 3000, 500].forEach(freq => {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 800;
    osc.connect(hpf);
    hpf.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  });
  const bufferSize = Math.floor(ctx.sampleRate * 0.1);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) { data[i] = (Math.random() * 2 - 1); }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 4000; bp.Q.value = 3;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.12, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  src.connect(bp); bp.connect(noiseGain); noiseGain.connect(ctx.destination);
  src.start(); src.stop(ctx.currentTime + 0.15);
  setTimeout(() => ctx.close(), 500);
}

/* ═══════════════════════════════════════
   Sound Engine — Web Audio API
   ═══════════════════════════════════════ */

class CrashSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  // Sustained alarm refs
  private alarmOscs: OscillatorNode[] = [];
  private alarmGain: GainNode | null = null;
  private alarmLFO: OscillatorNode | null = null;
  private alarmLfoGain: GainNode | null = null;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean) {
    if (this.masterGain) this.masterGain.gain.value = m ? 0 : 0.7;
  }

  startAmbientHum() {
    const ctx = this.ensureCtx();
    this.ambientOsc = ctx.createOscillator();
    this.ambientOsc.type = 'sawtooth';
    this.ambientOsc.frequency.value = 55;

    this.ambientFilter = ctx.createBiquadFilter();
    this.ambientFilter.type = 'lowpass';
    this.ambientFilter.frequency.value = 120;
    this.ambientFilter.Q.value = 1.5;

    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0;

    this.ambientOsc.connect(this.ambientFilter);
    this.ambientFilter.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain!);
    this.ambientOsc.start();

    const t = ctx.currentTime;
    this.ambientGain.gain.setValueAtTime(0, t);
    this.ambientGain.gain.linearRampToValueAtTime(0.20, t + 2);
    this.ambientGain.gain.linearRampToValueAtTime(0.40, t + 5);
    this.ambientGain.gain.linearRampToValueAtTime(0.55, t + 7);
    this.ambientGain.gain.linearRampToValueAtTime(0.70, t + 12);
    this.ambientGain.gain.linearRampToValueAtTime(0.90, t + 16);
  }

  playGlitchCrackle() {
    const ctx = this.ensureCtx();
    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) { data[i] = (Math.random() * 2 - 1) * Math.min(1, (i / bufferSize) * 3); }
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 2000; filter.Q.value = 0.8;
    const gain = ctx.createGain(); gain.gain.value = 0.15;
    src.connect(filter); filter.connect(gain); gain.connect(this.masterGain!);
    src.start(); src.stop(ctx.currentTime + 0.06);
  }

  playDialogDing() {
    const ctx = this.ensureCtx();
    [800, 1200].forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'square'; osc.frequency.value = freq;
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass'; hpf.frequency.value = 1500;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(hpf); hpf.connect(gain); gain.connect(this.masterGain!);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    });
  }

  // ═══ Continuous harsh alarm — starts after last dialog, runs until CRT off ═══
  startSustainedAlarm() {
    const ctx = this.ensureCtx();

    // Master gain for alarm (pulsed by LFO)
    this.alarmGain = ctx.createGain();
    this.alarmGain.gain.value = 0;

    // Two dissonant sawtooth oscillators for beating effect
    [1000, 1203].forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 800;
      osc.connect(hpf);
      hpf.connect(this.alarmGain!);
      osc.start();
      this.alarmOscs.push(osc);
    });

    // LFO for rapid amplitude pulsing (8Hz tremolo)
    this.alarmLFO = ctx.createOscillator();
    this.alarmLFO.type = 'sine';
    this.alarmLFO.frequency.value = 8;
    this.alarmLfoGain = ctx.createGain();
    this.alarmLfoGain.gain.value = 0.07; // modulation depth
    this.alarmLFO.connect(this.alarmLfoGain);
    this.alarmLfoGain.connect(this.alarmGain.gain);
    this.alarmLFO.start();

    // Base gain level
    this.alarmGain.gain.value = 0.12;
    this.alarmGain.connect(this.masterGain!);
  }

  stopSustainedAlarm() {
    const t = this.ctx?.currentTime ?? 0;
    try { this.alarmGain?.gain.linearRampToValueAtTime(0, t + 0.3); } catch { /* */ }
    this.alarmOscs.forEach(o => { try { o.stop(t + 0.35); } catch { /* */ } });
    try { this.alarmLFO?.stop(t + 0.35); } catch { /* */ }
    this.alarmOscs = [];
    this.alarmGain = null;
    this.alarmLFO = null;
    this.alarmLfoGain = null;
  }

  startDataNoise() {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain(); gain.gain.value = 0;
    const lfo = ctx.createOscillator();
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass'; hpf.frequency.value = 1000;
    osc.connect(hpf); hpf.connect(gain); gain.connect(this.masterGain!);
    return { osc, lfo, gain, hpf };
  }

  stopAmbientHum() {
    try { this.ambientGain?.gain.linearRampToValueAtTime(0, this.ctx?.currentTime ?? 0 + 0.3); } catch { /* */ }
    setTimeout(() => { try { this.ambientOsc?.stop(); } catch { /* */ } }, 500);
  }

  destroy() {
    this.stopSustainedAlarm();
    this.stopAmbientHum();
    try { this.ctx?.close(); } catch { /* */ }
    this.ctx = null;
  }
}

/* ═══════════════════════════════════════
   SystemCrashOverlay Component
   ═══════════════════════════════════════ */

const ALL_CODE_LINES = [...CODE_LINES, ...CODE_LINES, ...CODE_LINES];

export default function SystemCrashOverlay({ trigger, onComplete }: SystemCrashOverlayProps) {
  const [phase, setPhase] = useState<CrashPhase>('idle');
  const [visibleDialogs, setVisibleDialogs] = useState<number[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [codeLinesVisible, setCodeLinesVisible] = useState(0);
  const [codeSpeed, setCodeSpeed] = useState(6);
  const [showFinale, setShowFinale] = useState(false);
  const [finalePhase, setFinalePhase] = useState<'appear' | 'flash' | 'blackout'>('appear');
  const [muted, setMuted] = useState(false);
  const [screenRage, setScreenRage] = useState(false);
  const [crtOff, setCrtOff] = useState(false);

  const soundRef = useRef<CrashSoundEngine | null>(null);
  const dataNoiseRef = useRef<{ osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode; hpf: BiquadFilterNode } | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const codeRevealRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addTimer = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (codeRevealRef.current) { clearTimeout(codeRevealRef.current); codeRevealRef.current = null; }
  }, []);

  useEffect(() => { soundRef.current = new CrashSoundEngine(); return () => { soundRef.current?.destroy(); }; }, []);
  useEffect(() => { soundRef.current?.setMuted(muted); }, [muted]);

  useEffect(() => {
    if (!trigger) return;
    const sound = soundRef.current;
    if (!sound) return;

    clearAllTimers();
    setVisibleDialogs([]);
    setCodeLinesVisible(0);
    setScreenRage(false);
    setCrtOff(false);
    window.dispatchEvent(new CustomEvent('crash-overlay-start'));

    // ═══ PHASE 1: Glitch ═══
    setPhase('glitch');
    sound.startAmbientHum();
    for (let i = 0; i < 10; i++) {
      addTimer(() => sound.playGlitchCrackle(), 1200 + i * 800 + Math.random() * 400);
    }

    // ═══ PHASE 2: Dialogs ═══
    addTimer(() => setPhase('dialogs'), 1200);

    DIALOGS.forEach((dialog, index) => {
      addTimer(() => {
        setVisibleDialogs(prev => [...prev, dialog.id]);
        sound.playDialogDing();
        if (index >= 3) sound.playGlitchCrackle();

        // Last dialog → unleash sustained alarm + screen rage
        if (index === 15) {
          sound.startSustainedAlarm();
          setScreenRage(true);
        }
      }, dialog.appearAt);
    });

    // ═══ PHASE 3: Code waterfall ═══
    addTimer(() => {
      setPhase('code');
      setShowCode(true);
      setCodeSpeed(6);
      dataNoiseRef.current = sound.startDataNoise();
      let revealed = 0;
      const revealNext = () => {
        revealed++;
        setCodeLinesVisible(revealed);
        if (revealed < ALL_CODE_LINES.length) {
          const progress = revealed / ALL_CODE_LINES.length;
          const delay = Math.max(2, Math.round(30 * (1 - progress * 0.9)));
          codeRevealRef.current = setTimeout(revealNext, delay);
        }
      };
      codeRevealRef.current = setTimeout(revealNext, 50);
    }, 5000);

    addTimer(() => setCodeSpeed(2), 7600);
    addTimer(() => setCodeSpeed(0.8), 10000);
    addTimer(() => setCodeSpeed(0.4), 12000);

    // ═══ PHASE 4: Finale — moved earlier (10.5s) ═══
    addTimer(() => { setPhase('finale'); setShowFinale(true); setFinalePhase('appear'); }, 10500);
    addTimer(() => setFinalePhase('flash'), 12000);

    // ═══ CRT Power-Off sequence (15.5s, shortened alarm by 1.5s) ═══
    addTimer(() => {
      setPhase('crt-off');
      setCrtOff(true);
      setScreenRage(false);
      sound.stopSustainedAlarm();
      sound.stopAmbientHum();
      try { dataNoiseRef.current?.osc.stop(); } catch { /* */ }
      try { dataNoiseRef.current?.lfo.stop(); } catch { /* */ }
    }, 15500);

    // ═══ Redirect — clear auth so login page stays ═══
    addTimer(() => {
      setPhase('redirect');
      window.dispatchEvent(new CustomEvent('crash-overlay-end'));
      // Clear auth token so login page won't auto-redirect
      try { localStorage.removeItem('arkoverseer_token'); } catch { /* */ }
      if (onComplete) onComplete();
      else window.location.href = '/login';
    }, 16700);

    return () => {
      clearAllTimers();
      window.dispatchEvent(new CustomEvent('crash-overlay-end'));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (!trigger || phase === 'idle' || phase === 'redirect') return null;

  const isGlitchPhase = phase === 'glitch' || phase === 'dialogs' || phase === 'code' || phase === 'finale';
  const showAftermath = phase === 'dialogs' || phase === 'code' || phase === 'finale';
  const isCrtOff = crtOff;

  return (
    <>
      {/* ═══ Main crash overlay (animated) ═══ */}
      <div className={`crash-overlay${screenRage ? ' crash-screen-rage' : ''}${isCrtOff ? ' crt-power-off' : ''}`}>
        {isGlitchPhase && (
          <div className="crash-rgb-split crash-clip-glitch crash-black-flash absolute inset-0 z-[15] pointer-events-none" />
        )}
        {showAftermath && (
          <div className="crash-glitch-aftermath" style={{ zIndex: 14, opacity: isCrtOff ? 0 : 0.4, transition: 'opacity 0.3s ease' }} />
        )}
        {visibleDialogs.map(dialogId => {
          const dialog = DIALOGS.find(d => d.id === dialogId);
          if (!dialog) return null;
          return (
            <div key={dialog.id} className="crash-dialog-winxp crash-dialog-enter" style={{ top: `${dialog.top}%`, left: `${dialog.left}%`, transform: `translate(-50%, -50%) scale(${(phase === 'finale' || isCrtOff) ? 0.97 : 1})`, transition: 'transform 0.3s ease', filter: isCrtOff ? 'brightness(0)' : 'none', transitionProperty: 'filter', transitionDuration: '0.3s' }}>
              <div className="dialog-titlebar"><span>{dialog.title}</span><div className="dialog-close">✕</div></div>
              <div className="dialog-body"><div className="dialog-icon">✕</div><div className="dialog-text" style={{ whiteSpace: 'pre-line' }}>{dialog.text}</div></div>
              <div className="dialog-footer"><span className="dialog-ok-btn">OK</span></div>
            </div>
          );
        })}
        {showCode && (
          <div className="crash-code-terminal" style={{ opacity: isCrtOff ? 0 : 1, transition: 'opacity 0.3s ease' }}>
            <div className="crash-code-scroll-inner" style={{ '--scroll-duration': `${codeSpeed}s` } as React.CSSProperties}>
              {ALL_CODE_LINES.slice(0, codeLinesVisible).map((line, i) => (
                <div key={i} className={`code-line${line.startsWith('>>>') ? ' red-flash' : ''}`}>{line}</div>
              ))}
            </div>
          </div>
        )}
        {showFinale && (
          <div className="crash-finale-text">
            <span className={finalePhase === 'appear' ? 'crash-finale-appear' : 'crash-finale-flash'} style={{ opacity: isCrtOff ? 0 : 1, transition: 'opacity 0.3s ease' }}>
              LOOP IS ETERNAL
            </span>
          </div>
        )}
        <button className="crash-mute-btn" onClick={() => setMuted(m => !m)} title={muted ? '取消静音' : '静音'} style={{ opacity: isCrtOff ? 0 : 1, transition: 'opacity 0.3s ease' }}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* ═══ CRT layers — SEPARATE from crash-overlay, not affected by CRT scale animation ═══ */}
      {isCrtOff && <div className="fixed inset-0 bg-black z-[10001]" />}
      <div className={`crash-crt-collapse${isCrtOff ? ' active' : ''}`} />
      <div className={`crash-finale-blackout${isCrtOff ? ' active' : ''}`} />
    </>
  );
}
