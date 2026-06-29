import { useState, useEffect } from 'react';
import { apiGet } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { Terminal, Users, FileText, Puzzle } from 'lucide-react';

interface TickerData {
  recordCount: number;
  puzzleCount: number;
  memberCount: number;
}

export function NotificationTicker() {
  const { user } = useAuth();
  const [data, setData] = useState<TickerData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const fetches: Promise<any>[] = [
          apiGet<any>('/records').catch(() => ({ data: [] })),
          apiGet<any>('/puzzles').catch(() => ({ data: [] })),
        ];
        // 仅登录用户（admin）才请求成员数据，避免访客 401 报错
        if (user?.role === 'admin') {
          fetches.push(apiGet<any[]>('/admin/users').catch(() => []));
        } else {
          fetches.push(Promise.resolve([]));
        }

        const [recs, puzs, members] = await Promise.all(fetches);
        setData({
          recordCount: Array.isArray(recs?.data) ? recs.data.length : (Array.isArray(recs) ? recs.length : 0),
          puzzleCount: Array.isArray(puzs?.data) ? puzs.data.length : (Array.isArray(puzs) ? puzs.length : 0),
          memberCount: Array.isArray(members) ? members.filter((u: any) => u.status === 'active').length : 0,
        });
      } catch {}
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [user]);

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
