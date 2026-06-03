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
    rewardType: task?.rewardType || 'main',
    targetUrl: task?.targetUrl || '',
    targetId: task?.targetId || '',
    requiredCount: task?.requiredCount || 1,
    cooldownHours: task?.cooldownHours || 0,
    maxCompletions: task?.maxCompletions || undefined,
    maxPerUser: task?.maxPerUser || undefined,
    expiresAt: task?.expiresAt ? task.expiresAt.split('T')[0] : '',
    verificationMethod: task?.verificationMethod || 'auto',
    priority: task?.priority || 1,
    requiredLevel: task?.requiredLevel || undefined,
    icon: task?.icon || '📋',
    isActive: task?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      requiredCount: form.type === 'invite_friends' ? form.requiredCount : undefined,
      cooldownHours: form.type === 'daily' ? form.cooldownHours : undefined,
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
              <FormLabel required>Montant de la récompense</FormLabel>
              <FormInput type="number" step="0.01" min="0" value={form.reward} onChange={e => setForm({ ...form, reward: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Type de récompense</FormLabel>
              <FormSelect value={form.rewardType} onChange={e => setForm({ ...form, rewardType: e.target.value as 'main' | 'bonus' | 'xp' })}>
                <option value="main">Solde principal ($)</option>
                <option value="bonus">Solde bonus ($)</option>
                <option value="xp">XP (points d'expérience)</option>
              </FormSelect>
            </FormGroup>
          </div>
        </FormSection>

        {(form.type === 'join_channel' || form.type === 'join_group' || form.type === 'start_bot') && (
          <FormSection title="Cible Telegram">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormGroup>
                <FormLabel required>URL Telegram</FormLabel>
                <FormInput value={form.targetUrl} onChange={e => setForm({ ...form, targetUrl: e.target.value })} placeholder="https://t.me/..." />
              </FormGroup>
              <FormGroup>
                <FormLabel>ID Telegram (pour vérification)</FormLabel>
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
                <option value="auto">Automatique (Telegram API)</option>
                <option value="api">API externe</option>
                <option value="manual">Manuelle (admin)</option>
              </FormSelect>
            </FormGroup>
            <FormGroup>
              <FormLabel>Priorité d'affichage</FormLabel>
              <FormInput type="number" min="0" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
            </FormGroup>
            <FormGroup>
              <FormLabel>Niveau minimum requis</FormLabel>
              <FormInput type="number" min="0" value={form.requiredLevel || ''} onChange={e => setForm({ ...form, requiredLevel: parseInt(e.target.value) || undefined })} placeholder="Aucun" />
            </FormGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormGroup>
              <FormLabel>Cooldown (heures)</FormLabel>
              <FormInput type="number" min="0" value={form.cooldownHours} onChange={e => setForm({ ...form, cooldownHours: parseInt(e.target.value) || 0 })} placeholder="0 = pas de cooldown" />
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

          <FormGroup>
            <FormLabel>Date d'expiration</FormLabel>
            <FormInput type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
          </FormGroup>

          <div className="flex items-center gap-4 pt-2">
            <ToggleSwitch enabled={form.isActive} onChange={v => setForm({ ...form, isActive: v })} label="Tâche active" />
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
