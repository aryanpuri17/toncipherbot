import React from 'react';
import { useAppStore } from '../../store/appStore';
import { StatCard } from '../ui/StatCard';
import { Users, DollarSign, ListTodo, Gift, TrendingUp, Activity, Wallet } from 'lucide-react';
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

export const AdminStatistics: React.FC = () => {
  const { users, tasks, transactions } = useAppStore();

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const totalDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal' && ['completed', 'processing'].includes(t.status)).reduce((sum, t) => sum + t.amount, 0);
  const platformRevenue = transactions.filter(t => t.fee && t.fee > 0).reduce((sum, t) => sum + (t.fee || 0), 0);
  const totalRewardsDistributed = transactions.filter(t => t.type === 'reward' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
  const today = new Date().toDateString();
  const completedTasksToday = transactions.filter(t => t.type === 'reward' && new Date(t.createdAt).toDateString() === today).length;
  const totalReferrals = users.reduce((sum, u) => sum + u.referralCount, 0);

  const userGrowth = React.useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const offset = i - 5;
      const d = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0); // last day of that month
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
        <p className="text-slate-400 text-sm mt-1">Analyses détaillées de la plateforme</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total utilisateurs" value={totalUsers.toLocaleString()} icon={<Users className="w-5 h-5" />} color="blue" />
        <StatCard title="Utilisateurs actifs" value={activeUsers.toLocaleString()} icon={<Activity className="w-5 h-5" />} color="green" />
        <StatCard title="Revenus" value={`${platformRevenue.toFixed(2)} TON`} icon={<DollarSign className="w-5 h-5" />} color="purple" />
        <StatCard title="Récompenses" value={`${totalRewardsDistributed.toFixed(2)} TON`} icon={<Gift className="w-5 h-5" />} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
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
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Dépôts totaux" value={`${totalDeposits.toFixed(2)} TON`} icon={<Wallet className="w-5 h-5" />} color="green" />
        <StatCard title="Retraits totaux" value={`${totalWithdrawals.toFixed(2)} TON`} icon={<Wallet className="w-5 h-5" />} color="orange" />
        <StatCard title="Tâches aujourd'hui" value={completedTasksToday} subtitle={`${tasks.filter(t => t.isActive).length} tâches actives`} icon={<ListTodo className="w-5 h-5" />} color="blue" />
        <StatCard title="Parrainages totaux" value={totalReferrals.toLocaleString()} icon={<TrendingUp className="w-5 h-5" />} color="purple" />
      </div>
    </div>
  );
};
