import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { apiGet } from '@/api/client';
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
  Loader2,
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
          apiGet<DecryptRecord[]>('/records'),
          apiGet<PuzzleType[]>('/puzzles'),
          apiGet<any[]>('/wiki'),
          apiGet<any[]>('/admin/users').catch(() => []),
        ]);
        setRecords(recs.slice(0, 5));
        setPuzzles(puzs.slice(0, 5));
        setWikiCount(wiki.length);
        setMemberCount(members.filter((u: any) => u.status === 'active').length);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background hex-grid-bg flex items-center justify-center"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background hex-grid-bg">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Hero Section */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-2xl blur-xl" />
          <div className="relative glass-card rounded-2xl p-8 border-glow stone-texture">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center originium-pulse">
                <Terminal className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-glow-cyan">
                  欢迎回来，{user?.username}
                </h1>
                <p className="text-sm text-muted-foreground mono-text">
                  &gt; sarcophagus.org.cn // 罗德岛解密数据库在线
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: FileText, label: '解密记录', value: records.length, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
            { icon: Puzzle, label: '自制谜题', value: puzzles.length, color: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
            { icon: BookOpen, label: 'Wiki词条', value: wikiCount, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { icon: Users, label: '成员', value: memberCount || '--', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          ].map((stat, i) => (
            <Card key={i} className={`${stat.bg} border backdrop-blur-sm`}>
              <CardContent className="p-4 flex items-center gap-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Records */}
          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                近期解密记录
              </CardTitle>
              <Link to="/records" className="text-xs text-primary hover:underline flex items-center gap-1">
                查看全部 <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {records.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">暂无记录</p>
              ) : records.map((record) => (
                <Link
                  key={record.id}
                  to={`/records/${record.id}`}
                  className="block p-3 rounded-lg border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {record.pinned ? <Pin className="h-3 w-3 text-amber-400 shrink-0" /> : null}
                        {record.importance === 'critical' ? <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" /> : null}
                        <h4 className="text-sm font-medium truncate">{record.title}</h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{record.date}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${importanceColors[record.importance]}`}>
                      {record.importance === 'critical' ? '关键' : record.importance === 'important' ? '重要' : '普通'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Active Puzzles */}
          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Puzzle className="h-5 w-5 text-accent" />
                活跃谜题
              </CardTitle>
              <Link to="/puzzles" className="text-xs text-accent hover:underline flex items-center gap-1">
                查看全部 <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {puzzles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">暂无谜题</p>
              ) : puzzles.map((puzzle) => (
                <Link
                  key={puzzle.id}
                  to="/puzzles"
                  className="block p-3 rounded-lg border border-border/30 hover:border-accent/30 hover:bg-accent/5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{puzzle.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">by {puzzle.author}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-xs ${difficultyColors[puzzle.difficulty] || ''}`}>
                        {diffLabels[puzzle.difficulty] || puzzle.difficulty}
                      </Badge>
                      <span className={`inline-block w-2 h-2 rounded-full ${puzzle.status === 'solved' ? 'bg-green-400' : 'bg-red-400'}`} />
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 glass-card rounded-2xl p-6 border-border/50 stone-texture">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-semibold">快速入口</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: FileText, label: '浏览记录', path: '/records', desc: '查看群内所有解密成果' },
              { icon: Puzzle, label: '挑战谜题', path: '/puzzles', desc: '参与自制谜题解答' },
              { icon: BookOpen, label: '查阅Wiki', path: '/wiki', desc: '浏览解密知识库' },
              { icon: MessagesSquare, label: '留言板', path: '/messages', desc: '发表和查看留言' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Link
                  key={i}
                  to={item.path}
                  className="flex flex-col items-center text-center p-4 rounded-xl border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group"
                >
                  <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground mt-1">{item.desc}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 隐蔽终端入口 — 系统诊断残留文本 */}
        <div className="mt-12 text-center">
          <Link
            to="/sarcophagus"
            className="mono-text text-[11px] tracking-[0.35em] text-muted-foreground/15
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
