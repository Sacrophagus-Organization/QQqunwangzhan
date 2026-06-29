import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ForbiddenPage({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20">
          <ShieldAlert className="h-8 w-8 text-destructive/70" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-semibold text-foreground mb-2">403 Forbidden</h1>
          <p className="text-muted-foreground text-sm">
            {message || '你没有权限访问此页面。'}
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>
      </div>
    </div>
  );
}
