import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { StatusBadge } from '../ui/StatusBadge';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { Shield, AlertTriangle, UserX, Eye, Ban, FileText, Search, Plus, Edit2, Trash2 } from 'lucide-react';

export const AdminAntiFraud: React.FC = () => {
  const { fraudAlerts, updateFraudAlert, antiFraudRules, updateAntiFraudRule, deleteAntiFraudRule, openModal } = useAppStore();

  const severityCounts = {
    critical: fraudAlerts.filter(a => a.severity === 'critical').length,
    high: fraudAlerts.filter(a => a.severity === 'high').length,
    medium: fraudAlerts.filter(a => a.severity === 'medium').length,
    low: fraudAlerts.filter(a => a.severity === 'low').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Anti-Fraude</h2>
        <p className="text-slate-400 text-sm mt-1">Surveillance et détection des fraudes</p>
      </div>

      {/* Severity Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 border-red-500/20 bg-red-500/5">
          <p className="text-xs text-red-400 mb-1">Critique</p>
          <p className="text-2xl font-bold text-red-400">{severityCounts.critical}</p>
        </div>
        <div className="glass-card p-4 border-orange-500/20 bg-orange-500/5">
          <p className="text-xs text-orange-400 mb-1">Élevé</p>
          <p className="text-2xl font-bold text-orange-400">{severityCounts.high}</p>
        </div>
        <div className="glass-card p-4 border-amber-500/20 bg-amber-500/5">
          <p className="text-xs text-amber-400 mb-1">Moyen</p>
          <p className="text-2xl font-bold text-amber-400">{severityCounts.medium}</p>
        </div>
        <div className="glass-card p-4 border-emerald-500/20 bg-emerald-500/5">
          <p className="text-xs text-emerald-400 mb-1">Faible</p>
          <p className="text-2xl font-bold text-emerald-400">{severityCounts.low}</p>
        </div>
      </div>

      {/* Anti-Fraud Rules */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Règles de détection</h3>
          <button onClick={() => openModal('antiFraudRule')} className="text-xs text-blue-400 flex items-center gap-1 hover:underline">
            <Plus className="w-3 h-3" /> Ajouter
          </button>
        </div>
        <div className="space-y-2">
          {antiFraudRules.map(rule => (
            <div key={rule.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03]">
              <Shield className={`w-4 h-4 ${rule.isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">{rule.name}</p>
                <p className="text-xs text-slate-500">{rule.description}</p>
              </div>
              <StatusBadge status={rule.severity} />
              <div className="flex items-center gap-1">
                <button onClick={() => openModal('antiFraudRule', { rule })} className="p-1.5 rounded hover:bg-white/5 text-slate-400 hover:text-white">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteAntiFraudRule(rule.id)} className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <ToggleSwitch enabled={rule.isActive} onChange={v => updateAntiFraudRule(rule.id, { isActive: v })} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {fraudAlerts.length === 0 && (
          <div className="glass-card p-8 text-center">
            <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Aucune alerte de fraude détectée</p>
          </div>
        )}
        {fraudAlerts.map(alert => (
          <div key={alert.id} className={`glass-card p-5 ${alert.severity === 'critical' ? 'border-red-500/20' : alert.severity === 'high' ? 'border-orange-500/20' : ''}`}>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' : alert.severity === 'high' ? 'bg-orange-500/20 text-orange-400' : alert.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white">@{alert.username}</h3>
                  <StatusBadge status={alert.severity} />
                  <StatusBadge status={alert.action} />
                </div>
                <p className="text-xs text-slate-400 mb-2">{alert.description}</p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Type: {alert.type.replace(/_/g, ' ')}</span>
                  <span>Score: {alert.riskScore}/100</span>
                  <span>{new Date(alert.createdAt).toLocaleString('fr-FR')}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {alert.action !== 'banned' && (
                  <>
                    <button onClick={() => updateFraudAlert(alert.id, { action: 'review' })} className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Revue manuelle">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => updateFraudAlert(alert.id, { action: 'suspended' })} className="p-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors" title="Suspendre">
                      <UserX className="w-4 h-4" />
                    </button>
                    <button onClick={() => updateFraudAlert(alert.id, { action: 'banned' })} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Bannir">
                      <Ban className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminLogs: React.FC = () => {
  const { logs } = useAppStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = logs.filter(l => {
    const matchSearch = l.message.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || l.type === typeFilter;
    return matchSearch && matchType;
  });

  const typeColors: Record<string, string> = {
    info: 'text-blue-400 bg-blue-500/10',
    warning: 'text-amber-400 bg-amber-500/10',
    error: 'text-red-400 bg-red-500/10',
    security: 'text-purple-400 bg-purple-500/10',
    financial: 'text-emerald-400 bg-emerald-500/10',
    admin: 'text-cyan-400 bg-cyan-500/10',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Logs système</h2>
        <p className="text-slate-400 text-sm mt-1">Journaux d'activité complets</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher dans les logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {['all', 'info', 'warning', 'error', 'security', 'financial', 'admin'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${typeFilter === t ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-white/5'}`}>
              {t === 'all' ? 'Tous' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="space-y-0">
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              {search || typeFilter !== 'all' ? 'Aucun log correspondant à la recherche' : 'Aucun log pour l\'instant'}
            </div>
          )}
          {filtered.map(log => (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 mt-0.5 ${typeColors[log.type]}`}>
                {log.type}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{log.message}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {log.category}</span>
                  <span>{new Date(log.createdAt).toLocaleString('fr-FR')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminAlerts: React.FC = () => {
  const { notifications, markNotificationRead } = useAppStore();
  const adminNotifs = notifications.filter(n => !n.userId || n.type === 'alert' || n.type === 'system');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Alertes & Notifications</h2>
        <p className="text-slate-400 text-sm mt-1">{adminNotifs.filter(n => !n.isRead).length} non lues</p>
      </div>

      <div className="space-y-3">
        {adminNotifs.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-slate-500">Aucune alerte système pour l'instant</p>
          </div>
        )}
        {adminNotifs.map(n => (
          <div key={n.id} className={`glass-card p-4 flex items-start gap-3 cursor-pointer transition-all ${!n.isRead ? 'border-blue-500/20 bg-blue-500/5' : ''}`} onClick={() => markNotificationRead(n.id)}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.type === 'alert' ? 'bg-red-500/20 text-red-400' : n.type === 'system' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {n.type === 'alert' ? <AlertTriangle className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white">{n.title}</h4>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-400" />}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
              <p className="text-[10px] text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString('fr-FR')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
