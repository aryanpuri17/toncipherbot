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
    <Modal title={isEdit ? 'Modifier le template' : 'Nouveau template de message'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Informations">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Clé unique</FormLabel>
              <FormInput value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="welcome, deposit_confirmed..." required />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Nom</FormLabel>
              <FormInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Message de bienvenue" required />
            </FormGroup>
          </div>

          <FormGroup>
            <FormLabel required>Catégorie</FormLabel>
            <FormSelect value={form.category} onChange={e => setForm({ ...form, category: e.target.value as MessageTemplate['category'] })}>
              <option value="welcome">Bienvenue</option>
              <option value="task">Tâches</option>
              <option value="payment">Paiements</option>
              <option value="referral">Parrainage</option>
              <option value="level">Niveaux</option>
              <option value="notification">Notifications</option>
              <option value="error">Erreurs</option>
              <option value="admin">Admin</option>
            </FormSelect>
          </FormGroup>
        </FormSection>

        <FormSection title="Contenu du message">
          <FormGroup>
            <FormLabel required>Message (supporte Markdown)</FormLabel>
            <FormTextarea 
              value={form.content} 
              onChange={e => setForm({ ...form, content: e.target.value })} 
              rows={8} 
              placeholder="👋 Bienvenue {firstName}!&#10;&#10;🎁 Votre bonus: {welcomeBonus}$"
              required 
              className="font-mono text-sm"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Variables disponibles</FormLabel>
            <FormInput 
              value={form.variables} 
              onChange={e => setForm({ ...form, variables: e.target.value })} 
              placeholder="firstName, amount, currency, txHash..."
            />
            <p className="text-[10px] text-slate-500 mt-1">Séparées par des virgules. Utilisez {'{variable}'} dans le message.</p>
          </FormGroup>

          <div className="pt-2">
            <ToggleSwitch enabled={form.isActive} onChange={v => setForm({ ...form, isActive: v })} label="Template actif" />
          </div>
        </FormSection>

        <div className="glass-card-light p-4">
          <p className="text-xs font-semibold text-slate-400 mb-2">Aperçu</p>
          <div className="bg-[#0d1117] rounded-lg p-3 text-sm text-white whitespace-pre-wrap border border-white/5">
            {form.content || 'Aucun contenu...'}
          </div>
        </div>

        <FormActions>
          <Button type="button" variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button type="submit">{isEdit ? 'Enregistrer' : 'Créer'}</Button>
        </FormActions>
      </form>
    </Modal>
  );
};
