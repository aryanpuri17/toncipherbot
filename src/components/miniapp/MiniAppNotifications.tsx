import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Bell, ArrowDownToLine, ArrowUpFromLine, Gift, AlertCircle, Star, CheckCircle } from 'lucide-react';

const notifIcon: Record<string, React.ReactNode> = {
  deposit:    <ArrowDownToLine className="w-4 h-4" />,
  withdrawal: <ArrowUpFromLine className="w-4 h-4" />,
  reward:     <Gift className="w-4 h-4" />,
  alert:      <AlertCircle className="w-4 h-4" />,
  level:      <Star className="w-4 h-4" />,
  system:     <CheckCircle className="w-4 h-4" />,
};

const notifColor: Record<string, string> = {
  deposit:    'bg-emerald-500/20 text-emerald-400',
  withdrawal: 'bg-orange-500/20 text-orange-400',
  reward:     'bg-blue-500/20 text-blue-400',
  alert:      'bg-red-500/20 text-red-400',
  level:      'bg-amber-500/20 text-amber-400',
  system:     'bg-slate-500/20 text-slate-400',
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'À l\'instant';
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
}

export const MiniAppNotifications: React.FC = () => {
  const { notifications, currentUser, markNotificationRead, markAllNotificationsRead, setMiniAppPage } = useAppStore();

  const myNotifs = notifications
    .filter(n => !n.userId || n.userId === currentUser.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unread = myNotifs.filter(n => !n.isRead).length;

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setMiniAppPage('profile')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">←</button>
          <div>
            <h1 className="text-xl font-bold text-white">Notifications</h1>
            {unread > 0 && <p className="text-xs text-blue-400">{unread} non lue{unread !== 1 ? 's' : ''}</p>}
          </div>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            Tout lire
          </button>
        )}
      </div>

      {myNotifs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Bell className="w-10 h-10 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">Aucune notification</p>
          <p className="text-xs text-slate-600 text-center">Vos notifications apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myNotifs.map(notif => {
            const icon = notifIcon[notif.type] ?? notifIcon.system;
            const color = notifColor[notif.type] ?? notifColor.system;
            return (
              <div
                key={notif.id}
                onClick={() => !notif.isRead && markNotificationRead(notif.id)}
                className={`glass-card-light p-3.5 flex items-start gap-3 transition-all cursor-pointer ${!notif.isRead ? 'border-l-2 border-blue-500/50 bg-blue-500/[0.04]' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium leading-tight ${notif.isRead ? 'text-slate-300' : 'text-white'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-slate-600 shrink-0 mt-0.5">{timeAgo(notif.createdAt)}</span>
                  </div>
                  {notif.message && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                  )}
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
