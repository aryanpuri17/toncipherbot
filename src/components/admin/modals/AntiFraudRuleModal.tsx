import React, { useState } from 'react';
import { useAppStore, AntiFraudRule } from '../../../store/appStore';
import { Modal, FormGroup, FormLabel, FormInput, FormTextarea, FormSelect, FormSection, FormActions, Button } from '../../ui/Modal';
import { ToggleSwitch } from '../../ui/ToggleSwitch';

export const AntiFraudRuleModal: React.FC = () => {
  const { modalData, addAntiFraudRule, updateAntiFraudRule, closeModal } = useAppStore();
  const isEdit = modalData?.rule;
  const rule = modalData?.rule as AntiFraudRule | undefined;

  const [form, setForm] = useState({
    name: rule?.name || '',
    type: rule?.type || 'behavior',
    isActive: rule?.isActive ?? true,
    threshold: rule?.threshold || 1,
    action: rule?.action || 'flag',
    severity: rule?.severity || 'medium',
    description: rule?.description || '',
    cooldownMinutes: rule?.cooldownMinutes || undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && rule) {
      updateAntiFraudRule(rule.id, form);
    } else {
      addAntiFraudRule(form as Omit<AntiFraudRule, 'id'>);
    }
    closeModal();
  };

  return (
    <Modal title={isEdit ? 'Edit rule' : 'New anti-fraud rule'} size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Information">
          <FormGroup>
            <FormLabel required>Rule name</FormLabel>
            <FormInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Multi-account detection" required />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Detection type</FormLabel>
            <FormSelect value={form.type} onChange={e => setForm({ ...form, type: e.target.value as AntiFraudRule['type'] })}>
              <option value="ip_duplicate">Duplicate IP</option>
              <option value="device_duplicate">Duplicate device</option>
              <option value="behavior">Suspicious behavior</option>
              <option value="speed">Abnormal speed</option>
              <option value="vpn">VPN/Proxy</option>
              <option value="referral_abuse">Referral abuse</option>
              <option value="withdrawal_pattern">Withdrawal pattern</option>
            </FormSelect>
          </FormGroup>

          <FormGroup>
            <FormLabel>Description</FormLabel>
            <FormTextarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Rule description..." />
          </FormGroup>
        </FormSection>

        <FormSection title="Settings">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Trigger threshold</FormLabel>
              <FormInput type="number" min="1" value={form.threshold} onChange={e => setForm({ ...form, threshold: parseInt(e.target.value) || 1 })} />
              <p className="text-[10px] text-slate-500 mt-1">Number of occurrences before action</p>
            </FormGroup>
            <FormGroup>
              <FormLabel>Cooldown (minutes)</FormLabel>
              <FormInput type="number" min="0" value={form.cooldownMinutes || ''} onChange={e => setForm({ ...form, cooldownMinutes: parseInt(e.target.value) || undefined })} placeholder="None" />
            </FormGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Severity</FormLabel>
              <FormSelect value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value as AntiFraudRule['severity'] })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </FormSelect>
            </FormGroup>
            <FormGroup>
              <FormLabel required>Automatic action</FormLabel>
              <FormSelect value={form.action} onChange={e => setForm({ ...form, action: e.target.value as AntiFraudRule['action'] })}>
                <option value="flag">Flag</option>
                <option value="review">Put under review</option>
                <option value="suspend">Suspend account</option>
                <option value="ban">Ban account</option>
                <option value="block_withdrawal">Block withdrawals</option>
              </FormSelect>
            </FormGroup>
          </div>

          <div className="pt-2">
            <ToggleSwitch enabled={form.isActive} onChange={v => setForm({ ...form, isActive: v })} label="Rule active" />
          </div>
        </FormSection>

        <FormActions>
          <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button type="submit">{isEdit ? 'Save' : 'Create'}</Button>
        </FormActions>
      </form>
    </Modal>
  );
};
