import React from 'react';
import { useAppStore } from '../../store/appStore';
import { StatCard } from '../ui/StatCard';
import { StatusBadge } from '../ui/StatusBadge';
import {
  Users, DollarSign, ArrowDownToLine, ArrowUpFromLine,
  Megaphone, Gift, ListTodo, Shield, TrendingUp, Activity
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const chartData = [
  { name: 'Lun', users: 120, deposits: 4500, tasks: 450 },
  { name: 'Mar', users: 145, deposits: 5200, tasks: 520 },
  { name: 'Mer', users: 110, deposits: 3800, tasks: 380 },
  { name: 'Jeu', users: 190, deposits: 6100, tasks: 610 },
  { name: 'Ven', users: 170, deposits: 5800, tasks: 580 },
  { name: 'Sam', users: 200, deposits: 7200, tasks: 720 },
  { name: 'Dim', users: 127, deposits: 4800, tasks: 480 },
];

const revenueData = [
  { name: 'Jan', revenue: 12000 },
  { name: 'Fév', revenue: 15000 },
  { name: 'Mar', revenue: 18000 },
  { name: 'Avr', revenue: 22000 },
  { name: 'Mai', revenue: 28000 },
  { name: 'Jun', revenue: 32000 },
  { name: 'Jul', revenue: 35000 },
  { name: 'Aoû', revenue: 38000 },
  { name: 'Sep', revenue: 36000 },
  { name: 'Oct', revenue: 40000 },
  { name: 'Nov', revenue: 42000 },
  { name: 'Déc', revenue: 45678 },
];

export const AdminOverview: React.FC = () => {
  const { platformStats: s, transactions, fraudAlerts, users } = useAppStore();

  const recentTx = transactions.slice(0, 5);
  const recentAlerts = fraudAlerts.slice(0, 3);

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
          value={s.totalUsers.toLocaleString()}
          subtitle={`+${s.newUsersToday} aujourd'hui`}
          icon={<Users className="w-5 h-5" />}
          trend={{ value: 12.5, positive: true }}
          color="blue"
        />
        <StatCard
          title="Dépôts totaux"
          value={`$${(s.totalDeposits / 1000).toFixed(1)}K`}
          subtitle="Tous réseaux confondus"
          icon={<ArrowDownToLine className="w-5 h-5" />}
          trend={{ value: 8.3, positive: true }}
          color="green"
        />
        <StatCard
          title="Retraits totaux"
          value={`$${(s.totalWithdrawals / 1000).toFixed(1)}K`}
          subtitle="Traitement automatique"
          icon={<ArrowUpFromLine className="w-5 h-5" />}
          trend={{ value: 5.1, positive: true }}
          color="orange"
        />
        <StatCard
          title="Revenus plateforme"
          value={`$${(s.platformRevenue / 1000).toFixed(1)}K`}
          subtitle="Frais et commissions"
          icon={<DollarSign className="w-5 h-5" />}
          trend={{ value: 15.2, positive: true }}
          color="purple"
        />
      </div>

      {/* Second Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Utilisateurs actifs"
          value={s.activeUsers.toLocaleString()}
          subtitle={`${((s.activeUsers / s.totalUsers) * 100).toFixed(1)}% du total`}
          icon={<Activity className="w-5 h-5" />}
          color="cyan"
        />
        <StatCard
          title="Campagnes actives"
          value={s.activeCampaigns}
          icon={<Megaphone className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Tâches aujourd'hui"
          value={s.completedTasksToday.toLocaleString()}
          subtitle={`${s.totalTasks} tâches actives`}
          icon={<ListTodo className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Alertes fraude"
          value={s.fraudAlertsToday}
          subtitle="Surveillance 24/7"
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
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenus']}
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
            {recentTx.map(tx => {
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
                    <p className={`text-sm font-semibold ${tx.type === 'deposit' || tx.type === 'reward' ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {tx.type === 'deposit' || tx.type === 'reward' ? '+' : '-'}{tx.amount.toFixed(2)} {tx.currency}
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
          <h3 className="text-sm font-semibold text-white mb-4">Alertes anti-fraude</h3>
          <div className="space-y-3">
            {recentAlerts.map(alert => (
              <div key={alert.id} className="p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${alert.severity === 'critical' ? 'text-red-400' : alert.severity === 'high' ? 'text-orange-400' : 'text-amber-400'}`} />
                    <span className="text-sm font-medium text-white">@{alert.username}</span>
                  </div>
                  <StatusBadge status={alert.severity} />
                </div>
                <p className="text-xs text-slate-400 mb-2">{alert.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Score: {alert.riskScore}/100</span>
                  <StatusBadge status={alert.action} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
