import React, { useState } from 'react';
import { useAppStore, ShopItem } from '../../../store/appStore';
import { Modal, FormGroup, FormLabel, FormInput, FormTextarea, FormSelect, FormSection, FormActions, Button } from '../../ui/Modal';
import { ToggleSwitch } from '../../ui/ToggleSwitch';

export const ShopItemModal: React.FC = () => {
  const { modalData, addShopItem, updateShopItem, closeModal } = useAppStore();
  const isEdit = modalData?.item;
  const item = modalData?.item as ShopItem | undefined;

  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || 5,
    currency: item?.currency || 'main',
    type: item?.type || 'bonus_pack',
    value: item?.value || 10,
    duration: item?.duration || undefined,
    isActive: item?.isActive ?? true,
    maxPurchases: item?.maxPurchases || undefined,
    maxPerUser: item?.maxPerUser || undefined,
    icon: item?.icon || '🎁',
    requiredLevel: item?.requiredLevel || undefined,
    category: item?.category || 'general',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && item) {
      updateShopItem(item.id, form);
    } else {
      addShopItem(form as Omit<ShopItem, 'id' | 'purchases'>);
    }
    closeModal();
  };

  return (
    <Modal title={isEdit ? 'Modifier l\'article' : 'Nouvel article'} size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Informations">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Nom</FormLabel>
              <FormInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nom de l'article" required />
            </FormGroup>
            <FormGroup>
              <FormLabel>Icône</FormLabel>
              <FormInput value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="🎁" />
            </FormGroup>
          </div>

          <FormGroup>
            <FormLabel required>Description</FormLabel>
            <FormTextarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} required />
          </FormGroup>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Type</FormLabel>
              <FormSelect value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ShopItem['type'] })}>
                <option value="bonus_pack">Pack bonus</option>
                <option value="multiplier">Multiplicateur</option>
                <option value="premium">Premium</option>
                <option value="badge">Badge</option>
                <option value="vip">VIP</option>
                <option value="special">Spécial</option>
              </FormSelect>
            </FormGroup>
            <FormGroup>
              <FormLabel>Catégorie</FormLabel>
              <FormInput value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="boosters, packs, premium..." />
            </FormGroup>
          </div>
        </FormSection>

        <FormSection title="Prix et valeur">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormGroup>
              <FormLabel required>Prix</FormLabel>
              <FormInput type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Devise</FormLabel>
              <FormSelect value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value as 'main' | 'bonus' | 'xp' })}>
                <option value="main">Solde principal</option>
                <option value="bonus">Solde bonus</option>
                <option value="xp">XP</option>
              </FormSelect>
            </FormGroup>
            <FormGroup>
              <FormLabel required>Valeur</FormLabel>
              <FormInput type="number" step="0.01" min="0" value={form.value} onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
          </div>

          {(form.type === 'multiplier' || form.type === 'premium' || form.type === 'vip') && (
            <FormGroup>
              <FormLabel>Durée (heures)</FormLabel>
              <FormInput type="number" min="1" value={form.duration || ''} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || undefined })} placeholder="Ex: 24 pour 24h" />
            </FormGroup>
          )}
        </FormSection>

        <FormSection title="Limites">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormGroup>
              <FormLabel>Stock maximum (global)</FormLabel>
              <FormInput type="number" min="0" value={form.maxPurchases || ''} onChange={e => setForm({ ...form, maxPurchases: parseInt(e.target.value) || undefined })} placeholder="Illimité" />
            </FormGroup>
            <FormGroup>
              <FormLabel>Max par utilisateur</FormLabel>
              <FormInput type="number" min="0" value={form.maxPerUser || ''} onChange={e => setForm({ ...form, maxPerUser: parseInt(e.target.value) || undefined })} placeholder="Illimité" />
            </FormGroup>
            <FormGroup>
              <FormLabel>Niveau requis</FormLabel>
              <FormInput type="number" min="0" value={form.requiredLevel || ''} onChange={e => setForm({ ...form, requiredLevel: parseInt(e.target.value) || undefined })} placeholder="Aucun" />
            </FormGroup>
          </div>

          <div className="pt-2">
            <ToggleSwitch enabled={form.isActive} onChange={v => setForm({ ...form, isActive: v })} label="Article actif" />
          </div>
        </FormSection>

        <FormActions>
          <Button type="button" variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button type="submit">{isEdit ? 'Enregistrer' : 'Créer'}</Button>
        </FormActions>
      </form>
    </Modal>
  );
};
