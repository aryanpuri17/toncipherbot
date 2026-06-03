import React, { useState } from 'react';
import { useAppStore, Channel } from '../../../store/appStore';
import { Modal, FormGroup, FormLabel, FormInput, FormSelect, FormSection, FormActions, Button } from '../../ui/Modal';
import { ToggleSwitch } from '../../ui/ToggleSwitch';

export const ChannelModal: React.FC = () => {
  const { modalData, addChannel, updateChannel, closeModal } = useAppStore();
  const isEdit = modalData?.channel;
  const channel = modalData?.channel as Channel | undefined;

  const [form, setForm] = useState({
    telegramId: channel?.telegramId || '',
    name: channel?.name || '',
    username: channel?.username || '',
    type: channel?.type || 'channel',
    memberCount: channel?.memberCount || 0,
    isMandatory: channel?.isMandatory ?? false,
    isActive: channel?.isActive ?? true,
    botIsAdmin: channel?.botIsAdmin ?? false,
    verificationEnabled: channel?.verificationEnabled ?? true,
    joinReward: channel?.joinReward || 0,
    priority: channel?.priority || 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && channel) {
      updateChannel(channel.id, form);
    } else {
      addChannel(form as Omit<Channel, 'id'>);
    }
    closeModal();
  };

  return (
    <Modal title={isEdit ? 'Modifier le canal/groupe' : 'Ajouter un canal/groupe'} size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Informations">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Type</FormLabel>
              <FormSelect value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'channel' | 'group' })}>
                <option value="channel">Canal</option>
                <option value="group">Groupe</option>
              </FormSelect>
            </FormGroup>
            <FormGroup>
              <FormLabel required>Priorité</FormLabel>
              <FormInput type="number" min="1" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 1 })} />
            </FormGroup>
          </div>

          <FormGroup>
            <FormLabel required>Nom</FormLabel>
            <FormInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nom du canal/groupe" required />
          </FormGroup>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>ID Telegram</FormLabel>
              <FormInput value={form.telegramId} onChange={e => setForm({ ...form, telegramId: e.target.value })} placeholder="-1001234567890" required />
            </FormGroup>
            <FormGroup>
              <FormLabel>Username</FormLabel>
              <FormInput value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="@channel_name" />
            </FormGroup>
          </div>

          <FormGroup>
            <FormLabel>Nombre de membres (estimé)</FormLabel>
            <FormInput type="number" min="0" value={form.memberCount} onChange={e => setForm({ ...form, memberCount: parseInt(e.target.value) || 0 })} />
          </FormGroup>
        </FormSection>

        <FormSection title="Récompense">
          <FormGroup>
            <FormLabel>Récompense pour rejoindre ($)</FormLabel>
            <FormInput type="number" step="0.01" min="0" value={form.joinReward} onChange={e => setForm({ ...form, joinReward: parseFloat(e.target.value) || 0 })} placeholder="0 = pas de récompense" />
          </FormGroup>
        </FormSection>

        <FormSection title="Paramètres">
          <div className="space-y-4">
            <ToggleSwitch enabled={form.isMandatory} onChange={v => setForm({ ...form, isMandatory: v })} label="Obligatoire pour utiliser le bot" />
            <ToggleSwitch enabled={form.verificationEnabled} onChange={v => setForm({ ...form, verificationEnabled: v })} label="Vérification automatique des membres" />
            <ToggleSwitch enabled={form.botIsAdmin} onChange={v => setForm({ ...form, botIsAdmin: v })} label="Le bot est admin (requis pour vérification)" />
            <ToggleSwitch enabled={form.isActive} onChange={v => setForm({ ...form, isActive: v })} label="Actif" />
          </div>
        </FormSection>

        <FormActions>
          <Button type="button" variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button type="submit">{isEdit ? 'Enregistrer' : 'Ajouter'}</Button>
        </FormActions>
      </form>
    </Modal>
  );
};
