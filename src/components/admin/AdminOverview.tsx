import { adminFetch } from '../../utils/adminFetch';
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { StatCard } from '../ui/StatCard';
import { StatusBadge } from '../ui/StatusBadge';
import {
  Users, DollarSign, ArrowDownToLine, ArrowUpFromLine,
  Megaphone, Gift, ListTodo, Shield, TrendingUp, Activity, AlertTriangle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

type ApiStats = {
  total_users: number;
  flagged_users: number;
  banned_users: number;
  total_referrals: number;
  total_referral_bonus: number;
  open_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  medium_alerts: number;
  low_alerts: number;
};

type ApiAlert = {
  id: number;
  telegram_id: number;
  username: string;
  alert_type: string;
  details: string;
  severity: string;
  risk_score: number;
  resolved: boolean;
  banned: boolean;
  created_at: string;
};

export const AdminOverview: React.FC = () => {
  const { transactions, tasks, campaigns, users } = useAppStore();
  const [apiStats, setApiStats] = useState<ApiStats | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<ApiAlert[]>([]);

  useEffect(() => {
    void adminFetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then((d: ApiStats | null) => { if (d) setApiStats(d); })
      .catch(() => {});
    void adminFetch('/api/admin/fraud-alerts')
      .then(r => r.ok ? r.json() : [])
      .then((d: ApiAlert[]) => setRecentAlerts(d.filter(a => !a.resolved).slice(0, 3)))
      .catch(() => {});
  }, []);

  const today = new Date().toDateString();
  const totalUsers       = apiStats?.total_users ?? 0;
  const openFraudAlerts  = apiStats?.open_alerts ?? 0;
  const totalDeposits    = transactions.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal' && ['completed', 'processing'].includes(t.status)).reduce((sum, t) => sum + t.amount, 0);
  const platformRevenue  = transactions.filter(t => t.fee && t.fee > 0).reduce((sum, t) => sum + (t.fee || 0), 0);
  const activeCampaigns  = campaigns.filter(c => c.status === 'active').length;
  const completedTasksToday = transactions.filter(t => t.type === 'reward' && new Date(t.createdAt).toDateString() === today).length;
  const totalActiveTasks = tasks.filter(t => t.isActive).length;

  const chartData = React.useMemo(() => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      return {
        name: days[d.getDay()],
        users: 0,
        deposits: transactions.filter(tx => tx.type === 'deposit' && new Date(tx.createdAt) >= start && new Date(tx.createdAt) <= end).reduce((s, tx) => s + tx.amount, 0),
        tasks: transactions.filter(tx => tx.type === 'reward' && new Date(tx.createdAt) >= start && new Date(tx.createdAt) <= end).length,
      };
    });
  }, [transactions]);

  const revenueData = React.useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const now = new Date();
    return months.map((name, i) => ({
      name,
      revenue: transactions.filter(tx => tx.type === 'deposit' && new Date(tx.createdAt).getFullYear() === now.getFullYear() && new Date(tx.createdAt).getMonth() === i).reduce((s, tx) => s + tx.amount, 0),
    }));
  }, [transactions]);

  const recentTx = transactions.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Vue d'ensemble</h2>
        <p className="text-slate-400 text-sm mt-1">Tableau de bord de la plateforme TonCipher</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Utilisateurs totaux"
          value={totalUsers.toLocaleString()}
          subtitle={apiStats ? `${apiStats.flagged_users} signalés · ${apiStats.banned_users} bannis` : '—'}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Dépôts totaux"
          value={totalDeposits >= 1000 ? `${(totalDeposits / 1000).toFixed(2)}K TON` : `${totalDeposits.toFixed(2)} TON`}
          subtitle="Tous réseaux confondus"
          icon={<ArrowDownToLine className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Retraits totaux"
          value={totalWithdrawals >= 1000 ? `${(totalWithdrawals / 1000).toFixed(2)}K TON` : `${totalWithdrawals.toFixed(2)} TON`}
          subtitle="Traitement automatique"
          icon={<ArrowUpFromLine className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          title="Revenus plateforme"
          value={`${platformRevenue.toFixed(2)} TON`}
          subtitle="Frais et commissions"
          icon={<DollarSign className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Second Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Filleuls totaux"
          value={apiStats ? apiStats.total_referrals.toLocaleString() : '—'}
          subtitle={apiStats ? `${apiStats.total_referral_bonus.toFixed(2)} TON crédités` : ''}
          icon={<Activity className="w-5 h-5" />}
          color="cyan"
        />
        <StatCard
          title="Campagnes actives"
          value={activeCampaigns}
          icon={<Megaphone className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Tâches aujourd'hui"
          value={completedTasksToday.toLocaleString()}
          subtitle={`${totalActiveTasks} tâches actives`}
          icon={<ListTodo className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Alertes fraude"
          value={openFraudAlerts}
          subtitle={apiStats ? `${apiStats.critical_alerts} critiques · ${apiStats.high_alerts} élevées` : 'Surveillance 24/7'}
          icon={<Shield className="w-5 h-5" />}
          color="red"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Activité cette semaine</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> Utilisateurs</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Tâches</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="users" stroke="#3b82f6" fill="url(#colorUsers)" strokeWidth={2} />
              <Area type="monotone" dataKey="tasks" stroke="#34d399" fill="url(#colorTasks)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Revenus mensuels</h3>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K TON`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(value) => [`${Number(value).toLocaleString()} TON`, 'Revenus']}
              />
              <Bar dataKey="revenue" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Transactions récentes</h3>
          <div className="space-y-3">
            {recentTx.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Aucune transaction pour l'instant</p>
            ) : recentTx.map(tx => {
              const user = users.find(u => u.id === tx.userId);
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'deposit' ? 'bg-emerald-500/20 text-emerald-400' : tx.type === 'withdrawal' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {tx.type === 'deposit' ? <ArrowDownToLine className="w-4 h-4" /> : tx.type === 'withdrawal' ? <ArrowUpFromLine className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">@{user?.username || 'unknown'}</p>
                      <p className="text-xs text-slate-500">{tx.type === 'deposit' ? 'Dépôt' : tx.type === 'withdrawal' ? 'Retrait' : 'Récompense'} • {tx.network || 'Interne'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${['deposit', 'reward', 'admin_credit', 'bonus'].includes(tx.type) ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {['deposit', 'reward', 'admin_credit', 'bonus'].includes(tx.type) ? '+' : '-'}{tx.amount.toFixed(2)} {tx.currency}
                    </p>
                    <StatusBadge status={tx.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fraud Alerts */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Alertes anti-fraude récentes</h3>
          <div className="space-y-3">
            {recentAlerts.length === 0 && (
              <div className="text-center py-4">
                <Shield className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                <p className="text-sm text-slate-500">Aucune alerte active</p>
              </div>
            )}
            {recentAlerts.map(alert => (
              <div key={alert.id} className="p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${alert.severity === 'critical' ? 'text-red-400' : alert.severity === 'high' ? 'text-orange-400' : 'text-amber-400'}`} />
                    <span className="text-sm font-medium text-white">@{alert.username || `id:${alert.telegram_id}`}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' : alert.severity === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{alert.alert_type.replace(/_/g, ' ')}</p>
                <p className="text-[10px] text-slate-600 mt-1">Score: {alert.risk_score}/100 · {new Date(alert.created_at).toLocaleString('fr-FR')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
