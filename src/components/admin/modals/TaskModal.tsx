import React, { useState } from 'react';
import { useAppStore, Task } from '../../../store/appStore';
import { Modal, FormGroup, FormLabel, FormInput, FormTextarea, FormSelect, FormSection, FormActions, Button } from '../../ui/Modal';
import { ToggleSwitch } from '../../ui/ToggleSwitch';

export const TaskModal: React.FC = () => {
  const { modalData, addTask, updateTask, closeModal } = useAppStore();
  const isEdit = modalData?.task;
  const task = modalData?.task as Task | undefined;

  const [form, setForm] = useState({
    type: task?.type || 'join_channel',
    title: task?.title || '',
    description: task?.description || '',
    reward: task?.reward || 0.5,
    targetUrl: task?.targetUrl || '',
    targetId: task?.targetId || '',
    requiredCount: task?.requiredCount || 1,
    cooldownHours: task?.cooldownHours || 0,
    maxCompletions: task?.maxCompletions || undefined,
    maxPerUser: task?.maxPerUser || undefined,
    expiresAt: task?.expiresAt ? task.expiresAt.split('T')[0] : '',
    verificationMethod: task?.verificationMethod || 'auto',
    priority: task?.priority || 1,
    icon: task?.icon || '📋',
    isActive: task?.isActive ?? true,
    hasPromotion: !!task?.promotion,
    promotionMultiplier: task?.promotion?.multiplier || 2,
    promotionEndsAt: task?.promotion?.endsAt ? task.promotion.endsAt.split('T')[0] : '',
    isPromoTask: task?.isPromoTask ?? false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      type: form.type as Task['type'],
      title: form.title,
      description: form.description,
      reward: form.reward,
      rewardType: 'main' as const,
      targetUrl: form.targetUrl || undefined,
      targetId: form.targetId || undefined,
      requiredCount: form.type === 'invite_friends' ? form.requiredCount : undefined,
      cooldownHours: form.type === 'daily' ? form.cooldownHours : undefined,
      maxCompletions: form.maxCompletions,
      maxPerUser: form.maxPerUser,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      verificationMethod: form.verificationMethod as Task['verificationMethod'],
      priority: form.priority,
      icon: form.icon,
      isActive: form.isActive,
      promotion: form.hasPromotion && form.promotionEndsAt
        ? { multiplier: form.promotionMultiplier, endsAt: new Date(form.promotionEndsAt).toISOString() }
        : undefined,
      isPromoTask: form.isPromoTask,
    };

    if (isEdit && task) {
      updateTask(task.id, data);
    } else {
      addTask(data as Omit<Task, 'id' | 'createdAt' | 'totalCompletions'>);
    }
    closeModal();
  };

  return (
    <Modal title={isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Informations générales">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Type de tâche</FormLabel>
              <FormSelect value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Task['type'] })}>
                <option value="join_channel">Rejoindre un canal</option>
                <option value="join_group">Rejoindre un groupe</option>
                <option value="start_bot">Démarrer un bot</option>
                <option value="invite_friends">Inviter des amis</option>
                <option value="daily">Mission quotidienne</option>
                <option value="special">Événement spécial</option>
                <option value="social">Réseaux sociaux</option>
                <option value="watch_video">Regarder une vidéo</option>
              </FormSelect>
            </FormGroup>
            <FormGroup>
              <FormLabel>Icône</FormLabel>
              <FormInput value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="📋" />
            </FormGroup>
          </div>

          <FormGroup>
            <FormLabel required>Titre</FormLabel>
            <FormInput value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Titre de la tâche" required />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Description</FormLabel>
            <FormTextarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description de la tâche..." rows={3} required />
          </FormGroup>
        </FormSection>

        <FormSection title="Récompense">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Montant (TON)</FormLabel>
              <FormInput type="number" step="0.01" min="0" value={form.reward} onChange={e => setForm({ ...form, reward: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
            <FormGroup>
              <FormLabel>Priorité d'affichage</FormLabel>
              <FormInput type="number" min="0" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
            </FormGroup>
          </div>

          {/* Promotion */}
          <div className="pt-2">
            <ToggleSwitch enabled={form.hasPromotion} onChange={v => setForm({ ...form, hasPromotion: v })} label="Activer une promotion" />
          </div>
          {form.hasPromotion && (
            <div className="grid grid-cols-2 gap-4 mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <FormGroup>
                <FormLabel required>Multiplicateur</FormLabel>
                <FormInput type="number" min="2" step="1" value={form.promotionMultiplier} onChange={e => setForm({ ...form, promotionMultiplier: parseInt(e.target.value) || 2 })} placeholder="Ex: 2 pour ×2" />
              </FormGroup>
              <FormGroup>
                <FormLabel required>Fin de la promo</FormLabel>
                <FormInput type="date" value={form.promotionEndsAt} onChange={e => setForm({ ...form, promotionEndsAt: e.target.value })} />
              </FormGroup>
            </div>
          )}
        </FormSection>

        {(form.type === 'join_channel' || form.type === 'join_group' || form.type === 'start_bot') && (
          <FormSection title="Cible Telegram">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormGroup>
                <FormLabel required>URL Telegram</FormLabel>
                <FormInput value={form.targetUrl} onChange={e => setForm({ ...form, targetUrl: e.target.value })} placeholder="https://t.me/..." />
              </FormGroup>
              <FormGroup>
                <FormLabel>ID Telegram (vérification)</FormLabel>
                <FormInput value={form.targetId} onChange={e => setForm({ ...form, targetId: e.target.value })} placeholder="-1001234567890" />
              </FormGroup>
            </div>
          </FormSection>
        )}

        {form.type === 'invite_friends' && (
          <FormSection title="Condition d'invitation">
            <FormGroup>
              <FormLabel required>Nombre d'amis à inviter</FormLabel>
              <FormInput type="number" min="1" value={form.requiredCount} onChange={e => setForm({ ...form, requiredCount: parseInt(e.target.value) || 1 })} />
            </FormGroup>
          </FormSection>
        )}

        <FormSection title="Paramètres avancés">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormGroup>
              <FormLabel>Méthode de vérification</FormLabel>
              <FormSelect value={form.verificationMethod} onChange={e => setForm({ ...form, verificationMethod: e.target.value as Task['verificationMethod'] })}>
                <option value="auto">Automatique</option>
                <option value="api">API externe</option>
                <option value="manual">Manuelle</option>
              </FormSelect>
            </FormGroup>
            <FormGroup>
              <FormLabel>Max complétions (global)</FormLabel>
              <FormInput type="number" min="0" value={form.maxCompletions || ''} onChange={e => setForm({ ...form, maxCompletions: parseInt(e.target.value) || undefined })} placeholder="Illimité" />
            </FormGroup>
            <FormGroup>
              <FormLabel>Max par utilisateur</FormLabel>
              <FormInput type="number" min="0" value={form.maxPerUser || ''} onChange={e => setForm({ ...form, maxPerUser: parseInt(e.target.value) || undefined })} placeholder="Illimité" />
            </FormGroup>
          </div>

          {form.type === 'daily' && (
            <FormGroup>
              <FormLabel>Cooldown (heures)</FormLabel>
              <FormInput type="number" min="0" value={form.cooldownHours} onChange={e => setForm({ ...form, cooldownHours: parseInt(e.target.value) || 0 })} />
            </FormGroup>
          )}

          <FormGroup>
            <FormLabel>Date d'expiration</FormLabel>
            <FormInput type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
          </FormGroup>

          <div className="flex items-center gap-6 pt-2 flex-wrap">
            <ToggleSwitch enabled={form.isActive} onChange={v => setForm({ ...form, isActive: v })} label="Tâche active" />
            <ToggleSwitch enabled={form.isPromoTask} onChange={v => setForm({ ...form, isPromoTask: v })} label="🎯 Tâche promo (vérification manuelle)" />
          </div>
        </FormSection>

        <FormActions>
          <Button type="button" variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button type="submit">{isEdit ? 'Enregistrer' : 'Créer la tâche'}</Button>
        </FormActions>
      </form>
    </Modal>
  );
};
