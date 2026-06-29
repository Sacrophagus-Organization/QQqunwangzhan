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
          apiGet<any>('/records?limit=5'),
          apiGet<any>('/puzzles?limit=5'),
          apiGet<any>('/wiki?limit=5'),
          apiGet<any[]>('/admin/users').catch(() => []),
        ]);
        setRecords((recs as any).data || []);
        setPuzzles((puzs as any).data || []);
        setWikiCount((wiki as any).data?.length || 0);
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
    <div className="min-h-screen bg-background hex-grid-bg dna-helix-bg glitch-burst">
      {/* 装饰性菱形碎片背景 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] w-16 h-16 rhombus opacity-10 animate-float-soft" style={{ animationDelay: '0s' }} />
        <div className="absolute top-[25%] right-[8%] w-12 h-12 rhombus opacity-[0.08] animate-float-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[30%] left-[12%] w-20 h-20 rhombus opacity-[0.08] animate-float-soft" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[60%] right-[15%] w-14 h-14 rhombus opacity-10 animate-float-soft" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-[15%] right-[25%] w-10 h-10 rhombus opacity-[0.07] animate-float-soft" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-[45%] left-[50%] w-24 h-24 rhombus opacity-[0.05] animate-float-soft" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-[45%] right-[45%] w-14 h-14 rhombus opacity-[0.06] animate-float-soft" style={{ animationDelay: '2.5s' }} />
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8 relative z-10">
        {/* ═══ Hero Section — 左右不对称分割布局 ═══ */}
        <div className="relative mb-10 overflow-hidden rounded-2xl anim-blur-in">
          <div className="flex flex-col md:flex-row min-h-[280px] lg:min-h-[320px]">
            {/* 左侧 65%: 超大展示文字 — 确保不被右侧遮挡 */}
            <div className="md:w-[65%] flex flex-col justify-center p-8 lg:p-12 relative z-20">
              <div className="space-y-4 pr-4">
                <div>
                  <h1 className="font-display font-black leading-none tracking-wider"
                    style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)' }}>
                    <span className="text-gradient-flow">SARC</span><span className="text-foreground/80">OPHAGUS</span>
                  </h1>
                  <div className="mt-2 h-1 w-24 bg-gradient-to-r from-primary to-transparent rounded-full" />
                </div>
                <p className="font-heading text-lg lg:text-xl text-foreground/70 tracking-wide">
                  石棺解密数据库在线
                </p>
                <p className="mono-text text-xs text-muted-foreground/60 mt-2">
                  &gt; sarcophagus.org.cn // R.I. REMOTE ACCESS // 欢迎回来, <span className="text-primary font-medium">{user?.username}</span>
                </p>
                <p className="text-sm text-muted-foreground/70 mt-3 max-w-lg leading-relaxed">
                  当前数据库中包含 <span className="text-primary font-semibold">{records.length}</span> 条解密记录、
                  <span className="text-accent font-semibold">{puzzles.length}</span> 个谜题、
                  <span className="text-amber-400 font-semibold">{wikiCount}</span> 个 Wiki 词条，
                  <span className="text-green-400 font-semibold">{memberCount || 0}</span> 位活跃成员在线协作。
                </p>
              </div>
            </div>

            {/* 右侧 35%: 源石冷青实色色块 + 光孔阵列 + 用户信息 */}
            <div className="md:w-[35%] hero-cyan-block sarcophagus-lights flex items-center p-8 lg:p-10 relative z-10">
              <div className="relative z-10 space-y-5 w-full">
                <div>
                  <p className="text-[10px] tracking-[0.35em] text-primary/50 mono-text uppercase">Operator Status</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="rhombus-icon-box shrink-0">
                      <Terminal className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-lg text-foreground/90">{user?.username}</p>
                      <p className="text-xs text-muted-foreground mono-text">ID: {user?.id || '--'} // ACTIVE</p>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <Link to="/sarcophagus" className="block group">
                    <p className="text-[9px] text-muted-foreground/40 mono-text text-center tracking-[0.25em] transition-all duration-300 group-hover:text-primary/60 group-hover:tracking-[0.35em]">
                      TERMINAL_SARCO-ID-07 &middot; v1.7.3 &middot; STANDBY
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid — 放大数字 + 菱形图标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          {[
            { icon: FileText, label: '解密记录', value: records.length, color: 'text-primary', bg: 'bg-primary/5 border-primary/15', barColor: 'bg-primary/40', iconBg: 'bg-primary/10' },
            { icon: Puzzle, label: '自制谜题', value: puzzles.length, color: 'text-accent', bg: 'bg-accent/5 border-accent/15', barColor: 'bg-accent/40', iconBg: 'bg-accent/10' },
            { icon: BookOpen, label: 'Wiki词条', value: wikiCount, color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/15', barColor: 'bg-amber-500/40', iconBg: 'bg-amber-500/10' },
            { icon: Users, label: '活跃成员', value: memberCount || 0, color: 'text-green-400', bg: 'bg-green-500/5 border-green-500/15', barColor: 'bg-green-500/40', iconBg: 'bg-green-500/10' },
          ].map((stat, i) => (
            <Card key={i} className={`${stat.bg} border backdrop-blur-sm hover:-translate-y-1 transition-all duration-300 group overflow-hidden card-glow-border anim-fade-up`} style={{ animationDelay: `${i * 0.08}s` }}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`rhombus-icon-box ${stat.iconBg} shrink-0`} style={{ width: 36, height: 36 }}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className={`text-3xl font-bold ${stat.color} mono-text`}>
                      <CountingNumber value={stat.value} />
                    </p>
                    <p className="text-xs text-muted-foreground font-heading">{stat.label}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-4 h-1 w-full bg-border/30 rounded-full overflow-hidden">
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
                <div className="rhombus-icon-box bg-primary/10" style={{ width: 28, height: 28 }}>
                  <FileText className="h-3.5 w-3.5 text-primary" />
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
                <div className="rhombus-icon-box bg-accent/10" style={{ width: 28, height: 28 }}>
                  <Puzzle className="h-3.5 w-3.5 text-accent" />
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

        {/* Bottom Quick Links — 横向条状风格 */}
        <div className="mt-8 glass-card rounded-2xl p-6 border-border/50 stone-texture anim-fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="h-5 w-5 text-amber-400 animate-float-soft" />
            <h3 className="font-heading text-base font-semibold tracking-wide">快速入口</h3>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { icon: FileText, label: '浏览记录', path: '/records', desc: '查看群内解密成果', color: 'text-primary', borderColor: 'hover:border-primary/25 hover:bg-primary/[0.02]' },
              { icon: Puzzle, label: '挑战谜题', path: '/puzzles', desc: '参与自制谜题解答', color: 'text-accent', borderColor: 'hover:border-accent/25 hover:bg-accent/[0.02]' },
              { icon: BookOpen, label: '查阅Wiki', path: '/wiki', desc: '浏览解密知识库', color: 'text-amber-400', borderColor: 'hover:border-amber-500/25 hover:bg-amber-500/[0.02]' },
              { icon: MessagesSquare, label: '留言板', path: '/messages', desc: '发表和查看留言', color: 'text-purple-400', borderColor: 'hover:border-purple-500/25 hover:bg-purple-500/[0.02]' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Link
                  key={i}
                  to={item.path}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl border border-border/25 transition-all duration-200 group anim-fade-up ${item.borderColor}`}
                  style={{ animationDelay: `${0.35 + i * 0.08}s` }}
                >
                  <div className={`rhombus-icon-box shrink-0`} style={{ width: 32, height: 32 }}>
                    <Icon className={`h-3.5 w-3.5 text-muted-foreground group-hover:${item.color} transition-colors`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium font-heading group-hover:text-foreground transition-colors">{item.label}</span>
                    <span className="text-xs text-muted-foreground ml-3 hidden sm:inline">{item.desc}</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground/30 group-hover:${item.color} transition-all duration-200 group-hover:translate-x-1`} />
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
