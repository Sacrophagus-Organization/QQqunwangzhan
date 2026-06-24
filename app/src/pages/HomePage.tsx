import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { apiGet } from '@/api/client';
import { LikeButton } from '@/components/LikeButton';
import { CountingNumber } from '@/components/CountingNumber';
import { StatCardSkeleton, RecordCardSkeleton } from '@/components/Skeleton';
import {
  FileText,
  Puzzle,
  BookOpen,
  MessagesSquare,
  Users,
  Clock,
  ChevronRight,
  Sparkles,
  Terminal,
  Pin,
  AlertTriangle,
  Shield,
  Database,
  HardDrive,
  Wifi,
} from 'lucide-react';
import type { DecryptRecord, Puzzle as PuzzleType } from '@/types';

const importanceColors: Record<string, string> = {
  normal: 'bg-secondary text-muted-foreground',
  important: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  critical: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  hard: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  extreme: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const diffLabels: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难', extreme: '极难' };

export default function HomePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<DecryptRecord[]>([]);
  const [puzzles, setPuzzles] = useState<PuzzleType[]>([]);
  const [wikiCount, setWikiCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [recs, puzs, wiki, members] = await Promise.all([
          apiGet<DecryptRecord[]>('/records'),
          apiGet<PuzzleType[]>('/puzzles'),
          apiGet<any[]>('/wiki'),
          apiGet<any[]>('/admin/users').catch(() => []),
        ]);
        setRecords(recs);
        setPuzzles(puzs);
        setWikiCount(wiki.length);
        setMemberCount(members.filter((u: any) => u.status === 'active').length);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background hex-grid-bg">
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
          {/* Hero skeleton */}
          <div className="glass-card rounded-2xl p-8 animate-pulse space-y-4">
            <div className="skeleton h-8 w-64" />
            <div className="skeleton h-4 w-96" />
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          {/* Content skeleton */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="skeleton h-6 w-32" />
              {[...Array(3)].map((_, i) => <RecordCardSkeleton key={i} />)}
            </div>
            <div className="space-y-3">
              <div className="skeleton h-6 w-32" />
              {[...Array(3)].map((_, i) => <RecordCardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background hex-grid-bg">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Hero Section — Immersive Banner */}
        <div className="relative mb-10 overflow-hidden rounded-2xl anim-blur-in">
          {/* Background decoration: large rhombus core */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-accent/[0.03] to-transparent" />
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/[0.04] blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-accent/[0.03] blur-3xl" />
          {/* 顶部数据扫描线 */}
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden z-10 pointer-events-none">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary/70 to-transparent animate-data-sweep" />
          </div>

          <div className="relative card-elevated card-glow-border group rounded-2xl p-6 sm:p-8 stone-texture">
            <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
              {/* Left: Welcome & Terminal Icon */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center animate-breathe-glow transition-transform duration-500 group-hover:rotate-12">
                    <Terminal className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-gradient-flow">
                      欢迎回来，{user?.username}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground/80 mono-text mt-0.5">
                      &gt; sarcophagus.org.cn // 罗德岛解密数据库在线
                    </p>
                  </div>
                </div>
                {/* Quick summary */}
                <p className="text-sm text-muted-foreground/90 mt-3 max-w-xl leading-relaxed">
                  当前数据库中包含 <span className="text-primary font-medium">{records.length}</span> 条解密记录、
                  <span className="text-accent font-medium">{puzzles.length}</span> 个谜题、
                  <span className="text-amber-400 font-medium">{wikiCount}</span> 个 Wiki 词条，
                  <span className="text-green-400 font-medium">{memberCount}</span> 位活跃成员在线协作。
                </p>
              </div>

              {/* Right: Status Panel — 弱化为纯装饰 */}
              <div className="lg:w-48 shrink-0 opacity-50 hover:opacity-90 transition-opacity duration-500">
                <p className="text-[9px] tracking-[0.3em] text-muted-foreground/40 mono-text mb-1.5 hidden lg:block">// SYSTEM STATUS</p>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                  {[
                    { icon: Wifi, label: '终端在线', value: 'ONLINE', color: 'text-green-400' },
                    { icon: Database, label: '数据库', value: 'v2.1', color: 'text-primary' },
                    { icon: Shield, label: '加密协议', value: 'TLS-AES', color: 'text-amber-400' },
                    { icon: HardDrive, label: '节点延迟', value: '< 12ms', color: 'text-muted-foreground' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-secondary/30 border border-border/15">
                      <item.icon className={`h-3 w-3 ${item.color} shrink-0 animate-twinkle`} style={{ animationDelay: `${i * 0.4}s` }} />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground/60 truncate">{item.label}</p>
                        <p className={`text-[10px] font-medium ${item.color} mono-text`}>{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid — with counting animation + progress bars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: FileText, label: '解密记录', value: records.length, color: 'text-primary', bg: 'bg-primary/5 border-primary/15', barColor: 'bg-primary/40', iconBg: 'bg-primary/10' },
            { icon: Puzzle, label: '自制谜题', value: puzzles.length, color: 'text-accent', bg: 'bg-accent/5 border-accent/15', barColor: 'bg-accent/40', iconBg: 'bg-accent/10' },
            { icon: BookOpen, label: 'Wiki词条', value: wikiCount, color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/15', barColor: 'bg-amber-500/40', iconBg: 'bg-amber-500/10' },
            { icon: Users, label: '活跃成员', value: memberCount || 0, color: 'text-green-400', bg: 'bg-green-500/5 border-green-500/15', barColor: 'bg-green-500/40', iconBg: 'bg-green-500/10' },
          ].map((stat, i) => (
            <Card key={i} className={`${stat.bg} border backdrop-blur-sm hover:-translate-y-1 transition-all duration-300 group overflow-hidden card-glow-border anim-fade-up`} style={{ animationDelay: `${i * 0.08}s` }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                    <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${stat.color} mono-text animate-count-up`}>
                      <CountingNumber value={stat.value} />
                    </p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-0.5 w-full bg-border/30 rounded-full overflow-hidden">
                  <div className={`h-full ${stat.barColor} rounded-full transition-all duration-1000`}
                    style={{ width: `${Math.min((stat.value as number / Math.max(records.length, puzzles.length, wikiCount, Number(memberCount), 1)) * 100, 100)}%` }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Records */}
          <Card className="glass-card glass-card-hover border-border/50 overflow-hidden anim-fade-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/15">
              <CardTitle className="font-heading text-base flex items-center gap-2 tracking-wide">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                近期解密记录
              </CardTitle>
              <Link to="/records" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                查看全部 <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/10">
              {records.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">暂无记录</p>
              ) : records.slice(0, 5).map((record) => (
                <Link
                  key={record.id}
                  to={`/records/${record.id}`}
                  className={`block px-4 py-3 hover:bg-primary/[0.03] transition-all duration-200 group ${
                    record.importance === 'critical' ? 'archive-band-critical' :
                    record.importance === 'important' ? 'archive-band-important' :
                    'archive-band-normal'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {record.pinned ? <Pin className="h-3 w-3 text-amber-400 shrink-0" /> : null}
                        {record.importance === 'critical' ? <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" /> : null}
                        <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">{record.title}</h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{record.date}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${importanceColors[record.importance]}`}>
                      {record.importance === 'critical' ? '关键' : record.importance === 'important' ? '重要' : '普通'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5" onClick={e => e.preventDefault()}>
                    <LikeButton entityType="record" entityId={record.id} likeCount={record.likeCount} size="sm" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Active Puzzles */}
          <Card className="glass-card glass-card-hover border-border/50 overflow-hidden anim-fade-up" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/15">
              <CardTitle className="font-heading text-base flex items-center gap-2 tracking-wide">
                <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center">
                  <Puzzle className="h-4 w-4 text-accent" />
                </div>
                活跃谜题
              </CardTitle>
              <Link to="/puzzles" className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors">
                查看全部 <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/10">
              {puzzles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">暂无谜题</p>
              ) : puzzles.slice(0, 5).map((puzzle) => (
                <Link
                  key={puzzle.id}
                  to="/puzzles"
                  className={`block px-4 py-3 hover:bg-accent/[0.03] transition-all duration-200 group ${
                    puzzle.status === 'solved' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate group-hover:text-accent transition-colors">{puzzle.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">by {puzzle.author}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-xs ${difficultyColors[puzzle.difficulty] || ''}`}>
                        {diffLabels[puzzle.difficulty] || puzzle.difficulty}
                      </Badge>
                      {/* Seal-style status */}
                      <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-sm border ${
                        puzzle.status === 'solved'
                          ? 'text-green-400/70 border-green-500/20 bg-green-500/5'
                          : 'text-red-400/70 border-red-500/20 bg-red-500/5'
                      }`} style={{transform: 'rotate(-5deg)'}}>
                        {puzzle.status === 'solved' ? 'SOLVED' : 'OPEN'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5" onClick={e => e.preventDefault()}>
                    <LikeButton entityType="puzzle" entityId={puzzle.id} likeCount={puzzle.likeCount} size="sm" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Quick Links */}
        <div className="mt-8 glass-card rounded-2xl p-6 border-border/50 stone-texture anim-fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="h-5 w-5 text-amber-400 animate-float-soft" />
            <h3 className="font-heading text-base font-semibold tracking-wide">快速入口</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: FileText, label: '浏览记录', path: '/records', desc: '查看群内解密成果', color: 'text-primary' },
              { icon: Puzzle, label: '挑战谜题', path: '/puzzles', desc: '参与自制谜题解答', color: 'text-accent' },
              { icon: BookOpen, label: '查阅Wiki', path: '/wiki', desc: '浏览解密知识库', color: 'text-amber-400' },
              { icon: MessagesSquare, label: '留言板', path: '/messages', desc: '发表和查看留言', color: 'text-purple-400' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Link
                  key={i}
                  to={item.path}
                  className="tilt-3d card-glow-border flex flex-col items-center text-center p-4 rounded-xl border border-border/25 hover:border-primary/25 hover:bg-primary/[0.03] transition-all duration-200 group anim-fade-up"
                  style={{ animationDelay: `${0.35 + i * 0.08}s` }}
                >
                  <div className={`h-9 w-9 rounded-lg bg-secondary/50 flex items-center justify-center mb-2 group-hover:bg-secondary transition-colors`}>
                    <Icon className={`h-4.5 w-4.5 text-muted-foreground group-hover:${item.color} transition-colors`} />
                  </div>
                  <span className="text-sm font-medium group-hover:text-foreground transition-colors">{item.label}</span>
                  <span className="text-xs text-muted-foreground mt-1">{item.desc}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 隐蔽终端入口 — 系统诊断残留文本 */}
        <div className="mt-12 text-center border-t border-primary/5 pt-6">
          <Link
            to="/sarcophagus"
            className="mono-text text-[11px] tracking-[0.35em] text-muted-foreground/30
                       hover:text-primary/60 transition-all duration-1000
                       cursor-default hover:cursor-pointer select-none"
            title="远程终端协议"
          >
            TERMINAL_SARCO-ID-07&nbsp;&nbsp;·&nbsp;&nbsp;v1.7.3&nbsp;&nbsp;·&nbsp;&nbsp;R.I. REMOTE ACCESS&nbsp;&nbsp;·&nbsp;&nbsp;STANDBY
          </Link>
        </div>
      </div>
    </div>
  );
}
