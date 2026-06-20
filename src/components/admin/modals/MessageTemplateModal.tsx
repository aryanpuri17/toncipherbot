import React, { useState } from 'react';
import { useAppStore, MessageTemplate } from '../../../store/appStore';
import { Modal, FormGroup, FormLabel, FormInput, FormTextarea, FormSelect, FormSection, FormActions, Button } from '../../ui/Modal';
import { ToggleSwitch } from '../../ui/ToggleSwitch';

export const MessageTemplateModal: React.FC = () => {
  const { modalData, addMessageTemplate, updateMessageTemplate, closeModal } = useAppStore();
  const isEdit = modalData?.template;
  const template = modalData?.template as MessageTemplate | undefined;

  const [form, setForm] = useState({
    key: template?.key || '',
    name: template?.name || '',
    category: template?.category || 'notification',
    content: template?.content || '',
    variables: template?.variables?.join(', ') || '',
    isActive: template?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      variables: form.variables.split(',').map(v => v.trim()).filter(Boolean),
    };

    if (isEdit && template) {
      updateMessageTemplate(template.id, data);
    } else {
      addMessageTemplate(data as Omit<MessageTemplate, 'id'>);
    }
    closeModal();
  };

  return (
    <Modal title={isEdit ? 'Edit template' : 'New message template'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Unique key</FormLabel>
              <FormInput value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="welcome, deposit_confirmed..." required />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Name</FormLabel>
              <FormInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Welcome message" required />
            </FormGroup>
          </div>

          <FormGroup>
            <FormLabel required>Category</FormLabel>
            <FormSelect value={form.category} onChange={e => setForm({ ...form, category: e.target.value as MessageTemplate['category'] })}>
              <option value="welcome">Welcome</option>
              <option value="task">Tasks</option>
              <option value="payment">Payments</option>
              <option value="referral">Referral</option>
              <option value="level">Levels</option>
              <option value="notification">Notifications</option>
              <option value="error">Errors</option>
              <option value="admin">Admin</option>
            </FormSelect>
          </FormGroup>
        </FormSection>

        <FormSection title="Message content">
          <FormGroup>
            <FormLabel required>Message (supports Markdown)</FormLabel>
            <FormTextarea
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              rows={8}
              placeholder={"👋 Welcome {firstName}!\n\n🎁 Your bonus: {welcomeBonus}$"}
              required
              className="font-mono text-sm"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Available variables</FormLabel>
            <FormInput
              value={form.variables}
              onChange={e => setForm({ ...form, variables: e.target.value })}
              placeholder="firstName, amount, currency, txHash..."
            />
            <p className="text-[10px] text-slate-500 mt-1">Separated by commas. Use {'{variable}'} in the message.</p>
          </FormGroup>

          <div className="pt-2">
            <ToggleSwitch enabled={form.isActive} onChange={v => setForm({ ...form, isActive: v })} label="Template active" />
          </div>
        </FormSection>

        <div className="glass-card-light p-4">
          <p className="text-xs font-semibold text-slate-400 mb-2">Preview</p>
          <div className="bg-[#0d1117] rounded-lg p-3 text-sm text-white whitespace-pre-wrap border border-white/5">
            {form.content || 'No content...'}
          </div>
        </div>

        <FormActions>
          <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button type="submit">{isEdit ? 'Save' : 'Create'}</Button>
        </FormActions>
      </form>
    </Modal>
  );
};
