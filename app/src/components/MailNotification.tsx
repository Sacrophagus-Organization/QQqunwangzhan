import { useEffect, useState } from 'react';
import { Mail, X } from 'lucide-react';

interface MailNotif {
  id: string;
  fromAddress: string;
  fromName: string;
  subject: string;
}
interface Props {
  notifications: MailNotif[];
  onDismiss: (id: string) => void;
}
export function MailNotification({ notifications, onDismiss }: Props) {
  var [visible, setVisible] = useState<Record<string, boolean>>({});

  useEffect(function() {
    var next: Record<string, boolean> = {};
    notifications.forEach(function(n) { next[n.id] = true; });
    setVisible(next);
    // Auto-dismiss after 8 seconds
    var timers: ReturnType<typeof setTimeout>[] = [];
    notifications.forEach(function(n) {
      timers.push(setTimeout(function() {
        setVisible(function(prev) {
          var np = { ...prev };
          delete np[n.id];
          return np;
        });
      }, 8000));
    });
    return function() { timers.forEach(clearTimeout); };
  }, [notifications]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map(function(n) {
        var show = visible[n.id];
        return (
          <div key={n.id}
            className={'flex items-start gap-3 p-3 rounded-lg border border-primary/40 bg-card/95 backdrop-blur shadow-lg shadow-primary/10 transition-all duration-300 ' + (show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0')}>
            <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{n.fromName || n.fromAddress}</p>
              <p className="text-xs text-muted-foreground truncate">{n.subject || '(无主题)'}</p>
              <p className="text-[10px] text-primary mt-1">新邮件</p>
            </div>
            <button onClick={function() { onDismiss(n.id); }} className="shrink-0 p-0.5 hover:text-primary">
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
