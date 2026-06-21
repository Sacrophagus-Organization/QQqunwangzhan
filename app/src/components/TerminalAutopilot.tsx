import { useEffect, useRef, useState, useCallback } from 'react';

// ── 符合明日方舟设定的系统日志行 ──
const AUTO_LINES = [
  // 罗德岛 / 终端状态
  "SYS_CHECK: Originium引擎状态正常...",
  "HEARTBEAT: SARCO-ID-07 → PRTS 存活确认",
  "PATCH: 终端固件 v1.7.3 完整性校验通过",
  "STATUS: 远程协议端口 8443 监听中...",
  "DIAG: 矿石病监测网络在线 14/16节点",

  // 源石 / 结晶
  "TRACE: 源石结晶稳定度 97.3%",
  "SENSE: 神经连接模块温度 38.2°C",
  "FIELD: 源石技艺共鸣频率 2847Hz",

  // 通讯 / 中继
  "LINK: R.I.中继节点 #12 握手成功",
  "PING: 罗德岛母舰应答延迟 42ms",
  "SYNC: 数据链v3.7 与喀兰贸易同步中...",
  "RADIO: 乌萨斯频段静默，仅接收应急编码",

  // 加密 / 安全
  "CRYPT: AES-256密钥轮换完成",
  "CIPHER: 混沌加密种子已更新 — 0xA3F7",
  "AUDIT: 访客接入日志已归档 - 区块0xFF",

  // 监控 / 情报
  "MONITOR: 切尔诺伯格残骸区无异常活动",
  "SCAN: 天灾信标 #09 信号强度 +2.1dB",
  "RECV: 龙门近卫局加密通报 #AK-113",
  "ALERT: 整合运动活动信号衰减至背景噪声",
  "TRACK: 移动城邦轨迹预测 — 偏差 < 0.03%",
];

// Web Audio API 生成短促 "滴" 声
function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 880; // A5，清脆

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);

    // 播放完毕关闭 AudioContext
    osc.onended = () => ctx.close();
  } catch {
    // 静默失败
  }
}

export function TerminalAutopilot() {
  const [lines, setLines] = useState<{ id: number; text: string }[]>([]);
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNext = useCallback(() => {
    // 随机间隔 4~14 秒
    const delay = 4000 + Math.random() * 10000;
    timerRef.current = setTimeout(() => {
      const idx = Math.floor(Math.random() * AUTO_LINES.length);
      const text = AUTO_LINES[idx];
      const id = idRef.current++;

      playBeep();

      setLines(prev => {
        const next = [...prev, { id, text }];
        // 保留最近 12 行，避免终端滚屏过长
        if (next.length > 12) return next.slice(-12);
        return next;
      });

      scheduleNext();
    }, delay);
  }, []);

  useEffect(() => {
    // 首次延迟 3 秒后开始
    const initTimer = setTimeout(() => scheduleNext(), 3000);
    return () => {
      clearTimeout(initTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleNext]);

  return (
    <div className="space-y-[2px]">
      {lines.map((line) => (
        <div
          key={line.id}
          className="mono-text text-[9px] text-primary/25 leading-relaxed"
          style={{
            opacity: 0,
            animation: 'autopilot-fade-in 0.4s ease-out forwards',
          }}
        >
          &gt; {line.text}
        </div>
      ))}
    </div>
  );
}
