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
    <Modal title={isEdit ? 'Edit task' : 'New task'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="General information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Task type</FormLabel>
              <FormSelect value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Task['type'] })}>
                <option value="join_channel">Join a channel</option>
                <option value="join_group">Join a group</option>
                <option value="start_bot">Start a bot</option>
                <option value="invite_friends">Invite friends</option>
                <option value="daily">Daily mission</option>
                <option value="special">Special event</option>
                <option value="social">Social networks</option>
                <option value="watch_video">Watch a video</option>
              </FormSelect>
            </FormGroup>
            <FormGroup>
              <FormLabel>Icon</FormLabel>
              <FormInput value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="📋" />
            </FormGroup>
          </div>

          <FormGroup>
            <FormLabel required>Title</FormLabel>
            <FormInput value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" required />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Description</FormLabel>
            <FormTextarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Task description..." rows={3} required />
          </FormGroup>
        </FormSection>

        <FormSection title="Reward">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Amount (GRAM)</FormLabel>
              <FormInput type="number" step="0.001" min="0" value={form.reward} onChange={e => setForm({ ...form, reward: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
            <FormGroup>
              <FormLabel>Display priority</FormLabel>
              <FormInput type="number" min="0" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
            </FormGroup>
          </div>

          {/* Promotion */}
          <div className="pt-2">
            <ToggleSwitch enabled={form.hasPromotion} onChange={v => setForm({ ...form, hasPromotion: v })} label="Enable a promotion" />
          </div>
          {form.hasPromotion && (
            <div className="grid grid-cols-2 gap-4 mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <FormGroup>
                <FormLabel required>Multiplier</FormLabel>
                <FormInput type="number" min="2" step="1" value={form.promotionMultiplier} onChange={e => setForm({ ...form, promotionMultiplier: parseInt(e.target.value) || 2 })} placeholder="e.g. 2 for ×2" />
              </FormGroup>
              <FormGroup>
                <FormLabel required>Promo end date</FormLabel>
                <FormInput type="date" value={form.promotionEndsAt} onChange={e => setForm({ ...form, promotionEndsAt: e.target.value })} />
              </FormGroup>
            </div>
          )}
        </FormSection>

        {(form.type === 'join_channel' || form.type === 'join_group' || form.type === 'start_bot') && (
          <FormSection title="Telegram target">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormGroup>
                <FormLabel required>Telegram URL</FormLabel>
                <FormInput value={form.targetUrl} onChange={e => setForm({ ...form, targetUrl: e.target.value })} placeholder="https://t.me/..." />
              </FormGroup>
              <FormGroup>
                <FormLabel>Telegram ID (verification)</FormLabel>
                <FormInput value={form.targetId} onChange={e => setForm({ ...form, targetId: e.target.value })} placeholder="-1001234567890" />
              </FormGroup>
            </div>
          </FormSection>
        )}

        {form.type === 'watch_video' && (
          <FormSection title="Video to watch">
            <FormGroup>
              <FormLabel required>Video URL</FormLabel>
              <FormInput value={form.targetUrl} onChange={e => setForm({ ...form, targetUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
            </FormGroup>
            <p className="text-xs text-slate-500 mt-1">The user must stay on the page for 20 seconds before being able to validate.</p>
          </FormSection>
        )}

        {form.type === 'social' && (
          <FormSection title="Account to follow">
            <FormGroup>
              <FormLabel required>Profile URL</FormLabel>
              <FormInput value={form.targetUrl} onChange={e => setForm({ ...form, targetUrl: e.target.value })} placeholder="https://x.com/... or https://instagram.com/... or https://tiktok.com/@..." />
            </FormGroup>
            <p className="text-xs text-slate-500 mt-1">Supports X, Instagram, TikTok, Discord, YouTube. Logo is detected automatically.</p>
          </FormSection>
        )}

        {form.type === 'invite_friends' && (
          <FormSection title="Invitation condition">
            <FormGroup>
              <FormLabel required>Number of friends to invite</FormLabel>
              <FormInput type="number" min="1" value={form.requiredCount} onChange={e => setForm({ ...form, requiredCount: parseInt(e.target.value) || 1 })} />
            </FormGroup>
          </FormSection>
        )}

        <FormSection title="Advanced settings">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormGroup>
              <FormLabel>Verification method</FormLabel>
              <FormSelect value={form.verificationMethod} onChange={e => setForm({ ...form, verificationMethod: e.target.value as Task['verificationMethod'] })}>
                <option value="auto">Automatic</option>
                <option value="api">External API</option>
                <option value="manual">Manual</option>
              </FormSelect>
            </FormGroup>
            <FormGroup>
              <FormLabel>Max completions (global)</FormLabel>
              <FormInput type="number" min="0" value={form.maxCompletions || ''} onChange={e => setForm({ ...form, maxCompletions: parseInt(e.target.value) || undefined })} placeholder="Unlimited" />
            </FormGroup>
            <FormGroup>
              <FormLabel>Max per user</FormLabel>
              <FormInput type="number" min="0" value={form.maxPerUser || ''} onChange={e => setForm({ ...form, maxPerUser: parseInt(e.target.value) || undefined })} placeholder="Unlimited" />
            </FormGroup>
          </div>

          {form.type === 'daily' && (
            <FormGroup>
              <FormLabel>Cooldown (hours)</FormLabel>
              <FormInput type="number" min="0" value={form.cooldownHours} onChange={e => setForm({ ...form, cooldownHours: parseInt(e.target.value) || 0 })} />
            </FormGroup>
          )}

          <FormGroup>
            <FormLabel>Expiry date</FormLabel>
            <FormInput type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
          </FormGroup>

          <div className="flex items-center gap-6 pt-2 flex-wrap">
            <ToggleSwitch enabled={form.isActive} onChange={v => setForm({ ...form, isActive: v })} label="Task active" />
            <ToggleSwitch enabled={form.isPromoTask} onChange={v => setForm({ ...form, isPromoTask: v })} label="🎯 Promo task (manual verification)" />
          </div>
        </FormSection>

        <FormActions>
          <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button type="submit">{isEdit ? 'Save' : 'Create task'}</Button>
        </FormActions>
      </form>
    </Modal>
  );
};
