import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import {
  FileText,
  Puzzle,
  BookOpen,
  Shield,
  Users,
  Clock,
  ChevronRight,
  Sparkles,
  Terminal,
} from 'lucide-react';

const mockRecords = [
  { id: '1', title: '第七章隐藏剧情解密', date: '2026-06-15', importance: 'critical' as const, tags: ['主线剧情', '密码学'] },
  { id: '2', title: '源石技艺符号体系分析', date: '2026-06-12', importance: 'important' as const, tags: ['符号学', '世界观'] },
  { id: '3', title: '罗德岛加密通信破解', date: '2026-06-08', importance: 'normal' as const, tags: ['通信协议', '加密'] },
];

const mockPuzzles = [
  { id: '1', title: '源石结晶排列谜题', difficulty: 'hard' as const, status: 'unsolved' as const, author: 'Dr.Kuro' },
  { id: '2', title: '莱茵生命实验编号', difficulty: 'medium' as const, status: 'solved' as const, author: 'Exusiai' },
  { id: '3', title: '深海猎人坐标推演', difficulty: 'extreme' as const, status: 'unsolved' as const, author: 'Skadi' },
];

const difficultyColors = {
  easy: 'bg-green-500/10 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  hard: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  extreme: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const importanceColors = {
  normal: 'bg-secondary text-muted-foreground',
  important: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  critical: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background hex-grid-bg">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Hero Section */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-2xl blur-xl" />
          <div className="relative glass-card rounded-2xl p-8 border-glow">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Terminal className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-glow-cyan">
                  欢迎回来，{user?.username}
                </h1>
                <p className="text-sm text-muted-foreground mono-text">
                  &gt; 连接至罗德岛解密数据库 // 当前状态: 在线
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: FileText, label: '解密记录', value: '47', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
            { icon: Puzzle, label: '自制谜题', value: '23', color: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
            { icon: BookOpen, label: 'Wiki词条', value: '156', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { icon: Users, label: '群成员', value: '89', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
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
              {mockRecords.map((record) => (
                <Link
                  key={record.id}
                  to="/records"
                  className="block p-3 rounded-lg border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{record.title}</h4>
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

          {/* Recent Puzzles */}
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
              {mockPuzzles.map((puzzle) => (
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
                        {(puzzle.difficulty as string) === 'easy' ? '简单' : puzzle.difficulty === 'medium' ? '中等' : puzzle.difficulty === 'hard' ? '困难' : '极难'}
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
        <div className="mt-8 glass-card rounded-2xl p-6 border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-semibold">快速入口</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: FileText, label: '浏览记录', path: '/records', desc: '查看群内所有解密成果' },
              { icon: Puzzle, label: '挑战谜题', path: '/puzzles', desc: '参与自制谜题解答' },
              { icon: BookOpen, label: '查阅Wiki', path: '/wiki', desc: '浏览解密知识库' },
              { icon: Shield, label: '关于石棺', path: '/', desc: '了解解密群与规则' },
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
      </div>
    </div>
  );
}
