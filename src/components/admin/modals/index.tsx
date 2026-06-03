import React from 'react';
import { useAppStore } from '../../../store/appStore';
import { TaskModal } from './TaskModal';
import { ChannelModal } from './ChannelModal';
import { CryptoModal } from './CryptoModal';
import { ShopItemModal } from './ShopItemModal';
import { MessageTemplateModal } from './MessageTemplateModal';
import { AntiFraudRuleModal } from './AntiFraudRuleModal';
import { CampaignModal } from './CampaignModal';

export const ModalManager: React.FC = () => {
  const { modalOpen } = useAppStore();

  if (!modalOpen) return null;

  switch (modalOpen) {
    case 'task': return <TaskModal />;
    case 'channel': return <ChannelModal />;
    case 'crypto': return <CryptoModal />;
    case 'shopItem': return <ShopItemModal />;
    case 'messageTemplate': return <MessageTemplateModal />;
    case 'antiFraudRule': return <AntiFraudRuleModal />;
    case 'campaign': return <CampaignModal />;
    default: return null;
  }
};
