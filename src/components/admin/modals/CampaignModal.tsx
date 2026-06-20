import React, { useState } from 'react';
import { useAppStore, Campaign } from '../../../store/appStore';
import { Modal, FormGroup, FormLabel, FormInput, FormTextarea, FormSelect, FormSection, FormActions, Button } from '../../ui/Modal';
import { ToggleSwitch } from '../../ui/ToggleSwitch';

export const CampaignModal: React.FC = () => {
  const { modalData, addCampaign, updateCampaign, closeModal } = useAppStore();
  const isEdit = modalData?.campaign;
  const campaign = modalData?.campaign as Campaign | undefined;

  const [form, setForm] = useState({
    advertiserName: campaign?.advertiserName || '',
    type: campaign?.type || 'channel',
    targetUrl: campaign?.targetUrl || '',
    targetName: campaign?.targetName || '',
    budget: campaign?.budget || 100,
    rewardPerAction: campaign?.rewardPerAction || 0.5,
    maxActions: campaign?.maxActions || 200,
    status: campaign?.status || 'pending',
    startDate: campaign?.startDate || new Date().toISOString().split('T')[0],
    endDate: campaign?.endDate || '',
    requireVerification: campaign?.requireVerification ?? true,
    minUserLevel: campaign?.minUserLevel || undefined,
    targetCountry: campaign?.targetCountry || '',
    description: campaign?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      advertiserId: campaign?.advertiserId || ('adv_' + Date.now()),
    };

    if (isEdit && campaign) {
      updateCampaign(campaign.id, data);
    } else {
      addCampaign(data as Omit<Campaign, 'id' | 'createdAt' | 'spent' | 'totalActions'>);
    }
    closeModal();
  };

  return (
    <Modal title={isEdit ? 'Edit campaign' : 'New campaign'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Advertiser information">
          <FormGroup>
            <FormLabel required>Advertiser name</FormLabel>
            <FormInput value={form.advertiserName} onChange={e => setForm({ ...form, advertiserName: e.target.value })} placeholder="Company name" required />
          </FormGroup>

          <FormGroup>
            <FormLabel>Campaign description</FormLabel>
            <FormTextarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Optional description..." />
          </FormGroup>
        </FormSection>

        <FormSection title="Target">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Type</FormLabel>
              <FormSelect value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Campaign['type'] })}>
                <option value="channel">Telegram channel</option>
                <option value="group">Telegram group</option>
                <option value="bot">Telegram bot</option>
              </FormSelect>
            </FormGroup>
            <FormGroup>
              <FormLabel required>Target name</FormLabel>
              <FormInput value={form.targetName} onChange={e => setForm({ ...form, targetName: e.target.value })} placeholder="Channel/group/bot name" required />
            </FormGroup>
          </div>

          <FormGroup>
            <FormLabel required>Telegram URL</FormLabel>
            <FormInput value={form.targetUrl} onChange={e => setForm({ ...form, targetUrl: e.target.value })} placeholder="https://t.me/..." required />
          </FormGroup>
        </FormSection>

        <FormSection title="Budget & Rewards">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormGroup>
              <FormLabel required>Total budget ($)</FormLabel>
              <FormInput type="number" step="0.01" min="0" value={form.budget} onChange={e => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Reward per action ($)</FormLabel>
              <FormInput type="number" step="0.01" min="0" value={form.rewardPerAction} onChange={e => setForm({ ...form, rewardPerAction: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Max actions</FormLabel>
              <FormInput type="number" min="1" value={form.maxActions} onChange={e => setForm({ ...form, maxActions: parseInt(e.target.value) || 1 })} />
            </FormGroup>
          </div>
        </FormSection>

        <FormSection title="Scheduling">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Start date</FormLabel>
              <FormInput type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
            </FormGroup>
            <FormGroup>
              <FormLabel required>End date</FormLabel>
              <FormInput type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required />
            </FormGroup>
          </div>

          <FormGroup>
            <FormLabel>Status</FormLabel>
            <FormSelect value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Campaign['status'] })}>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </FormSelect>
          </FormGroup>
        </FormSection>

        <FormSection title="Conditions">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel>Minimum user level</FormLabel>
              <FormInput type="number" min="0" value={form.minUserLevel || ''} onChange={e => setForm({ ...form, minUserLevel: parseInt(e.target.value) || undefined })} placeholder="None" />
            </FormGroup>
            <FormGroup>
              <FormLabel>Target country</FormLabel>
              <FormInput value={form.targetCountry} onChange={e => setForm({ ...form, targetCountry: e.target.value })} placeholder="All" />
            </FormGroup>
          </div>

          <div className="pt-2">
            <ToggleSwitch enabled={form.requireVerification} onChange={v => setForm({ ...form, requireVerification: v })} label="Verification required (bot must be admin)" />
          </div>
        </FormSection>

        <FormActions>
          <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button type="submit">{isEdit ? 'Save' : 'Create campaign'}</Button>
        </FormActions>
      </form>
    </Modal>
  );
};
