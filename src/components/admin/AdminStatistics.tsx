import React from 'react';
import { useAppStore } from '../../store/appStore';
import { adminFetch } from '../../utils/adminFetch';
import { StatCard } from '../ui/StatCard';
import { Users, DollarSign, ListTodo, TrendingUp, Activity, Wallet, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const TYPE_COLORS: Record<string, string> = {
  join_channel: '#3b82f6',
  join_group: '#8b5cf6',
  start_bot: '#06b6d4',
  invite_friends: '#34d399',
  daily: '#fbbf24',
  special: '#ec4899',
  social: '#f97316',
  watch_video: '#ef4444',
};
const TYPE_LABELS: Record<string, string> = {
  join_channel: 'Canal', join_group: 'Groupe', start_bot: 'Bot',
  invite_friends: 'Invitation', daily: 'Quotidien', special: 'Spécial',
  social: 'Social', watch_video: 'Vidéo',
};

interface ServerStats {
  total_users: number;
  flagged_users: number;
  banned_users: number;
  total_deposits_count: number;
  total_deposits_amount: number;
  total_withdrawals_count: number;
  total_withdrawals_amount: number;
  pending_withdrawals: number;
  open_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  medium_alerts: number;
  low_alerts: number;
}

export const AdminStatistics: React.FC = () => {
  const { tasks, users } = useAppStore();
  const [stats, setStats] = React.useState<ServerStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadStats = React.useCallback(() => {
    setLoading(true);
    adminFetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: ServerStats) => { setStats(data); setError(''); })
      .catch((e: unknown) => setError(e === 401 ? 'Clé admin invalide — reconnectez-vous.' : 'Erreur serveur'))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadStats();
    const poll = setInterval(loadStats, 30_000);
    return () => clearInterval(poll);
  }, [loadStats]);

  const userGrowth = React.useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const offset = i - 5;
      const d = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
      return {
        month: months[d.getMonth()],
        users: users.filter(u => new Date(u.createdAt) <= d).length,
      };
    });
  }, [users]);

  const taskDistribution = React.useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => { counts[t.type] = (counts[t.type] || 0) + t.totalCompletions; });
    const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(counts).map(([type, count]) => ({
      name: TYPE_LABELS[type] || type,
      value: Math.round((count / total) * 100),
      color: TYPE_COLORS[type] || '#94a3b8',
    }));
  }, [tasks]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Statistiques</h2>
        <p className="text-slate-400 text-sm mt-1">Données en temps réel depuis le serveur</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="text-slate-500 text-sm">Chargement…</div>
      ) : (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total utilisateurs" value={(stats?.total_users ?? 0).toLocaleString()} icon={<Users className="w-5 h-5" />} color="blue" />
            <StatCard title="Utilisateurs actifs" value={(stats ? stats.total_users - stats.banned_users - stats.flagged_users : 0).toLocaleString()} icon={<Activity className="w-5 h-5" />} color="green" />
            <StatCard title="Alertes ouvertes" value={(stats?.open_alerts ?? 0).toLocaleString()} icon={<AlertTriangle className="w-5 h-5" />} color="orange" />
            <StatCard title="Suspendus / Bannis" value={(stats?.flagged_users ?? 0 + (stats?.banned_users ?? 0)).toLocaleString()} icon={<Users className="w-5 h-5" />} color="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth — local store data */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Croissance utilisateurs</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Task Distribution */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Répartition des tâches</h3>
              {taskDistribution.length === 0 ? (
                <p className="text-slate-500 text-sm text-center pt-10">Aucune tâche complétée</p>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={220}>
                    <PieChart>
                      <Pie data={taskDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                        {taskDistribution.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {taskDistribution.map(item => (
                      <div key={item.name} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-slate-300">{item.name}</span>
                        <span className="text-xs text-slate-500 ml-auto">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Overview — server stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Dépôts totaux" value={`${(stats?.total_deposits_amount ?? 0).toFixed(2)} TON`} subtitle={`${stats?.total_deposits_count ?? 0} transactions`} icon={<Wallet className="w-5 h-5" />} color="green" />
            <StatCard title="Retraits totaux" value={`${(stats?.total_withdrawals_amount ?? 0).toFixed(2)} TON`} subtitle={`${stats?.total_withdrawals_count ?? 0} transactions`} icon={<Wallet className="w-5 h-5" />} color="orange" />
            <StatCard title="Retraits en attente" value={(stats?.pending_withdrawals ?? 0).toLocaleString()} icon={<DollarSign className="w-5 h-5" />} color="blue" />
            <StatCard title="Tâches actives" value={tasks.filter(t => t.isActive).length.toLocaleString()} icon={<ListTodo className="w-5 h-5" />} color="purple" />
          </div>

          {/* Alert Breakdown */}
          {stats && stats.open_alerts > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Détail des alertes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Critiques', value: stats.critical_alerts, color: '#ef4444' },
                  { label: 'Élevées', value: stats.high_alerts, color: '#f97316' },
                  { label: 'Moyennes', value: stats.medium_alerts, color: '#f59e0b' },
                  { label: 'Faibles', value: stats.low_alerts, color: '#64748b' },
                ].map(a => (
                  <div key={a.label} className="text-center">
                    <div className="text-2xl font-black" style={{ color: a.color }}>{a.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{a.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Referral & Tasks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard title="Bannis" value={(stats?.banned_users ?? 0).toLocaleString()} icon={<Users className="w-5 h-5" />} color="orange" />
            <StatCard title="Signalés" value={(stats?.flagged_users ?? 0).toLocaleString()} icon={<TrendingUp className="w-5 h-5" />} color="purple" />
          </div>
        </>
      )}
    </div>
  );
};
