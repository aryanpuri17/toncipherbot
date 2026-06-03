import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { StatusBadge } from '../ui/StatusBadge';
import { Search, Filter, UserCheck, UserX, Eye, Shield, ChevronDown } from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const { users, updateUser } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const filtered = users.filter(u => {
    const matchSearch = u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.firstName.toLowerCase().includes(search.toLowerCase()) ||
      u.telegramId.toString().includes(search);
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selected = selectedUser ? users.find(u => u.id === selectedUser) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Utilisateurs</h2>
          <p className="text-slate-400 text-sm mt-1">{users.length} utilisateurs inscrits</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, username, ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">Tous</option>
            <option value="active">Actifs</option>
            <option value="suspended">Suspendus</option>
            <option value="banned">Bannis</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Users Table */}
        <div className="flex-1 glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Solde</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Niveau</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Risque</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} className={`table-row border-b border-white/[0.03] cursor-pointer ${selectedUser === user.id ? 'bg-blue-500/5' : ''}`} onClick={() => setSelectedUser(user.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                          {user.firstName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">@{user.username}</p>
                          <p className="text-xs text-slate-500">{user.firstName} {user.lastName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-emerald-400">${user.balanceMain.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">Total: ${user.totalEarnings.toFixed(2)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-purple-400">Nv.{user.level}</span>
                        <span className="text-xs text-slate-500">{user.xp} XP</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${user.riskScore > 60 ? 'bg-red-500' : user.riskScore > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${user.riskScore}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{user.riskScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedUser(user.id); }}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {user.status === 'active' ? (
                          <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors" onClick={(e) => { e.stopPropagation(); updateUser(user.id, { status: 'suspended' }); }}>
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 transition-colors" onClick={(e) => { e.stopPropagation(); updateUser(user.id, { status: 'active' }); }}>
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Detail */}
        {selected && (
          <div className="w-full lg:w-80 glass-card p-5 space-y-5 animate-slide-up">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white mx-auto mb-3">
                {selected.firstName[0]}
              </div>
              <h3 className="text-lg font-bold text-white">{selected.firstName} {selected.lastName}</h3>
              <p className="text-sm text-slate-400">@{selected.username}</p>
              <p className="text-xs text-slate-500 mt-1">ID: {selected.telegramId}</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/[0.03]">
                <span className="text-xs text-slate-400">Solde principal</span>
                <span className="text-sm font-semibold text-emerald-400">${selected.balanceMain.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/[0.03]">
                <span className="text-xs text-slate-400">Solde bonus</span>
                <span className="text-sm font-semibold text-blue-400">${selected.balanceBonus.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/[0.03]">
                <span className="text-xs text-slate-400">Solde parrainage</span>
                <span className="text-sm font-semibold text-purple-400">${selected.balanceReferral.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/[0.03]">
                <span className="text-xs text-slate-400">Gains totaux</span>
                <span className="text-sm font-semibold text-white">${selected.totalEarnings.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                <p className="text-lg font-bold text-white">{selected.level}</p>
                <p className="text-[10px] text-slate-500">Niveau</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                <p className="text-lg font-bold text-white">{selected.tasksCompleted}</p>
                <p className="text-[10px] text-slate-500">Tâches</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                <p className="text-lg font-bold text-white">{selected.referralCount}</p>
                <p className="text-[10px] text-slate-500">Filleuls</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${selected.riskScore > 60 ? 'text-red-400' : selected.riskScore > 30 ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span className="text-xs text-slate-400">Score de risque: {selected.riskScore}/100</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Streak: 🔥 {selected.streak} jours</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Code: {selected.referralCode}</span>
              </div>
            </div>

            {selected.badges.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Badges</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.badges.map(b => (
                    <span key={b} className="px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-medium">
                      {b.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {selected.status === 'active' ? (
                <>
                  <button onClick={() => updateUser(selected.id, { status: 'suspended' })} className="flex-1 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium hover:bg-orange-500/20 transition-colors">
                    Suspendre
                  </button>
                  <button onClick={() => updateUser(selected.id, { status: 'banned' })} className="flex-1 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">
                    Bannir
                  </button>
                </>
              ) : (
                <button onClick={() => updateUser(selected.id, { status: 'active' })} className="flex-1 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors">
                  Réactiver
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
