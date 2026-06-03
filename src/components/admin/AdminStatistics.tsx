import React from 'react';
import { useAppStore } from '../../store/appStore';
import { StatCard } from '../ui/StatCard';
import { Users, DollarSign, ListTodo, Gift, TrendingUp, Activity, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const userGrowth = [
  { month: 'Jul', users: 5200 },
  { month: 'Aoû', users: 6800 },
  { month: 'Sep', users: 8400 },
  { month: 'Oct', users: 10200 },
  { month: 'Nov', users: 12800 },
  { month: 'Déc', users: 15420 },
];

const taskDistribution = [
  { name: 'Canal', value: 35, color: '#3b82f6' },
  { name: 'Groupe', value: 25, color: '#8b5cf6' },
  { name: 'Bot', value: 15, color: '#06b6d4' },
  { name: 'Invitation', value: 10, color: '#34d399' },
  { name: 'Quotidien', value: 10, color: '#fbbf24' },
  { name: 'Spécial', value: 5, color: '#ec4899' },
];

export const AdminStatistics: React.FC = () => {
  const { platformStats: s } = useAppStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Statistiques</h2>
        <p className="text-slate-400 text-sm mt-1">Analyses détaillées de la plateforme</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total utilisateurs" value={s.totalUsers.toLocaleString()} icon={<Users className="w-5 h-5" />} trend={{ value: 12.5, positive: true }} color="blue" />
        <StatCard title="Utilisateurs actifs" value={s.activeUsers.toLocaleString()} icon={<Activity className="w-5 h-5" />} trend={{ value: 8.2, positive: true }} color="green" />
        <StatCard title="Revenus" value={`$${(s.platformRevenue / 1000).toFixed(1)}K`} icon={<DollarSign className="w-5 h-5" />} trend={{ value: 15.2, positive: true }} color="purple" />
        <StatCard title="Récompenses" value={`$${(s.totalRewardsDistributed / 1000).toFixed(1)}K`} icon={<Gift className="w-5 h-5" />} trend={{ value: 10.4, positive: true }} color="orange" />
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
        <StatCard title="Dépôts totaux" value={`$${s.totalDeposits.toLocaleString()}`} icon={<Wallet className="w-5 h-5" />} color="green" />
        <StatCard title="Retraits totaux" value={`$${s.totalWithdrawals.toLocaleString()}`} icon={<Wallet className="w-5 h-5" />} color="orange" />
        <StatCard title="Tâches totales" value={s.totalTasks} subtitle={`${s.completedTasksToday} aujourd'hui`} icon={<ListTodo className="w-5 h-5" />} color="blue" />
        <StatCard title="Parrainages" value={s.totalReferrals.toLocaleString()} icon={<TrendingUp className="w-5 h-5" />} color="purple" />
      </div>
    </div>
  );
};
