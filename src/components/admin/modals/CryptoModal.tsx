import React, { useState } from 'react';
import { useAppStore, CryptoNetwork } from '../../../store/appStore';
import { Modal, FormGroup, FormLabel, FormInput, FormSelect, FormSection, FormActions, Button } from '../../ui/Modal';
import { ToggleSwitch } from '../../ui/ToggleSwitch';

export const CryptoModal: React.FC = () => {
  const { modalData, addCryptoNetwork, updateCryptoNetwork, closeModal } = useAppStore();
  const isEdit = modalData?.network;
  const network = modalData?.network as CryptoNetwork | undefined;

  const [form, setForm] = useState({
    name: network?.name || '',
    symbol: network?.symbol || '',
    network: network?.network || '',
    isActive: network?.isActive ?? true,
    isDepositEnabled: network?.isDepositEnabled ?? true,
    isWithdrawalEnabled: network?.isWithdrawalEnabled ?? true,
    minDeposit: network?.minDeposit || 1,
    maxDeposit: network?.maxDeposit || 10000,
    minWithdrawal: network?.minWithdrawal || 5,
    maxWithdrawal: network?.maxWithdrawal || 5000,
    withdrawalFee: network?.withdrawalFee || 0.5,
    withdrawalFeeType: network?.withdrawalFeeType || 'fixed',
    requiredConfirmations: network?.requiredConfirmations || 12,
    dailyWithdrawalLimit: network?.dailyWithdrawalLimit || 10000,
    autoWithdrawal: network?.autoWithdrawal ?? false,
    autoWithdrawalThreshold: network?.autoWithdrawalThreshold || 100,
    hotWalletBalance: network?.hotWalletBalance || 0,
    coldWalletBalance: network?.coldWalletBalance || 0,
    hotWalletAddress: network?.hotWalletAddress || '',
    coldWalletAddress: network?.coldWalletAddress || '',
    explorerUrl: network?.explorerUrl || '',
    decimals: network?.decimals || 18,
    contractAddress: network?.contractAddress || '',
    priority: network?.priority || 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && network) {
      updateCryptoNetwork(network.id, form);
    } else {
      addCryptoNetwork(form as Omit<CryptoNetwork, 'id'>);
    }
    closeModal();
  };

  return (
    <Modal title={isEdit ? 'Modifier le réseau crypto' : 'Ajouter un réseau crypto'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Informations de base">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormGroup>
              <FormLabel required>Nom</FormLabel>
              <FormInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Tether" required />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Symbole</FormLabel>
              <FormInput value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} placeholder="USDT" required />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Réseau</FormLabel>
              <FormInput value={form.network} onChange={e => setForm({ ...form, network: e.target.value })} placeholder="TRC20, BEP20, TON..." required />
            </FormGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel>Décimales</FormLabel>
              <FormInput type="number" min="0" max="18" value={form.decimals} onChange={e => setForm({ ...form, decimals: parseInt(e.target.value) || 18 })} />
            </FormGroup>
            <FormGroup>
              <FormLabel>Priorité d'affichage</FormLabel>
              <FormInput type="number" min="1" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 1 })} />
            </FormGroup>
          </div>

          <FormGroup>
            <FormLabel>Adresse du contrat (si token)</FormLabel>
            <FormInput value={form.contractAddress} onChange={e => setForm({ ...form, contractAddress: e.target.value })} placeholder="0x..." />
          </FormGroup>

          <FormGroup>
            <FormLabel>URL de l'explorateur</FormLabel>
            <FormInput value={form.explorerUrl} onChange={e => setForm({ ...form, explorerUrl: e.target.value })} placeholder="https://tronscan.org/#/transaction/" />
          </FormGroup>
        </FormSection>

        <FormSection title="Limites de dépôt">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel>Dépôt minimum</FormLabel>
              <FormInput type="number" step="0.01" min="0" value={form.minDeposit} onChange={e => setForm({ ...form, minDeposit: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
            <FormGroup>
              <FormLabel>Dépôt maximum</FormLabel>
              <FormInput type="number" step="0.01" min="0" value={form.maxDeposit} onChange={e => setForm({ ...form, maxDeposit: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
          </div>
          <FormGroup>
            <FormLabel>Confirmations requises</FormLabel>
            <FormInput type="number" min="1" value={form.requiredConfirmations} onChange={e => setForm({ ...form, requiredConfirmations: parseInt(e.target.value) || 1 })} />
          </FormGroup>
        </FormSection>

        <FormSection title="Limites de retrait">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel>Retrait minimum</FormLabel>
              <FormInput type="number" step="0.01" min="0" value={form.minWithdrawal} onChange={e => setForm({ ...form, minWithdrawal: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
            <FormGroup>
              <FormLabel>Retrait maximum</FormLabel>
              <FormInput type="number" step="0.01" min="0" value={form.maxWithdrawal} onChange={e => setForm({ ...form, maxWithdrawal: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormGroup>
              <FormLabel>Frais de retrait</FormLabel>
              <FormInput type="number" step="0.01" min="0" value={form.withdrawalFee} onChange={e => setForm({ ...form, withdrawalFee: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
            <FormGroup>
              <FormLabel>Type de frais</FormLabel>
              <FormSelect value={form.withdrawalFeeType} onChange={e => setForm({ ...form, withdrawalFeeType: e.target.value as 'fixed' | 'percentage' })}>
                <option value="fixed">Fixe</option>
                <option value="percentage">Pourcentage</option>
              </FormSelect>
            </FormGroup>
            <FormGroup>
              <FormLabel>Limite journalière</FormLabel>
              <FormInput type="number" step="0.01" min="0" value={form.dailyWithdrawalLimit} onChange={e => setForm({ ...form, dailyWithdrawalLimit: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
          </div>
        </FormSection>

        <FormSection title="Wallets">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel>Adresse Hot Wallet</FormLabel>
              <FormInput value={form.hotWalletAddress} onChange={e => setForm({ ...form, hotWalletAddress: e.target.value })} placeholder="Adresse..." />
            </FormGroup>
            <FormGroup>
              <FormLabel>Balance Hot Wallet</FormLabel>
              <FormInput type="number" step="0.01" min="0" value={form.hotWalletBalance} onChange={e => setForm({ ...form, hotWalletBalance: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel>Adresse Cold Wallet</FormLabel>
              <FormInput value={form.coldWalletAddress} onChange={e => setForm({ ...form, coldWalletAddress: e.target.value })} placeholder="Adresse..." />
            </FormGroup>
            <FormGroup>
              <FormLabel>Balance Cold Wallet</FormLabel>
              <FormInput type="number" step="0.01" min="0" value={form.coldWalletBalance} onChange={e => setForm({ ...form, coldWalletBalance: parseFloat(e.target.value) || 0 })} />
            </FormGroup>
          </div>
        </FormSection>

        <FormSection title="Retrait automatique">
          <div className="space-y-4">
            <ToggleSwitch enabled={form.autoWithdrawal} onChange={v => setForm({ ...form, autoWithdrawal: v })} label="Activer le retrait automatique" />
            {form.autoWithdrawal && (
              <FormGroup>
                <FormLabel>Seuil de retrait automatique (montant max sans review)</FormLabel>
                <FormInput type="number" step="0.01" min="0" value={form.autoWithdrawalThreshold} onChange={e => setForm({ ...form, autoWithdrawalThreshold: parseFloat(e.target.value) || 0 })} />
              </FormGroup>
            )}
          </div>
        </FormSection>

        <FormSection title="Activation">
          <div className="space-y-4">
            <ToggleSwitch enabled={form.isActive} onChange={v => setForm({ ...form, isActive: v })} label="Réseau actif" />
            <ToggleSwitch enabled={form.isDepositEnabled} onChange={v => setForm({ ...form, isDepositEnabled: v })} label="Dépôts activés" />
            <ToggleSwitch enabled={form.isWithdrawalEnabled} onChange={v => setForm({ ...form, isWithdrawalEnabled: v })} label="Withdrawals enabled" />
          </div>
        </FormSection>

        <FormActions>
          <Button type="button" variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button type="submit">{isEdit ? 'Save' : 'Add'}</Button>
        </FormActions>
      </form>
    </Modal>
  );
};
