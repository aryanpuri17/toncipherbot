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
    <Modal title={isEdit ? 'Modifier la règle' : 'Nouvelle règle anti-fraude'} size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Informations">
          <FormGroup>
            <FormLabel required>Nom de la règle</FormLabel>
            <FormInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Détection multi-comptes" required />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Type de détection</FormLabel>
            <FormSelect value={form.type} onChange={e => setForm({ ...form, type: e.target.value as AntiFraudRule['type'] })}>
              <option value="ip_duplicate">IP dupliquée</option>
              <option value="device_duplicate">Appareil dupliqué</option>
              <option value="behavior">Comportement suspect</option>
              <option value="speed">Vitesse anormale</option>
              <option value="vpn">VPN/Proxy</option>
              <option value="referral_abuse">Abus de parrainage</option>
              <option value="withdrawal_pattern">Pattern de retrait</option>
            </FormSelect>
          </FormGroup>

          <FormGroup>
            <FormLabel>Description</FormLabel>
            <FormTextarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Description de la règle..." />
          </FormGroup>
        </FormSection>

        <FormSection title="Paramètres">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Seuil de déclenchement</FormLabel>
              <FormInput type="number" min="1" value={form.threshold} onChange={e => setForm({ ...form, threshold: parseInt(e.target.value) || 1 })} />
              <p className="text-[10px] text-slate-500 mt-1">Nombre d'occurrences avant action</p>
            </FormGroup>
            <FormGroup>
              <FormLabel>Cooldown (minutes)</FormLabel>
              <FormInput type="number" min="0" value={form.cooldownMinutes || ''} onChange={e => setForm({ ...form, cooldownMinutes: parseInt(e.target.value) || undefined })} placeholder="Aucun" />
            </FormGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Sévérité</FormLabel>
              <FormSelect value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value as AntiFraudRule['severity'] })}>
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Élevée</option>
                <option value="critical">Critique</option>
              </FormSelect>
            </FormGroup>
            <FormGroup>
              <FormLabel required>Action automatique</FormLabel>
              <FormSelect value={form.action} onChange={e => setForm({ ...form, action: e.target.value as AntiFraudRule['action'] })}>
                <option value="flag">Marquer (flag)</option>
                <option value="review">Mettre en revue</option>
                <option value="suspend">Suspendre le compte</option>
                <option value="ban">Bannir le compte</option>
                <option value="block_withdrawal">Bloquer les retraits</option>
              </FormSelect>
            </FormGroup>
          </div>

          <div className="pt-2">
            <ToggleSwitch enabled={form.isActive} onChange={v => setForm({ ...form, isActive: v })} label="Règle active" />
          </div>
        </FormSection>

        <FormActions>
          <Button type="button" variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button type="submit">{isEdit ? 'Save' : 'Create'}</Button>
        </FormActions>
      </form>
    </Modal>
  );
};
