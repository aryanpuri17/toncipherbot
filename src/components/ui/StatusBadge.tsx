import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  confirming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  suspended: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  paused: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  banned: 'bg-red-500/20 text-red-400 border-red-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  expired: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  review: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  none: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  flag: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  withdrawal_blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
  processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
  pending: 'Pending',
  confirming: 'Confirming',
  suspended: 'Suspended',
  paused: 'Paused',
  banned: 'Banned',
  failed: 'Failed',
  cancelled: 'Cancelled',
  expired: 'Expired',
  review: 'Under review',
  none: 'None',
  flag: 'Flagged',
  withdrawal_blocked: 'Withdrawal blocked',
  processing: 'Processing',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const colorClass = statusColors[status] || statusColors.none;
  const label = statusLabels[status] || status;
  return (
    <span className={`inline-flex items-center border rounded-full font-semibold ${colorClass} ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'active' || status === 'completed' || status === 'low' ? 'bg-emerald-400' : status === 'pending' || status === 'medium' || status === 'flag' ? 'bg-amber-400' : status === 'confirming' || status === 'processing' || status === 'review' ? 'bg-blue-400' : status === 'critical' || status === 'banned' || status === 'failed' || status === 'withdrawal_blocked' ? 'bg-red-400' : 'bg-gray-400'}`} />
      {label}
    </span>
  );
};
