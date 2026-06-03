import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, trend, color = 'blue' }) => {
  const gradients: Record<string, string> = {
    blue: 'from-blue-500/20 to-cyan-500/10',
    green: 'from-emerald-500/20 to-teal-500/10',
    purple: 'from-purple-500/20 to-pink-500/10',
    orange: 'from-orange-500/20 to-amber-500/10',
    red: 'from-red-500/20 to-pink-500/10',
    cyan: 'from-cyan-500/20 to-blue-500/10',
  };

  const iconBgs: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-emerald-500/20 text-emerald-400',
    purple: 'bg-purple-500/20 text-purple-400',
    orange: 'bg-orange-500/20 text-orange-400',
    red: 'bg-red-500/20 text-red-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
  };

  return (
    <div className={`stat-card p-5 bg-gradient-to-br ${gradients[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${iconBgs[color]}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-semibold flex items-center gap-1 ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
};
