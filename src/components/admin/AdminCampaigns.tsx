import React from 'react';
import { useAppStore } from '../../store/appStore';
import { StatusBadge } from '../ui/StatusBadge';
import { Hash, Bot, Users, DollarSign, Target, Plus, Edit2, Trash2 } from 'lucide-react';

export const AdminCampaigns: React.FC = () => {
  const { campaigns, updateCampaign, deleteCampaign, openModal } = useAppStore();

  const campaignTypeIcons: Record<string, React.ReactNode> = {
    channel: <Hash className="w-4 h-4" />,
    group: <Users className="w-4 h-4" />,
    bot: <Bot className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white">Campagnes</h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">DÉMO</span>
          </div>
          <p className="text-slate-400 text-sm mt-1">Système annonceur — données de démonstration, non connectées au serveur</p>
        </div>
        <button onClick={() => openModal('campaign')} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle campagne
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400"><Target className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-400">Campagnes actives</p>
            <p className="text-xl font-bold text-white">{campaigns.filter(c => c.status === 'active').length}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400"><DollarSign className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-400">Budget total</p>
            <p className="text-xl font-bold text-white">${campaigns.reduce((s, c) => s + c.budget, 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400"><Target className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-400">Actions totales</p>
            <p className="text-xl font-bold text-white">{campaigns.reduce((s, c) => s + c.totalActions, 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Campaigns */}
      <div className="space-y-4">
        {campaigns.length === 0 && (
          <div className="glass-card p-10 text-center">
            <p className="text-sm text-slate-500">Aucune campagne pour l'instant</p>
          </div>
        )}
        {campaigns.map(campaign => (
          <div key={campaign.id} className="glass-card p-5">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${campaign.type === 'channel' ? 'bg-blue-500/20 text-blue-400' : campaign.type === 'group' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                {campaignTypeIcons[campaign.type]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-base font-semibold text-white">{campaign.targetName}</h3>
                  <StatusBadge status={campaign.status} size="md" />
                </div>
                <p className="text-sm text-slate-400 mb-3">Par {campaign.advertiserName}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-slate-500">Budget</p>
                    <p className="text-sm font-semibold text-white">${campaign.budget}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Dépensé</p>
                    <p className="text-sm font-semibold text-emerald-400">${campaign.spent}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Récompense/action</p>
                    <p className="text-sm font-semibold text-amber-400">${campaign.rewardPerAction}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Actions</p>
                    <p className="text-sm font-semibold text-purple-400">{campaign.totalActions}/{campaign.maxActions}</p>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Budget utilisé</span>
                    <span className="text-xs text-slate-400">{campaign.budget > 0 ? ((campaign.spent / campaign.budget) * 100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-bar-fill ${campaign.budget > 0 && campaign.spent / campaign.budget > 0.8 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                      style={{ width: campaign.budget > 0 ? `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` : '0%' }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span>📅 {new Date(campaign.startDate).toLocaleDateString('fr-FR')} - {new Date(campaign.endDate).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => openModal('campaign', { campaign })} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteCampaign(campaign.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                {campaign.status === 'active' ? (
                  <button onClick={() => updateCampaign(campaign.id, { status: 'paused' })} className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium hover:bg-orange-500/20 transition-colors">
                    Pause
                  </button>
                ) : campaign.status === 'paused' ? (
                  <button onClick={() => updateCampaign(campaign.id, { status: 'active' })} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors">
                    Reprendre
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
