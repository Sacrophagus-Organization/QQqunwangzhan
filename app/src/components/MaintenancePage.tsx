import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';

export default function MaintenancePage({ redirectTo = '/', delay = 3000 }: { redirectTo?: string; delay?: number }) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate(redirectTo, { replace: true }), delay);
    return () => clearTimeout(timer);
  }, [navigate, redirectTo, delay]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20">
          <Wrench className="h-8 w-8 text-amber-400/70" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-semibold text-foreground mb-2">页面维护中</h1>
          <p className="text-muted-foreground text-sm">
            该页面正在维护，即将跳转至首页 ...
          </p>
        </div>
      </div>
    </div>
  );
}
