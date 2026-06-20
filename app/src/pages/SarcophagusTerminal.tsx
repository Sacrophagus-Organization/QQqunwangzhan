import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { apiPost } from '@/api/client';
import { Loader2, Terminal, Shield, X, Download, ArrowLeft } from 'lucide-react';

type BootPhase = 'idle' | 'booting' | 'complete';

export default function SarcophagusTerminal() {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationType, setAnimationType] = useState<'none' | 'unlock' | 'fail'>('none');
  const [loading, setLoading] = useState(false);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalPhase, setModalPhase] = useState<'closed' | 'opening' | 'open'>('closed');
  const [errorModal, setErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [bootPhase, setBootPhase] = useState<BootPhase>('idle');

  // CRT 开机动画：组件挂载时触发（总时长 1700ms，白点在 350ms 彻底消失避免与内容重叠）
  useEffect(() => {
    setBootPhase('booting');
    const t = setTimeout(() => setBootPhase('complete'), 1700);
    return () => clearTimeout(t);
  }, []);

  const appendOutput = useCallback((line: string) => {
    setOutput(prev => [...prev, `&gt; ${line}`]);
  }, []);

  const handleVerify = async () => {
    if (isAnimating || loading) return;
    if (!code.trim()) {
      appendOutput('ERROR: 请输入访问代码');
      return;
    }

    setIsAnimating(true);
    setLoading(true);
    setAnimationType('none');
    appendOutput(`AUTH_REQ: 正在验证接入代码 "${code.trim().toUpperCase()}"...`);

    try {
      const result = await apiPost<{ success: boolean; downloadToken?: string; message?: string }>(
        '/sarcophagus/verify',
        { code: code.trim() }
      );

      if (result.success && result.downloadToken) {
        appendOutput('AUTH_OK: 远程协议验证通过.');
        appendOutput('SYNC: 数据包已就绪，正在建立下载通道...');
        setAnimationType('unlock');
        setDownloadToken(result.downloadToken);
      } else {
        appendOutput(`AUTH_FAIL: ${result.message || '访问代码无效'}`);
        setAnimationType('fail');
        setErrorMessage(result.message || '访问代码无效，请重试');
        setErrorModal(true);
      }
    } catch (e: any) {
      appendOutput(`NET_ERR: ${e.message}`);
      setAnimationType('fail');
      setErrorMessage(e.message || '网络连接异常');
      setErrorModal(true);
    }
    setLoading(false);
    setCode('');
  };

  const handleAnimationEnd = () => {
    setIsAnimating(false);
    if (animationType === 'unlock' && downloadToken) {
      setTimeout(() => {
        setModalPhase('opening');
        setTimeout(() => setModalPhase('open'), 50);
        setShowModal(true);
      }, 400);
    }
  };

  const handleDownload = () => {
    if (downloadToken) {
      window.open(`/api/sarcophagus/download/${downloadToken}`, '_blank');
      setShowModal(false);
      setModalPhase('closed');
      appendOutput('DL_START: 数据传输中...');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  // ═══════════════════════════════════════════
  //   CRT 老电视开机动画
  // ═══════════════════════════════════════════
  if (bootPhase !== 'complete') {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
        {/* ── 阶段1: 中心白点闪亮后熄灭 (0-350ms) ── */}
        <div
          className="absolute w-4 h-4 rounded-full bg-white"
          style={{
            animation: 'crt-boot-dot 0.35s ease-out forwards',
            boxShadow: '0 0 60px 25px rgba(255,255,255,0.9), 0 0 120px 50px rgba(200,220,255,0.5)',
          }}
        />

        {/* ── 阶段2: 水平亮线 (200-500ms，与白点尾部交叠) ── */}
        <div
          className="absolute inset-x-0 h-[3px] bg-white"
          style={{
            animation: 'crt-boot-line 0.3s ease-in forwards',
            animationDelay: '0.2s',
            opacity: 0,
            boxShadow: '0 0 40px 12px rgba(255,255,255,0.7), 0 0 80px 30px rgba(200,230,255,0.3)',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />

        {/* ── 阶段3: 垂直展开 + 雪花噪点 (450-1100ms) ── */}
        <div
          className="absolute inset-0"
          style={{
            animation: 'crt-boot-expand 0.65s ease-out forwards',
            animationDelay: '0.45s',
            opacity: 0,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              animation: 'crt-static-noise 0.8s steps(12) infinite, crt-noise-shift 0.5s steps(8) infinite',
              animationDelay: '0.45s',
              backgroundImage: `
                repeating-radial-gradient(circle at 20% 30%, rgba(255,255,255,0.09) 0, transparent 3px),
                repeating-radial-gradient(circle at 70% 50%, rgba(255,255,255,0.06) 0, transparent 2px),
                repeating-radial-gradient(circle at 45% 75%, rgba(255,255,255,0.07) 0, transparent 4px),
                repeating-radial-gradient(circle at 10% 80%, rgba(255,255,255,0.05) 0, transparent 3px)
              `,
              backgroundSize: '100px 100px, 80px 80px, 120px 120px, 90px 90px',
            }}
          />
        </div>

        {/* ── 阶段4: 终端画面浮现 (900-1700ms，白点早已消失) ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            animation: 'crt-content-fade-in 0.8s ease-out forwards',
            animationDelay: '0.9s',
            opacity: 0,
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-14 w-14 rounded-lg border border-primary/25 flex items-center justify-center"
              style={{
                background: 'rgba(0,210,245,0.08)',
                boxShadow: '0 0 30px rgba(0,210,245,0.15)',
              }}
            >
              <Terminal className="h-7 w-7 text-primary/70" />
            </div>
            <h1 className="mono-text text-sm tracking-[0.3em] text-primary/50 text-glow-cyan">
              TERMINAL_SARCO-ID-07
            </h1>
            <p className="mono-text text-[10px] text-muted-foreground/20">
              v1.7.3 // R.I. SECURE CHANNEL
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
              <span className="mono-text text-[9px] text-muted-foreground/15 tracking-wider">
                ESTABLISHING_ENCRYPTED_LINK...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-foreground relative overflow-hidden"
      style={{ animation: 'crt-flicker 12s linear infinite' }}>
      
      {/* ── 第0层: 数据雨背景 (Matrix风格，极其暗淡) ── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.04]">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute top-0 mono-text text-[10px] text-primary/60 leading-none whitespace-nowrap"
            style={{
              left: `${5 + i * 12}%`,
              animation: `matrix-rain ${6 + (i % 4) * 3}s linear infinite`,
              animationDelay: `${i * 1.5}s`,
            }}>
            {Array.from({length: 30}, () => 
              String.fromCharCode(0x30A0 + Math.random() * 96)
            ).join('\n')}
          </div>
        ))}
      </div>

      {/* ── 第1层: 六角网格底纹 ── */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.025] hex-grid-bg" 
        style={{ backgroundSize: '40px 40px' }} />

      {/* ── 第2层: CRT球面暗角 ── */}
      <div className="absolute inset-0 pointer-events-none z-[1] crt-vignette" />

      {/* ── 第3层: 扫描线 ── */}
      <div className="absolute inset-0 pointer-events-none z-[2] overflow-hidden opacity-[0.025]">
        <div className="absolute inset-0 bg-repeat-y"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,210,245,0.12) 1px, transparent 1px)',
            backgroundSize: '100% 4px',
            animation: 'scan-line 8s linear infinite',
          }} />
      </div>

      {/* ── 第4层: 氛围粒子（三种变体） ── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* 近景快粒子 */}
        {[...Array(8)].map((_, i) => (
          <div key={`fast-${i}`} className="absolute rounded-full"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${85 + Math.random() * 15}%`,
              width: `${1.5 + Math.random() * 2}px`,
              height: `${1.5 + Math.random() * 2}px`,
              background: '#00D4FF',
              boxShadow: '0 0 3px rgba(0,210,245,0.6)',
              animation: `particle-float ${3 + Math.random() * 3}s ease-out infinite`,
              animationDelay: `${Math.random() * 6}s`,
            }}
          />
        ))}
        {/* 中景飘移粒子 */}
        {[...Array(6)].map((_, i) => (
          <div key={`drift-${i}`} className="absolute rounded-full"
            style={{
              left: `${5 + Math.random() * 90}%`,
              top: `${70 + Math.random() * 30}%`,
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              background: 'rgba(0,210,245,0.3)',
              boxShadow: '0 0 6px rgba(0,210,245,0.2)',
              animation: `particle-drift ${5 + Math.random() * 7}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 8}s`,
            }}
          />
        ))}
        {/* 远景大粒子 — 长距离缓慢上浮 */}
        {[...Array(4)].map((_, i) => (
          <div key={`deep-${i}`} className="absolute rounded-full"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${90 + Math.random() * 10}%`,
              width: `${3 + Math.random() * 5}px`,
              height: `${3 + Math.random() * 5}px`,
              background: 'rgba(0,210,245,0.15)',
              boxShadow: '0 0 10px rgba(0,210,245,0.08)',
              animation: `particle-float-deep ${8 + Math.random() * 10}s linear infinite`,
              animationDelay: `${Math.random() * 12}s`,
            }}
          />
        ))}
      </div>


      {/* ── Back link + 顶栏 ── */}
      <div className="relative z-20 p-4 flex items-center justify-between" style={{
        animation: 'crt-content-fade-in 0.6s ease-out forwards',
        animationDelay: '0.3s',
        opacity: 0,
      }}>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-muted-foreground/25 hover:text-primary/50 transition-colors duration-700 text-sm mono-text"
        >
          <ArrowLeft className="h-3 w-3" />
          &lt; DISCONNECT
        </Link>
        {/* 顶栏右侧系统时间 */}
        <div className="flex items-center gap-4 mono-text text-[10px] text-muted-foreground/20">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500/40 animate-status-dot" />
            SYS.ONLINE
          </span>
          <span className="text-muted-foreground/10">|</span>
          <span>SARC-ID-07</span>
        </div>
      </div>

      {/* ── 主区域: HUD边栏 + 终端核心 ── */}
      <div className="relative z-10 flex items-start justify-center px-4 gap-4" style={{ minHeight: 'calc(100vh - 120px)' }}>
        
        {/* 左侧 HUD 状态面板 */}
        <div className="hidden xl:flex flex-col gap-5 w-40 pt-8 shrink-0"
          style={{
            animation: 'crt-content-fade-in 0.8s ease-out forwards',
            animationDelay: '0.5s',
            opacity: 0,
          }}>
          {/* 系统指标 */}
          <div className="p-3 rounded-lg border border-primary/10" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <div className="mono-text text-[9px] text-primary/30 tracking-[0.2em] mb-2">SYS_METRICS</div>
            {[
              { label: 'CPU', val: '23%', bar: 23 },
              { label: 'MEM', val: '41%', bar: 41 },
              { label: 'NET', val: '7%',  bar: 7 },
              { label: 'ENC', val: '100%', bar: 100, accent: true },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-2 mb-1.5">
                <span className="mono-text text-[9px] text-muted-foreground/30 w-7">{m.label}</span>
                <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(0,210,245,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${m.bar}%`, 
                      background: m.accent ? 'rgba(0,210,245,0.5)' : 'rgba(0,210,245,0.2)',
                      boxShadow: m.accent ? '0 0 4px rgba(0,210,245,0.3)' : 'none',
                    }} />
                </div>
                <span className={`mono-text text-[8px] ${m.accent ? 'text-primary/50' : 'text-muted-foreground/25'}`}>{m.val}</span>
              </div>
            ))}
          </div>
          {/* 连接状态 */}
          <div className="p-3 rounded-lg border border-primary/10" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <div className="mono-text text-[9px] text-primary/30 tracking-[0.2em] mb-2">CHANNEL</div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/50 animate-status-dot" />
              <span className="mono-text text-[9px] text-green-400/40">SECURE</span>
            </div>
            <div className="mono-text text-[8px] text-muted-foreground/15 leading-relaxed">
              AES-256-GCM<br/>
              PFS/TLS 1.3<br/>
              NODE_07_ACTIVE
            </div>
          </div>
        </div>

        {/* 中央终端核心 */}
        <div className="w-full max-w-2xl mx-auto pt-4">
          {/* Post-boot fade-in wrapper */}
          <div style={{
            animation: 'crt-content-fade-in 0.8s ease-out forwards',
            opacity: 0,
          }}>
          {/* Sarcophagus Unit */}
          <div
            onAnimationEnd={handleAnimationEnd}
            className={`
              relative border rounded-2xl p-8 md:p-10 transition-all duration-1000
              ${animationType === 'unlock' ? 'animate-sarcophagus-unlock' : ''}
              ${animationType === 'fail' ? 'animate-sarcophagus-fail' : ''}
            `}
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(0,210,245,0.06) 0%, rgba(0,0,0,0.55) 70%)',
              borderColor: 'rgba(0,210,245,0.15)',
              boxShadow: `
                0 0 80px rgba(0,210,245,0.04), 
                0 0 40px rgba(0,210,245,0.06),
                inset 0 1px 0 rgba(0,210,245,0.05),
                inset 0 0 60px rgba(0,210,245,0.02)
              `,
            }}
          >
            {/* ── 扫描边框 SVG ── */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ borderRadius: 'inherit' }}>
              <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="15" ry="15"
                fill="none" stroke="rgba(0,210,245,0.08)" strokeWidth="0.5"
                strokeDasharray="40 200" strokeDashoffset="400"
                style={{ animation: 'border-scan 8s linear infinite' }} />
            </svg>

            {/* Corner ornaments — 增强版 */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-primary/40 rounded-tl-xl" 
              style={{ boxShadow: '-2px -2px 8px rgba(0,210,245,0.1)' }} />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-primary/40 rounded-tr-xl"
              style={{ boxShadow: '2px -2px 8px rgba(0,210,245,0.1)' }} />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-primary/40 rounded-bl-xl"
              style={{ boxShadow: '-2px 2px 8px rgba(0,210,245,0.1)' }} />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-primary/40 rounded-br-xl"
              style={{ boxShadow: '2px 2px 8px rgba(0,210,245,0.1)' }} />

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg border border-primary/30 flex items-center justify-center ${animationType === 'unlock' ? 'animate-sarcophagus-rune-glow-cyan' : ''}`}
                  style={{ 
                    background: 'rgba(0,210,245,0.06)',
                    boxShadow: '0 0 16px rgba(0,210,245,0.08), inset 0 0 8px rgba(0,210,245,0.04)',
                  }}>
                  <Terminal className="h-5 w-5 text-primary/70" />
                </div>
                <div>
                  <h1 className="mono-text text-sm tracking-[0.3em] text-primary/70 text-crt-chromatic">
                    TERMINAL_SARCO-ID-07
                  </h1>
                  <p className="mono-text text-[10px] text-muted-foreground/40 mt-0.5">
                    v1.7.3 // R.I. SECURE CHANNEL
                  </p>
                </div>
              </div>
              {/* Admin access link — barely visible */}
              {user?.role === 'admin' && (
                <Link
                  to="/sarcophagus/admin"
                  className="mono-text text-[9px] text-muted-foreground/15 hover:text-primary/30 transition-all duration-700"
                >
                  ROOT_ACCESS
                </Link>
              )}
            </div>

            {/* Terminal Output */}
            <div
              className={`
                mb-6 p-4 rounded-lg border border-primary/10 font-mono text-xs md:text-sm leading-relaxed
                overflow-y-auto transition-all duration-500 relative
                ${animationType === 'fail' ? 'animate-sarcophagus-core-pulse-red' : ''}
              `}
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 100%)',
                minHeight: '180px',
                maxHeight: '320px',
                borderLeft: '1px solid rgba(0,210,245,0.08)',
                borderRight: '1px solid rgba(0,210,245,0.08)',
              }}
            >
              {/* 内部水平分隔线 */}
              <div className="absolute top-0 left-4 right-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,210,245,0.06), transparent)' }} />
              <div className="absolute bottom-0 left-4 right-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,210,245,0.04), transparent)' }} />
              
              <div className="text-primary/50 mb-2 mono-text text-[10px]">
                // SARCOPHAGUS REMOTE TERMINAL v1.7.3 //
              </div>
              <div className="text-muted-foreground/50 mono-text text-[10px] mb-3">
                // 输入访问代码以建立远程协议连接 //
              </div>
              {output.length === 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-primary/60 mono-text text-xs">_</span>
                  <span className="text-muted-foreground/30 mono-text text-xs">STANDBY</span>
                  <span className="w-2 h-4 bg-primary/40 animate-terminal-cursor inline-block align-middle ml-0.5" 
                    style={{ display: 'inline-block' }} />
                </div>
              ) : (
                output.map((line, i) => (
                  <div
                    key={i}
                    className={`mono-text text-xs md:text-sm mb-0.5 ${
                      line.includes('AUTH_OK') || line.includes('DL_START')
                        ? 'text-green-400/80 drop-shadow-[0_0_6px_rgba(74,222,128,0.3)]'
                        : line.includes('ERROR') || line.includes('AUTH_FAIL') || line.includes('NET_ERR')
                          ? 'text-red-400/80'
                          : 'text-primary/60'
                    }`}
                    style={{
                      opacity: 0,
                      animation: `code-stagger-in 0.5s ease-out forwards`,
                      animationDelay: `${i * 500 + 200}ms`,
                    }}
                  >
                    {line}
                  </div>
                ))
              )}
              {loading && (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="h-3 w-3 text-primary/60 animate-spin" />
                  <span className="text-primary/40 mono-text text-xs">PROCESSING...</span>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="flex items-center gap-3">
              <span className="text-primary/50 mono-text text-sm shrink-0 animate-pulse-glow">&gt;</span>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="AUTH_CODE_REQUIRED..."
                disabled={isAnimating || loading}
                className="flex-1 bg-transparent border-none outline-none text-primary/80 placeholder:text-muted-foreground/15
                           mono-text text-sm py-2 disabled:opacity-40 tracking-widest uppercase"
                autoFocus
              />
              <button
                onClick={handleVerify}
                disabled={isAnimating || loading}
                className="mono-text text-xs px-4 py-2 rounded-lg border border-primary/25 text-primary/55
                           hover:bg-primary/10 hover:text-primary/95 hover:border-primary/50 hover:shadow-[0_0_12px_rgba(0,210,245,0.15)]
                           disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
              >
                {loading ? '...' : 'EXEC'}
              </button>
            </div>

            {/* Sealed indicator */}
            <div className={`mt-6 flex items-center justify-center gap-2 ${animationType === 'unlock' ? 'animate-sarcophagus-seal-break' : ''}`}>
              <div className="h-px flex-1 bg-primary/10" />
              <Shield className={`h-3 w-3 ${animationType === 'unlock' ? 'text-green-400' : animationType === 'fail' ? 'text-red-400' : 'text-primary/20'}`} />
              <span className={`mono-text text-[9px] tracking-[0.2em] transition-colors duration-700 ${
                animationType === 'unlock' ? 'text-green-400/60' : animationType === 'fail' ? 'text-red-400/60' : 'text-primary/15'
              }`}>
                {animationType === 'unlock' ? 'CONNECTION_ESTABLISHED' : animationType === 'fail' ? 'CONNECTION_REJECTED' : 'SECURE_CHANNEL_SEALED'}
              </span>
              <div className="h-px flex-1 bg-primary/10" />
            </div>
          </div>
          </div> {/* end post-boot fade-in wrapper */}
        </div> {/* end central terminal */}
      </div> {/* end HUD + terminal row */}

      {/* ─── Download Modal ─── */}
      {showModal && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ${
            modalPhase === 'open' ? 'bg-black/75 backdrop-blur-sm' : 'bg-transparent'
          }`}
        >
          {/* 模态扫描线 */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.015]" style={{
            background: 'repeating-linear-gradient(to bottom, rgba(0,210,245,0.3) 0px, transparent 1px, transparent 4px)',
          }} />
          <div
            className={`
              relative w-full max-w-sm rounded-xl border border-primary/30 p-6 transition-all duration-500 z-10
              ${modalPhase === 'open' ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}
            `}
            style={{
              background: 'radial-gradient(ellipse at 30% 0%, rgba(0,210,245,0.05) 0%, rgba(5,10,18,0.96) 60%)',
              boxShadow: '0 0 60px rgba(0,210,245,0.15), 0 0 120px rgba(0,210,245,0.05), inset 0 1px 0 rgba(0,210,245,0.04)',
            }}
          >
            <button
              onClick={() => { setShowModal(false); setModalPhase('closed'); }}
              className="absolute top-3 right-3 text-muted-foreground/30 hover:text-primary/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <Download className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h3 className="mono-text text-sm tracking-wider text-green-400/90 text-glow-cyan">协议数据包已就绪</h3>
                <p className="mono-text text-[10px] text-muted-foreground/40 mt-0.5">R.I. TRANSMISSION PROTOCOL</p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-amber-500/10 mb-4" style={{ background: 'rgba(245,158,11,0.04)' }}>
              <p className="text-[11px] text-amber-400/60 mono-text">
                ⚠ 本链接5分钟内有效，请在失效前完成下载。数据通道仅可单次建立，请谨慎操作。
              </p>
            </div>

            <button
              onClick={handleDownload}
              className="w-full py-3 rounded-lg border border-primary/30 text-primary/80 mono-text text-sm
                         hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all duration-300
                         flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              下载协议数据
            </button>
          </div>
        </div>
      )}

      {/* ─── Error Modal ─── */}
      {errorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div
            className="relative w-full max-w-sm rounded-xl border border-red-500/15 p-6"
            style={{
              background: 'radial-gradient(ellipse at 30% 0%, rgba(239,68,68,0.04) 0%, rgba(6,4,4,0.96) 60%)',
              boxShadow: '0 0 50px rgba(239,68,68,0.1), inset 0 1px 0 rgba(239,68,68,0.03)',
            }}
          >
            <button
              onClick={() => setErrorModal(false)}
              className="absolute top-3 right-3 text-muted-foreground/30 hover:text-red-400/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="mono-text text-sm tracking-wider text-red-400/90">验证失败</h3>
                <p className="mono-text text-[10px] text-red-400/30 mt-0.5">AUTHENTICATION_REJECTED</p>
              </div>
            </div>

            <p className="text-[11px] text-red-400/50 mono-text mb-4">{errorMessage}</p>

            <button
              onClick={() => setErrorModal(false)}
              className="w-full py-2.5 rounded-lg border border-red-500/20 text-red-400/70 mono-text text-xs
                         hover:bg-red-500/5 hover:border-red-500/30 transition-all duration-300"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
