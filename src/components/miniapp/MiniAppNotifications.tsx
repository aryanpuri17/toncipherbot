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

const notifColor: Record<string, { bg: string; text: string; dot: string; unreadBorder: string }> = {
  deposit:    { bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400',  unreadBorder: 'border-emerald-500/40' },
  withdrawal: { bg: 'bg-orange-500/20',  text: 'text-orange-400',  dot: 'bg-orange-400',   unreadBorder: 'border-orange-500/40'  },
  reward:     { bg: 'bg-blue-500/20',    text: 'text-blue-400',    dot: 'bg-blue-400',      unreadBorder: 'border-blue-500/40'    },
  alert:      { bg: 'bg-red-500/20',     text: 'text-red-400',     dot: 'bg-red-400',       unreadBorder: 'border-red-500/40'     },
  level:      { bg: 'bg-amber-500/20',   text: 'text-amber-400',   dot: 'bg-amber-400',     unreadBorder: 'border-amber-500/40'   },
  system:     { bg: 'bg-slate-500/20',   text: 'text-slate-400',   dot: 'bg-slate-400',     unreadBorder: 'border-slate-500/30'   },
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "À l'instant";
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`;
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMiniAppPage('profile')}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Notifications</h1>
            {unread > 0 && (
              <p className="text-xs font-medium" style={{ color: '#0098EA' }}>
                {unread} non lue{unread !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {unread > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="text-xs text-slate-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5 border border-white/5"
          >
            Tout lire
          </button>
        )}
      </div>

      {/* Empty state */}
      {myNotifs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center">
            <Bell className="w-7 h-7 text-slate-600" />
          </div>
          <p className="text-sm font-semibold text-slate-400">Aucune notification</p>
          <p className="text-xs text-slate-600 text-center max-w-[200px]">
            Vos dépôts, retraits et récompenses apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {myNotifs.map(notif => {
            const icon  = notifIcon[notif.type]  ?? notifIcon.system;
            const color = notifColor[notif.type] ?? notifColor.system;

            return (
              <div
                key={notif.id}
                onClick={() => !notif.isRead && markNotificationRead(notif.id)}
                className={`glass-card-light p-3.5 flex items-start gap-3 transition-all cursor-pointer rounded-2xl ${
                  !notif.isRead
                    ? `border-l-2 ${color.unreadBorder} bg-white/[0.025]`
                    : 'opacity-70'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color.bg} ${color.text}`}>
                  {icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold leading-tight ${notif.isRead ? 'text-slate-400' : 'text-white'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-slate-600 shrink-0 mt-0.5 whitespace-nowrap">
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>
                  {notif.message && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                  )}
                </div>

                {!notif.isRead && (
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${color.dot}`} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
