import { useState, useEffect } from 'react';
import { apiGet } from '@/api/client';
import { Terminal, Users, FileText, Puzzle } from 'lucide-react';

interface TickerData {
  recordCount: number;
  puzzleCount: number;
  memberCount: number;
}

export function NotificationTicker() {
  const [data, setData] = useState<TickerData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [recs, puzs, members] = await Promise.all([
          apiGet<any[]>('/records'),
          apiGet<any[]>('/puzzles'),
          apiGet<any[]>('/admin/users').catch(() => []),
        ]);
        setData({
          recordCount: recs.length,
          puzzleCount: puzs.length,
          memberCount: members.filter((u: any) => u.status === 'active').length,
        });
      } catch {}
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { icon: Terminal, text: 'sarcophagus.org.cn' },
    { icon: FileText, text: `解密记录 ${data?.recordCount ?? '--'} 条` },
    { icon: Puzzle, text: `谜题 ${data?.puzzleCount ?? '--'} 个` },
    { icon: Users, text: `在线成员 ${data?.memberCount ?? '--'} 人` },
  ];

  return (
    <div className="w-full bg-secondary/60 border-b border-border/20 overflow-hidden">
      <div className="h-6 flex items-center">
        <div className="shrink-0 flex items-center gap-1.5 px-3 h-full bg-secondary/80 border-r border-border/30">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-status-dot" />
          <span className="text-[10px] font-bold tracking-widest text-green-400 mono-text">LIVE</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="animate-notification-scroll flex items-center gap-0 whitespace-nowrap" style={{ animationDuration: '40s' }}>
            {/* Double the content for seamless looping */}
            {[...items, ...items].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-5 text-[11px] text-muted-foreground/70 mono-text tracking-wider">
                <item.icon className="h-2.5 w-2.5 opacity-50" />
                {item.text}
                <span className="text-muted-foreground/25 mx-1">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
