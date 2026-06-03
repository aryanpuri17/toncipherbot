import { create } from 'zustand';

// ===================== TYPES =====================

export interface User {
  id: string;
  telegramId: number;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  balanceMain: number;
  balanceBonus: number;
  balanceReferral: number;
  balanceRewards: number;
  totalEarnings: number;
  todayEarnings: number;
  xp: number;
  level: number;
  tasksCompleted: number;
  referralCount: number;
  referralCode: string;
  referredBy?: string;
  streak: number;
  badges: string[];
  riskScore: number;
  status: 'active' | 'suspended' | 'banned';
  createdAt: string;
  lastActive: string;
  ip?: string;
  deviceHash?: string;
  withdrawalBlocked: boolean;
  verificationStatus: 'none' | 'pending' | 'verified';
  dailyWithdrawn: number;
  dailyTasksCompleted: number;
}

export interface Task {
  id: string;
  type: 'join_channel' | 'join_group' | 'start_bot' | 'invite_friends' | 'daily' | 'special' | 'social' | 'watch_video';
  title: string;
  description: string;
  reward: number;
  rewardType: 'main' | 'bonus' | 'xp';
  targetUrl?: string;
  targetId?: string;
  requiredCount?: number;
  cooldownHours?: number;
  isActive: boolean;
  totalCompletions: number;
  maxCompletions?: number;
  maxPerUser?: number;
  expiresAt?: string;
  createdAt: string;
  campaignId?: string;
  verificationMethod: 'auto' | 'manual' | 'api';
  priority: number;
  requiredLevel?: number;
  icon?: string;
}

export interface Transaction {
  id: string;
  orderId?: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'reward' | 'referral' | 'purchase' | 'fee' | 'bonus' | 'admin_credit' | 'admin_debit';
  amount: number;
  currency: string;
  network?: string;
  status: 'pending' | 'confirming' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'review';
  txHash?: string;
  address?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  fee?: number;
  createdAt: string;
  completedAt?: string;
  retryCount?: number;
  adminNote?: string;
  processedBy?: string;
}

export interface Campaign {
  id: string;
  advertiserId: string;
  advertiserName: string;
  type: 'channel' | 'group' | 'bot';
  targetUrl: string;
  targetName: string;
  budget: number;
  spent: number;
  rewardPerAction: number;
  totalActions: number;
  maxActions: number;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'expired' | 'rejected';
  startDate: string;
  endDate: string;
  createdAt: string;
  requireVerification: boolean;
  minUserLevel?: number;
  targetCountry?: string;
  description?: string;
}

export interface Channel {
  id: string;
  telegramId: string;
  name: string;
  username?: string;
  type: 'channel' | 'group';
  memberCount: number;
  isMandatory: boolean;
  isActive: boolean;
  botIsAdmin: boolean;
  verificationEnabled: boolean;
  joinReward?: number;
  priority: number;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'main' | 'bonus' | 'xp';
  type: 'multiplier' | 'bonus_pack' | 'premium' | 'special' | 'badge' | 'vip';
  value: number;
  duration?: number; // hours
  isActive: boolean;
  purchases: number;
  maxPurchases?: number;
  maxPerUser?: number;
  icon: string;
  requiredLevel?: number;
  category: string;
}

export interface Notification {
  id: string;
  userId?: string;
  type: 'deposit' | 'withdrawal' | 'reward' | 'level' | 'mission' | 'system' | 'alert' | 'referral' | 'badge';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface FraudAlert {
  id: string;
  userId: string;
  username: string;
  type: 'multi_account' | 'vpn' | 'fake_referral' | 'spam' | 'task_abuse' | 'suspicious' | 'bot_behavior' | 'device_farm';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  action: 'none' | 'review' | 'suspended' | 'banned' | 'withdrawal_blocked';
  riskScore: number;
  createdAt: string;
  evidence?: string[];
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface CryptoNetwork {
  id: string;
  name: string;
  symbol: string;
  network: string;
  isActive: boolean;
  isDepositEnabled: boolean;
  isWithdrawalEnabled: boolean;
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  withdrawalFee: number;
  withdrawalFeeType: 'fixed' | 'percentage';
  requiredConfirmations: number;
  dailyWithdrawalLimit: number;
  autoWithdrawal: boolean;
  autoWithdrawalThreshold: number;
  hotWalletBalance: number;
  coldWalletBalance: number;
  hotWalletAddress?: string;
  coldWalletAddress?: string;
  explorerUrl?: string;
  decimals: number;
  contractAddress?: string;
  priority: number;
  iconUrl?: string;
}

export interface LevelConfig {
  level: number;
  xpRequired: number;
  title: string;
  color: string;
  reward: number;
  rewardType: 'main' | 'bonus';
  unlocks: string[];
  badge?: string;
}

export interface BadgeConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
  conditionType: 'tasks' | 'referrals' | 'level' | 'streak' | 'deposit' | 'special' | 'manual';
  conditionValue: number;
  reward: number;
  isActive: boolean;
}

export interface ReferralConfig {
  level: number;
  percentage: number;
  bonusType: 'signup' | 'activity' | 'deposit' | 'task';
  isActive: boolean;
}

export interface AntiFraudRule {
  id: string;
  name: string;
  type: 'ip_duplicate' | 'device_duplicate' | 'behavior' | 'speed' | 'vpn' | 'referral_abuse' | 'withdrawal_pattern';
  isActive: boolean;
  threshold: number;
  action: 'flag' | 'review' | 'suspend' | 'ban' | 'block_withdrawal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  cooldownMinutes?: number;
}

export interface MessageTemplate {
  id: string;
  key: string;
  name: string;
  category: 'welcome' | 'task' | 'payment' | 'referral' | 'level' | 'notification' | 'error' | 'admin';
  content: string;
  variables: string[];
  isActive: boolean;
}

export interface BotCommand {
  id: string;
  command: string;
  description: string;
  response: string;
  isActive: boolean;
  requiresAdmin: boolean;
  category: 'general' | 'wallet' | 'tasks' | 'referral' | 'support' | 'admin';
}

export interface WelcomeStep {
  id: string;
  order: number;
  type: 'message' | 'mandatory_join' | 'referral_check' | 'wallet_create' | 'bonus';
  content: string;
  isRequired: boolean;
  isActive: boolean;
  bonus?: number;
}

export interface WithdrawalRule {
  id: string;
  name: string;
  condition: 'min_tasks' | 'min_level' | 'min_deposit' | 'account_age' | 'verification' | 'no_fraud';
  value: number;
  isActive: boolean;
  errorMessage: string;
}

export interface DailyLimit {
  id: string;
  type: 'withdrawal' | 'deposit' | 'tasks' | 'referral_bonus';
  limit: number;
  perUser: boolean;
  resetTime: string; // UTC time
  isActive: boolean;
}

export interface PaymentProvider {
  id: string;
  name: string;
  type: 'nowpayments' | 'binance' | 'coinbase' | 'manual';
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  isActive: boolean;
  supportedNetworks: string[];
  testMode: boolean;
}

export interface PlatformConfig {
  // Bot Settings
  botToken: string;
  botUsername: string;
  apiId: string;
  apiHash: string;
  databaseUrl: string;
  
  // Telegram Links
  mainChannel: string;
  mainGroup: string;
  supportBot: string;
  announcementChannel: string;
  
  // Wallet
  mainWallet: string;
  hotWalletThreshold: number;
  coldWalletThreshold: number;
  
  // Referral System
  referralBonusSignup: number;
  referralBonusActivity: number;
  referralBonusDeposit: number;
  referralBonusDepositPercent: number;
  referralLevels: number;
  referralCodeLength: number;
  referralLinkPrefix: string;
  
  // XP & Levels
  xpPerTask: number;
  xpPerReferral: number;
  xpPerDeposit: number;
  xpMultiplier: number;
  maxLevel: number;
  
  // Streak System
  streakBonusPerDay: number;
  streakMultiplier: number;
  maxStreakBonus: number;
  streakResetHours: number;
  
  // Anti-Fraud
  antifraudEnabled: boolean;
  vpnDetectionEnabled: boolean;
  deviceFingerprintEnabled: boolean;
  maxAccountsPerDevice: number;
  maxAccountsPerIP: number;
  suspiciousActivityThreshold: number;
  autobanThreshold: number;
  
  // Withdrawals
  autoWithdrawalEnabled: boolean;
  autoWithdrawalMaxAmount: number;
  withdrawalReviewThreshold: number;
  minWithdrawalInterval: number; // hours
  requireVerificationAbove: number;
  
  // Tasks
  taskVerificationTimeout: number; // seconds
  taskCooldownGlobal: number; // minutes
  maxDailyTasks: number;
  bonusTaskMultiplier: number;
  
  // Deposits
  depositBonusPercent: number;
  firstDepositBonus: number;
  minDepositForBonus: number;
  
  // System
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationEnabled: boolean;
  welcomeBonusEnabled: boolean;
  welcomeBonusAmount: number;
  
  // Notifications
  adminNotifyDeposit: boolean;
  adminNotifyWithdrawal: boolean;
  adminNotifyFraud: boolean;
  adminNotifyNewUser: boolean;
  adminChatId: string;
  
  // Limits
  globalDailyWithdrawalLimit: number;
  globalDailyDepositLimit: number;
  maxPendingWithdrawals: number;
}

export interface AdminUser {
  id: string;
  telegramId: number;
  username: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'support';
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalDeposits: number;
  totalWithdrawals: number;
  platformRevenue: number;
  activeCampaigns: number;
  totalRewardsDistributed: number;
  totalTasks: number;
  completedTasksToday: number;
  totalReferrals: number;
  fraudAlertsToday: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
}

export interface LogEntry {
  id: string;
  type: 'info' | 'warning' | 'error' | 'security' | 'financial' | 'admin';
  category: string;
  message: string;
  userId?: string;
  adminId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ===================== MOCK DATA =====================

const mockUsers: User[] = [
  {
    id: '1', telegramId: 123456789, username: 'alexcrypto', firstName: 'Alex', lastName: 'Dupont',
    balanceMain: 245.80, balanceBonus: 50.00, balanceReferral: 32.50, balanceRewards: 15.00,
    totalEarnings: 892.30, todayEarnings: 12.50, xp: 4250, level: 12, tasksCompleted: 156,
    referralCount: 23, referralCode: 'ALEX2024', streak: 7, badges: ['early_adopter', 'task_master', 'referral_king'],
    riskScore: 5, status: 'active', createdAt: '2024-01-15T10:00:00Z', lastActive: '2024-12-20T14:30:00Z',
    ip: '192.168.1.1', deviceHash: 'abc123', withdrawalBlocked: false, verificationStatus: 'verified',
    dailyWithdrawn: 50, dailyTasksCompleted: 5
  },
  {
    id: '2', telegramId: 987654321, username: 'mariecoin', firstName: 'Marie', lastName: 'Laurent',
    balanceMain: 120.40, balanceBonus: 25.00, balanceReferral: 15.00, balanceRewards: 8.50,
    totalEarnings: 456.90, todayEarnings: 8.20, xp: 2100, level: 7, tasksCompleted: 89,
    referralCount: 12, referralCode: 'MARIE24', streak: 3, badges: ['early_adopter'],
    riskScore: 12, status: 'active', createdAt: '2024-02-20T08:00:00Z', lastActive: '2024-12-20T12:15:00Z',
    ip: '10.0.0.1', deviceHash: 'def456', withdrawalBlocked: false, verificationStatus: 'pending',
    dailyWithdrawn: 0, dailyTasksCompleted: 3
  },
  {
    id: '3', telegramId: 111222333, username: 'paultrader', firstName: 'Paul', lastName: 'Martin',
    balanceMain: 890.00, balanceBonus: 100.00, balanceReferral: 75.00, balanceRewards: 45.00,
    totalEarnings: 2340.50, todayEarnings: 45.00, xp: 8900, level: 22, tasksCompleted: 312,
    referralCount: 67, referralCode: 'PAUL777', streak: 15, badges: ['early_adopter', 'task_master', 'referral_king', 'whale', 'streak_champion'],
    riskScore: 3, status: 'active', createdAt: '2024-01-05T06:00:00Z', lastActive: '2024-12-20T16:00:00Z',
    ip: '172.16.0.1', deviceHash: 'ghi789', withdrawalBlocked: false, verificationStatus: 'verified',
    dailyWithdrawn: 200, dailyTasksCompleted: 10
  },
  {
    id: '4', telegramId: 444555666, username: 'suspicious_user', firstName: 'Jean', lastName: 'Suspect',
    balanceMain: 5000.00, balanceBonus: 500.00, balanceReferral: 2000.00, balanceRewards: 300.00,
    totalEarnings: 12000.00, todayEarnings: 500.00, xp: 1200, level: 4, tasksCompleted: 45,
    referralCount: 200, referralCode: 'JEAN00', streak: 1, badges: [],
    riskScore: 85, status: 'suspended', createdAt: '2024-11-01T10:00:00Z', lastActive: '2024-12-19T23:45:00Z',
    ip: '10.0.0.1', deviceHash: 'def456', withdrawalBlocked: true, verificationStatus: 'none',
    dailyWithdrawn: 0, dailyTasksCompleted: 0
  },
  {
    id: '5', telegramId: 777888999, username: 'sophie_earn', firstName: 'Sophie', lastName: 'Bernard',
    balanceMain: 55.20, balanceBonus: 10.00, balanceReferral: 5.00, balanceRewards: 2.00,
    totalEarnings: 120.20, todayEarnings: 3.50, xp: 800, level: 3, tasksCompleted: 28,
    referralCount: 4, referralCode: 'SOPH99', streak: 2, badges: [],
    riskScore: 8, status: 'active', createdAt: '2024-06-15T14:00:00Z', lastActive: '2024-12-20T10:00:00Z',
    ip: '192.168.2.1', deviceHash: 'jkl012', withdrawalBlocked: false, verificationStatus: 'none',
    dailyWithdrawn: 10, dailyTasksCompleted: 2
  },
];

const mockTasks: Task[] = [
  { id: '1', type: 'join_channel', title: 'Rejoindre CryptoNews FR', description: 'Rejoignez notre canal d\'actualités crypto', reward: 0.50, rewardType: 'main', targetUrl: 'https://t.me/cryptonews_fr', targetId: '-1001234567890', isActive: true, totalCompletions: 1250, createdAt: '2024-01-01T00:00:00Z', verificationMethod: 'auto', priority: 1, icon: '📢' },
  { id: '2', type: 'join_group', title: 'Rejoindre Discussion Crypto', description: 'Participez au groupe de discussion', reward: 0.30, rewardType: 'main', targetUrl: 'https://t.me/crypto_discuss', targetId: '-1009876543210', isActive: true, totalCompletions: 890, createdAt: '2024-01-15T00:00:00Z', verificationMethod: 'auto', priority: 2, icon: '👥' },
  { id: '3', type: 'start_bot', title: 'Démarrer Trading Bot', description: 'Lancez notre bot de trading automatique', reward: 1.00, rewardType: 'main', targetUrl: 'https://t.me/trading_bot', targetId: 'trading_bot', isActive: true, totalCompletions: 456, createdAt: '2024-02-01T00:00:00Z', verificationMethod: 'api', priority: 3, icon: '🤖' },
  { id: '4', type: 'invite_friends', title: 'Inviter 5 amis', description: 'Invitez 5 amis pour gagner un bonus', reward: 5.00, rewardType: 'main', requiredCount: 5, isActive: true, totalCompletions: 123, createdAt: '2024-03-01T00:00:00Z', verificationMethod: 'auto', priority: 4, icon: '👥' },
  { id: '5', type: 'daily', title: 'Mission Quotidienne', description: 'Connectez-vous chaque jour pour gagner', reward: 0.10, rewardType: 'main', cooldownHours: 24, isActive: true, totalCompletions: 8900, createdAt: '2024-01-01T00:00:00Z', verificationMethod: 'auto', priority: 0, maxPerUser: 1, icon: '📅' },
  { id: '6', type: 'special', title: 'Événement Nouvel An', description: 'Mission spéciale de fin d\'année', reward: 10.00, rewardType: 'bonus', isActive: true, totalCompletions: 45, maxCompletions: 100, expiresAt: '2025-01-01T00:00:00Z', createdAt: '2024-12-15T00:00:00Z', verificationMethod: 'manual', priority: 10, requiredLevel: 5, icon: '🎉' },
];

const mockTransactions: Transaction[] = [
  { id: '1', orderId: 'ORD001', userId: '1', type: 'deposit', amount: 50.00, currency: 'USDT', network: 'TRC20', status: 'completed', txHash: '0xabc123...def456', address: 'TKx...9Pz', confirmations: 20, requiredConfirmations: 20, createdAt: '2024-12-18T10:00:00Z', completedAt: '2024-12-18T10:15:00Z' },
  { id: '2', orderId: 'ORD002', userId: '1', type: 'withdrawal', amount: 25.00, currency: 'USDT', network: 'TRC20', status: 'completed', txHash: '0xdef456...ghi789', address: 'TYx...3Kz', fee: 1.00, createdAt: '2024-12-19T14:00:00Z', completedAt: '2024-12-19T14:30:00Z' },
  { id: '3', orderId: 'ORD003', userId: '2', type: 'deposit', amount: 100.00, currency: 'TON', network: 'TON', status: 'confirming', confirmations: 3, requiredConfirmations: 12, createdAt: '2024-12-20T08:00:00Z' },
  { id: '4', orderId: 'ORD004', userId: '3', type: 'withdrawal', amount: 200.00, currency: 'USDT', network: 'BEP20', status: 'pending', address: '0x742...f89', createdAt: '2024-12-20T09:00:00Z' },
  { id: '5', orderId: 'ORD005', userId: '1', type: 'reward', amount: 0.50, currency: 'USDT', status: 'completed', createdAt: '2024-12-20T11:00:00Z', completedAt: '2024-12-20T11:00:00Z' },
  { id: '6', orderId: 'ORD006', userId: '4', type: 'withdrawal', amount: 1500.00, currency: 'USDT', network: 'TRC20', status: 'review', address: 'TZx...7Mz', createdAt: '2024-12-20T12:00:00Z', adminNote: 'Montant élevé - vérification requise' },
  { id: '7', orderId: 'ORD007', userId: '5', type: 'deposit', amount: 20.00, currency: 'TON', network: 'TON', status: 'completed', txHash: '0xjkl012...mno345', confirmations: 12, requiredConfirmations: 12, createdAt: '2024-12-19T16:00:00Z', completedAt: '2024-12-19T16:20:00Z' },
];

const mockCampaigns: Campaign[] = [
  { id: '1', advertiserId: 'adv1', advertiserName: 'CryptoExchange Pro', type: 'channel', targetUrl: 'https://t.me/crypto_exchange', targetName: 'CryptoExchange Channel', budget: 500, spent: 125, rewardPerAction: 0.50, totalActions: 250, maxActions: 1000, status: 'active', startDate: '2024-12-01', endDate: '2024-12-31', createdAt: '2024-11-28T00:00:00Z', requireVerification: true, minUserLevel: 3 },
  { id: '2', advertiserId: 'adv2', advertiserName: 'DeFi Labs', type: 'bot', targetUrl: 'https://t.me/defi_bot', targetName: 'DeFi Trading Bot', budget: 1000, spent: 780, rewardPerAction: 1.00, totalActions: 780, maxActions: 1000, status: 'active', startDate: '2024-12-10', endDate: '2025-01-10', createdAt: '2024-12-08T00:00:00Z', requireVerification: false },
  { id: '3', advertiserId: 'adv3', advertiserName: 'NFT World', type: 'group', targetUrl: 'https://t.me/nft_world', targetName: 'NFT Discussion Group', budget: 300, spent: 300, rewardPerAction: 0.30, totalActions: 1000, maxActions: 1000, status: 'completed', startDate: '2024-11-01', endDate: '2024-11-30', createdAt: '2024-10-28T00:00:00Z', requireVerification: true },
];

const mockChannels: Channel[] = [
  { id: '1', telegramId: '-1001234567890', name: 'TonCipher Officiel', username: 'toncipherofficial', type: 'channel', memberCount: 15420, isMandatory: true, isActive: true, botIsAdmin: true, verificationEnabled: true, joinReward: 0.10, priority: 1 },
  { id: '2', telegramId: '-1009876543210', name: 'TonCipher Discussion', username: 'toncipher_discuss', type: 'group', memberCount: 8350, isMandatory: true, isActive: true, botIsAdmin: true, verificationEnabled: true, joinReward: 0.05, priority: 2 },
  { id: '3', telegramId: '-1005555555555', name: 'TonCipher News', username: 'toncipher_news', type: 'channel', memberCount: 3200, isMandatory: false, isActive: true, botIsAdmin: true, verificationEnabled: false, priority: 3 },
  { id: '4', telegramId: '-1006666666666', name: 'TonCipher VIP', username: 'toncipher_vip', type: 'group', memberCount: 450, isMandatory: false, isActive: false, botIsAdmin: false, verificationEnabled: false, priority: 4 },
];

const mockShopItems: ShopItem[] = [
  { id: '1', name: 'Double XP (24h)', description: 'Multipliez vos gains d\'XP par 2 pendant 24 heures', price: 5.00, currency: 'main', type: 'multiplier', value: 2, duration: 24, isActive: true, purchases: 234, icon: '⚡', category: 'boosters' },
  { id: '2', name: 'Pack Bonus 50', description: 'Recevez 50 crédits bonus instantanément', price: 10.00, currency: 'main', type: 'bonus_pack', value: 50, isActive: true, purchases: 567, icon: '🎁', category: 'packs' },
  { id: '3', name: 'Triple Récompenses (12h)', description: 'Triplez vos récompenses de tâches', price: 15.00, currency: 'main', type: 'multiplier', value: 3, duration: 12, isActive: true, purchases: 89, icon: '🚀', category: 'boosters' },
  { id: '4', name: 'Statut Premium (7j)', description: 'Accédez aux tâches premium pendant 7 jours', price: 25.00, currency: 'main', type: 'premium', value: 1, duration: 168, isActive: true, purchases: 45, icon: '👑', category: 'premium' },
  { id: '5', name: 'Badge Exclusif', description: 'Obtenez un badge rare pour votre profil', price: 100.00, currency: 'bonus', type: 'badge', value: 1, isActive: true, purchases: 12, maxPurchases: 50, icon: '💎', category: 'collectibles' },
];

const mockNotifications: Notification[] = [
  { id: '1', userId: '1', type: 'deposit', title: 'Dépôt confirmé', message: 'Votre dépôt de 50 USDT a été crédité', isRead: true, createdAt: '2024-12-18T10:15:00Z' },
  { id: '2', userId: '1', type: 'reward', title: 'Récompense reçue', message: 'Vous avez gagné 0.50 USDT pour une tâche', isRead: false, createdAt: '2024-12-20T11:00:00Z' },
  { id: '3', type: 'alert', title: 'Activité suspecte détectée', message: 'L\'utilisateur suspicious_user a un score de risque élevé', isRead: false, createdAt: '2024-12-20T12:00:00Z' },
  { id: '4', type: 'system', title: 'Nouvelle campagne', message: 'DeFi Labs a créé une nouvelle campagne', isRead: false, createdAt: '2024-12-20T08:00:00Z' },
  { id: '5', userId: '2', type: 'level', title: 'Niveau supérieur!', message: 'Félicitations! Vous êtes passé au niveau 7', isRead: false, createdAt: '2024-12-19T15:00:00Z' },
];

const mockFraudAlerts: FraudAlert[] = [
  { id: '1', userId: '4', username: 'suspicious_user', type: 'multi_account', severity: 'critical', description: 'Même device hash et IP que mariecoin - probable multi-compte', action: 'suspended', riskScore: 85, createdAt: '2024-12-19T23:45:00Z', evidence: ['device_hash: def456', 'ip: 10.0.0.1'] },
  { id: '2', userId: '4', username: 'suspicious_user', type: 'fake_referral', severity: 'high', description: '200 filleuls en 50 jours avec très peu de tâches - pattern anormal', action: 'review', riskScore: 85, createdAt: '2024-12-18T14:00:00Z' },
  { id: '3', userId: '2', username: 'mariecoin', type: 'vpn', severity: 'medium', description: 'Connexion détectée depuis un VPN connu', action: 'review', riskScore: 12, createdAt: '2024-12-20T12:15:00Z' },
  { id: '4', userId: '5', username: 'sophie_earn', type: 'task_abuse', severity: 'low', description: 'Tentative de double complétion de tâche détectée et bloquée', action: 'none', riskScore: 8, createdAt: '2024-12-20T10:30:00Z' },
];

const mockCryptoNetworks: CryptoNetwork[] = [
  { id: '1', name: 'Toncoin', symbol: 'TON', network: 'TON', isActive: true, isDepositEnabled: true, isWithdrawalEnabled: true, minDeposit: 1, maxDeposit: 10000, minWithdrawal: 5, maxWithdrawal: 5000, withdrawalFee: 0.5, withdrawalFeeType: 'fixed', requiredConfirmations: 12, dailyWithdrawalLimit: 10000, autoWithdrawal: true, autoWithdrawalThreshold: 100, hotWalletBalance: 15420.50, coldWalletBalance: 85000.00, hotWalletAddress: 'EQC...hot', coldWalletAddress: 'EQC...cold', explorerUrl: 'https://tonscan.org/tx/', decimals: 9, priority: 1 },
  { id: '2', name: 'Tether TRC20', symbol: 'USDT', network: 'TRC20', isActive: true, isDepositEnabled: true, isWithdrawalEnabled: true, minDeposit: 5, maxDeposit: 50000, minWithdrawal: 10, maxWithdrawal: 25000, withdrawalFee: 1.0, withdrawalFeeType: 'fixed', requiredConfirmations: 20, dailyWithdrawalLimit: 50000, autoWithdrawal: true, autoWithdrawalThreshold: 500, hotWalletBalance: 45230.00, coldWalletBalance: 250000.00, hotWalletAddress: 'TKx...hot', coldWalletAddress: 'TKx...cold', explorerUrl: 'https://tronscan.org/#/transaction/', decimals: 6, priority: 2 },
  { id: '3', name: 'Tether BEP20', symbol: 'USDT', network: 'BEP20', isActive: true, isDepositEnabled: true, isWithdrawalEnabled: false, minDeposit: 5, maxDeposit: 50000, minWithdrawal: 10, maxWithdrawal: 25000, withdrawalFee: 0.5, withdrawalFeeType: 'fixed', requiredConfirmations: 15, dailyWithdrawalLimit: 50000, autoWithdrawal: false, autoWithdrawalThreshold: 500, hotWalletBalance: 28500.00, coldWalletBalance: 150000.00, hotWalletAddress: '0x7...hot', coldWalletAddress: '0x7...cold', explorerUrl: 'https://bscscan.com/tx/', decimals: 18, contractAddress: '0x55d398326f99059ff775485246999027b3197955', priority: 3 },
];

const mockLevelConfigs: LevelConfig[] = [
  { level: 1, xpRequired: 0, title: 'Débutant', color: '#94a3b8', reward: 0, rewardType: 'main', unlocks: [] },
  { level: 2, xpRequired: 100, title: 'Novice', color: '#94a3b8', reward: 0.50, rewardType: 'main', unlocks: ['daily_task'] },
  { level: 3, xpRequired: 300, title: 'Apprenti', color: '#22c55e', reward: 1.00, rewardType: 'main', unlocks: ['referral'] },
  { level: 5, xpRequired: 800, title: 'Explorateur', color: '#22c55e', reward: 2.00, rewardType: 'main', unlocks: ['special_tasks'] },
  { level: 10, xpRequired: 2500, title: 'Avancé', color: '#3b82f6', reward: 5.00, rewardType: 'main', unlocks: ['premium_tasks'], badge: 'level_10' },
  { level: 15, xpRequired: 5000, title: 'Expert', color: '#8b5cf6', reward: 10.00, rewardType: 'main', unlocks: ['vip_tasks'], badge: 'level_15' },
  { level: 20, xpRequired: 10000, title: 'Maître', color: '#f59e0b', reward: 25.00, rewardType: 'main', unlocks: ['master_badge'], badge: 'level_20' },
  { level: 25, xpRequired: 20000, title: 'Légende', color: '#ef4444', reward: 50.00, rewardType: 'main', unlocks: ['legend_badge'], badge: 'level_25' },
];

const mockBadgeConfigs: BadgeConfig[] = [
  { id: '1', name: 'Early Adopter', description: 'Inscrit dans les 100 premiers', icon: '🌟', condition: 'first_100_users', conditionType: 'special', conditionValue: 100, reward: 5.00, isActive: true },
  { id: '2', name: 'Task Master', description: '100+ tâches complétées', icon: '🎯', condition: 'tasks_completed', conditionType: 'tasks', conditionValue: 100, reward: 10.00, isActive: true },
  { id: '3', name: 'Referral King', description: '20+ filleuls actifs', icon: '👑', condition: 'referral_count', conditionType: 'referrals', conditionValue: 20, reward: 15.00, isActive: true },
  { id: '4', name: 'Whale', description: '1000$+ de dépôts totaux', icon: '🐋', condition: 'total_deposits', conditionType: 'deposit', conditionValue: 1000, reward: 25.00, isActive: true },
  { id: '5', name: 'Streak Champion', description: '14+ jours consécutifs', icon: '🔥', condition: 'streak_days', conditionType: 'streak', conditionValue: 14, reward: 20.00, isActive: true },
];

const mockReferralConfigs: ReferralConfig[] = [
  { level: 1, percentage: 10, bonusType: 'signup', isActive: true },
  { level: 1, percentage: 5, bonusType: 'activity', isActive: true },
  { level: 1, percentage: 5, bonusType: 'deposit', isActive: true },
  { level: 2, percentage: 5, bonusType: 'signup', isActive: true },
  { level: 2, percentage: 2, bonusType: 'activity', isActive: true },
  { level: 3, percentage: 2, bonusType: 'signup', isActive: true },
];

const mockAntiFraudRules: AntiFraudRule[] = [
  { id: '1', name: 'IP Duplicate Detection', type: 'ip_duplicate', isActive: true, threshold: 3, action: 'flag', severity: 'medium', description: 'Détecte plusieurs comptes avec la même IP' },
  { id: '2', name: 'Device Fingerprint Check', type: 'device_duplicate', isActive: true, threshold: 2, action: 'suspend', severity: 'high', description: 'Détecte plusieurs comptes avec le même appareil' },
  { id: '3', name: 'VPN/Proxy Detection', type: 'vpn', isActive: true, threshold: 1, action: 'flag', severity: 'medium', description: 'Détecte les connexions VPN ou proxy' },
  { id: '4', name: 'Referral Abuse', type: 'referral_abuse', isActive: true, threshold: 50, action: 'review', severity: 'high', description: 'Trop de filleuls en peu de temps' },
  { id: '5', name: 'Bot Behavior', type: 'behavior', isActive: true, threshold: 90, action: 'ban', severity: 'critical', description: 'Comportement automatisé détecté' },
  { id: '6', name: 'Withdrawal Pattern', type: 'withdrawal_pattern', isActive: true, threshold: 5, action: 'block_withdrawal', severity: 'high', description: 'Pattern de retrait suspect' },
];

const mockMessageTemplates: MessageTemplate[] = [
  { id: '1', key: 'welcome', name: 'Message de bienvenue', category: 'welcome', content: '👋 Bienvenue sur TonCipher, {firstName}!\n\n🎁 Votre bonus de bienvenue: {welcomeBonus}$\n\n📱 Commencez à gagner maintenant!', variables: ['firstName', 'welcomeBonus'], isActive: true },
  { id: '2', key: 'deposit_confirmed', name: 'Dépôt confirmé', category: 'payment', content: '✅ Dépôt confirmé!\n\n💰 Montant: {amount} {currency}\n🔗 TX: {txHash}\n\nVotre nouveau solde: {newBalance}$', variables: ['amount', 'currency', 'txHash', 'newBalance'], isActive: true },
  { id: '3', key: 'withdrawal_sent', name: 'Retrait envoyé', category: 'payment', content: '📤 Retrait envoyé!\n\n💰 Montant: {amount} {currency}\n📍 Adresse: {address}\n🔗 TX: {txHash}', variables: ['amount', 'currency', 'address', 'txHash'], isActive: true },
  { id: '4', key: 'task_completed', name: 'Tâche complétée', category: 'task', content: '✅ Tâche complétée!\n\n📋 {taskName}\n💰 Récompense: +{reward}$\n⭐ XP: +{xp}', variables: ['taskName', 'reward', 'xp'], isActive: true },
  { id: '5', key: 'level_up', name: 'Niveau supérieur', category: 'level', content: '🎉 Félicitations {firstName}!\n\n⬆️ Vous êtes passé au niveau {level}!\n🏆 Titre: {levelTitle}\n💰 Bonus: +{reward}$', variables: ['firstName', 'level', 'levelTitle', 'reward'], isActive: true },
  { id: '6', key: 'referral_bonus', name: 'Bonus parrainage', category: 'referral', content: '👥 Nouveau filleul!\n\n{referralName} s\'est inscrit avec votre code!\n💰 Bonus: +{bonus}$', variables: ['referralName', 'bonus'], isActive: true },
];

const mockBotCommands: BotCommand[] = [
  { id: '1', command: '/start', description: 'Démarrer le bot', response: '', isActive: true, requiresAdmin: false, category: 'general' },
  { id: '2', command: '/help', description: 'Afficher l\'aide', response: '📚 Commandes disponibles:\n\n/wallet - Voir votre solde\n/tasks - Voir les tâches\n/referral - Votre lien de parrainage\n/withdraw - Faire un retrait', isActive: true, requiresAdmin: false, category: 'general' },
  { id: '3', command: '/wallet', description: 'Voir le solde', response: '', isActive: true, requiresAdmin: false, category: 'wallet' },
  { id: '4', command: '/tasks', description: 'Voir les tâches', response: '', isActive: true, requiresAdmin: false, category: 'tasks' },
  { id: '5', command: '/referral', description: 'Lien de parrainage', response: '', isActive: true, requiresAdmin: false, category: 'referral' },
  { id: '6', command: '/withdraw', description: 'Faire un retrait', response: '', isActive: true, requiresAdmin: false, category: 'wallet' },
  { id: '7', command: '/admin', description: 'Menu admin', response: '', isActive: true, requiresAdmin: true, category: 'admin' },
  { id: '8', command: '/broadcast', description: 'Envoyer un message à tous', response: '', isActive: true, requiresAdmin: true, category: 'admin' },
];

const mockWelcomeSteps: WelcomeStep[] = [
  { id: '1', order: 1, type: 'message', content: 'Bienvenue sur TonCipher! 🚀', isRequired: true, isActive: true },
  { id: '2', order: 2, type: 'mandatory_join', content: 'Rejoignez nos canaux obligatoires pour continuer', isRequired: true, isActive: true },
  { id: '3', order: 3, type: 'referral_check', content: 'Avez-vous un code de parrainage?', isRequired: false, isActive: true },
  { id: '4', order: 4, type: 'wallet_create', content: 'Création de votre portefeuille...', isRequired: true, isActive: true },
  { id: '5', order: 5, type: 'bonus', content: 'Voici votre bonus de bienvenue!', isRequired: false, isActive: true, bonus: 1.00 },
];

const mockWithdrawalRules: WithdrawalRule[] = [
  { id: '1', name: 'Minimum de tâches', condition: 'min_tasks', value: 10, isActive: true, errorMessage: 'Vous devez compléter au moins 10 tâches avant de retirer' },
  { id: '2', name: 'Niveau minimum', condition: 'min_level', value: 3, isActive: true, errorMessage: 'Vous devez être au moins niveau 3 pour retirer' },
  { id: '3', name: 'Âge du compte', condition: 'account_age', value: 7, isActive: true, errorMessage: 'Votre compte doit avoir au moins 7 jours' },
  { id: '4', name: 'Vérification requise', condition: 'verification', value: 500, isActive: true, errorMessage: 'Vérification requise pour les retraits supérieurs à 500$' },
  { id: '5', name: 'Pas de fraude', condition: 'no_fraud', value: 50, isActive: true, errorMessage: 'Votre score de risque est trop élevé' },
];

const mockDailyLimits: DailyLimit[] = [
  { id: '1', type: 'withdrawal', limit: 1000, perUser: true, resetTime: '00:00', isActive: true },
  { id: '2', type: 'deposit', limit: 10000, perUser: true, resetTime: '00:00', isActive: true },
  { id: '3', type: 'tasks', limit: 50, perUser: true, resetTime: '00:00', isActive: true },
  { id: '4', type: 'referral_bonus', limit: 100, perUser: true, resetTime: '00:00', isActive: true },
];

const mockPaymentProviders: PaymentProvider[] = [
  { id: '1', name: 'NOWPayments', type: 'nowpayments', apiKey: 'xxx-xxx-xxx', isActive: true, supportedNetworks: ['TON', 'TRC20', 'BEP20'], testMode: false },
  { id: '2', name: 'Binance Pay', type: 'binance', apiKey: 'xxx-xxx-xxx', apiSecret: 'xxx', isActive: false, supportedNetworks: ['BEP20'], testMode: true },
];

const mockAdminUsers: AdminUser[] = [
  { id: '1', telegramId: 123456789, username: 'super_admin', role: 'super_admin', permissions: ['*'], isActive: true, createdAt: '2024-01-01T00:00:00Z', lastLogin: '2024-12-20T10:00:00Z' },
  { id: '2', telegramId: 111222333, username: 'admin_user', role: 'admin', permissions: ['users', 'tasks', 'campaigns', 'withdrawals'], isActive: true, createdAt: '2024-02-01T00:00:00Z', lastLogin: '2024-12-20T09:00:00Z' },
  { id: '3', telegramId: 444555666, username: 'moderator', role: 'moderator', permissions: ['users', 'tasks'], isActive: true, createdAt: '2024-03-01T00:00:00Z' },
];

const mockPlatformConfig: PlatformConfig = {
  botToken: '7234567890:AAH...masked',
  botUsername: 'toncipherbot',
  apiId: '12345678',
  apiHash: 'a1b2c3d4e5f6...masked',
  databaseUrl: 'postgresql://...masked',
  mainChannel: '@toncipherofficial',
  mainGroup: '@teletask_discuss',
  supportBot: '@teletask_support',
  announcementChannel: '@teletask_news',
  mainWallet: 'EQC...main_wallet',
  hotWalletThreshold: 10000,
  coldWalletThreshold: 100000,
  referralBonusSignup: 1.00,
  referralBonusActivity: 0.10,
  referralBonusDeposit: 5.00,
  referralBonusDepositPercent: 5,
  referralLevels: 3,
  referralCodeLength: 8,
  referralLinkPrefix: 'https://t.me/toncipherbot?start=',
  xpPerTask: 10,
  xpPerReferral: 50,
  xpPerDeposit: 5,
  xpMultiplier: 1.0,
  maxLevel: 50,
  streakBonusPerDay: 0.05,
  streakMultiplier: 1.1,
  maxStreakBonus: 5.00,
  streakResetHours: 48,
  antifraudEnabled: true,
  vpnDetectionEnabled: true,
  deviceFingerprintEnabled: true,
  maxAccountsPerDevice: 1,
  maxAccountsPerIP: 3,
  suspiciousActivityThreshold: 50,
  autobanThreshold: 90,
  autoWithdrawalEnabled: true,
  autoWithdrawalMaxAmount: 500,
  withdrawalReviewThreshold: 1000,
  minWithdrawalInterval: 24,
  requireVerificationAbove: 500,
  taskVerificationTimeout: 30,
  taskCooldownGlobal: 5,
  maxDailyTasks: 50,
  bonusTaskMultiplier: 1.5,
  depositBonusPercent: 5,
  firstDepositBonus: 10,
  minDepositForBonus: 50,
  maintenanceMode: false,
  maintenanceMessage: 'Le bot est en maintenance. Veuillez réessayer plus tard.',
  registrationEnabled: true,
  welcomeBonusEnabled: true,
  welcomeBonusAmount: 1.00,
  adminNotifyDeposit: true,
  adminNotifyWithdrawal: true,
  adminNotifyFraud: true,
  adminNotifyNewUser: true,
  adminChatId: '-1001234567890',
  globalDailyWithdrawalLimit: 50000,
  globalDailyDepositLimit: 100000,
  maxPendingWithdrawals: 100,
};

const mockStats: PlatformStats = {
  totalUsers: 15420,
  activeUsers: 3250,
  newUsersToday: 127,
  totalDeposits: 456789.50,
  totalWithdrawals: 312456.80,
  platformRevenue: 45678.90,
  activeCampaigns: 5,
  totalRewardsDistributed: 89234.50,
  totalTasks: 45,
  completedTasksToday: 2340,
  totalReferrals: 4567,
  fraudAlertsToday: 3,
  pendingWithdrawals: 12,
  pendingDeposits: 3,
};

const mockLogs: LogEntry[] = [
  { id: '1', type: 'info', category: 'auth', message: 'User alexcrypto logged in', userId: '1', createdAt: '2024-12-20T14:30:00Z' },
  { id: '2', type: 'warning', category: 'antifraud', message: 'VPN connection detected for mariecoin', userId: '2', createdAt: '2024-12-20T12:15:00Z' },
  { id: '3', type: 'error', category: 'payment', message: 'Withdrawal processing failed - retrying (attempt 2/3)', userId: '3', createdAt: '2024-12-20T09:05:00Z' },
  { id: '4', type: 'security', category: 'antifraud', message: 'User suspicious_user suspended - multi-account detected', userId: '4', createdAt: '2024-12-19T23:45:00Z' },
  { id: '5', type: 'financial', category: 'payment', message: 'Deposit of 50 USDT confirmed for alexcrypto', userId: '1', createdAt: '2024-12-18T10:15:00Z' },
  { id: '6', type: 'admin', category: 'config', message: 'Platform config updated by super_admin', adminId: '1', createdAt: '2024-12-20T10:00:00Z' },
];

// ===================== STORE =====================

interface AppState {
  // View
  currentView: 'miniapp' | 'admin';
  miniAppPage: string;
  adminPage: string;
  adminSidebarOpen: boolean;

  // Modal State
  modalOpen: string | null;
  modalData: Record<string, unknown> | null;

  // Data
  currentUser: User;
  users: User[];
  tasks: Task[];
  transactions: Transaction[];
  campaigns: Campaign[];
  channels: Channel[];
  shopItems: ShopItem[];
  notifications: Notification[];
  fraudAlerts: FraudAlert[];
  cryptoNetworks: CryptoNetwork[];
  levelConfigs: LevelConfig[];
  badgeConfigs: BadgeConfig[];
  referralConfigs: ReferralConfig[];
  antiFraudRules: AntiFraudRule[];
  messageTemplates: MessageTemplate[];
  botCommands: BotCommand[];
  welcomeSteps: WelcomeStep[];
  withdrawalRules: WithdrawalRule[];
  dailyLimits: DailyLimit[];
  paymentProviders: PaymentProvider[];
  adminUsers: AdminUser[];
  platformConfig: PlatformConfig;
  platformStats: PlatformStats;
  logs: LogEntry[];

  // Actions - View
  setCurrentView: (view: 'miniapp' | 'admin') => void;
  setMiniAppPage: (page: string) => void;
  setAdminPage: (page: string) => void;
  toggleAdminSidebar: () => void;
  openModal: (modal: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Actions - CRUD
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;

  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'totalCompletions'>) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;

  addCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt' | 'spent' | 'totalActions'>) => void;
  updateCampaign: (id: string, data: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;

  addChannel: (channel: Omit<Channel, 'id'>) => void;
  updateChannel: (id: string, data: Partial<Channel>) => void;
  deleteChannel: (id: string) => void;

  addShopItem: (item: Omit<ShopItem, 'id' | 'purchases'>) => void;
  updateShopItem: (id: string, data: Partial<ShopItem>) => void;
  deleteShopItem: (id: string) => void;

  addCryptoNetwork: (network: Omit<CryptoNetwork, 'id'>) => void;
  updateCryptoNetwork: (id: string, data: Partial<CryptoNetwork>) => void;
  deleteCryptoNetwork: (id: string) => void;

  addLevelConfig: (level: LevelConfig) => void;
  updateLevelConfig: (level: number, data: Partial<LevelConfig>) => void;
  deleteLevelConfig: (level: number) => void;

  addBadgeConfig: (badge: Omit<BadgeConfig, 'id'>) => void;
  updateBadgeConfig: (id: string, data: Partial<BadgeConfig>) => void;
  deleteBadgeConfig: (id: string) => void;

  updateReferralConfig: (level: number, bonusType: string, data: Partial<ReferralConfig>) => void;
  addReferralConfig: (config: ReferralConfig) => void;

  addAntiFraudRule: (rule: Omit<AntiFraudRule, 'id'>) => void;
  updateAntiFraudRule: (id: string, data: Partial<AntiFraudRule>) => void;
  deleteAntiFraudRule: (id: string) => void;

  addMessageTemplate: (template: Omit<MessageTemplate, 'id'>) => void;
  updateMessageTemplate: (id: string, data: Partial<MessageTemplate>) => void;
  deleteMessageTemplate: (id: string) => void;

  addBotCommand: (command: Omit<BotCommand, 'id'>) => void;
  updateBotCommand: (id: string, data: Partial<BotCommand>) => void;
  deleteBotCommand: (id: string) => void;

  addWelcomeStep: (step: Omit<WelcomeStep, 'id'>) => void;
  updateWelcomeStep: (id: string, data: Partial<WelcomeStep>) => void;
  deleteWelcomeStep: (id: string) => void;

  addWithdrawalRule: (rule: Omit<WithdrawalRule, 'id'>) => void;
  updateWithdrawalRule: (id: string, data: Partial<WithdrawalRule>) => void;
  deleteWithdrawalRule: (id: string) => void;

  updateDailyLimit: (id: string, data: Partial<DailyLimit>) => void;

  addPaymentProvider: (provider: Omit<PaymentProvider, 'id'>) => void;
  updatePaymentProvider: (id: string, data: Partial<PaymentProvider>) => void;
  deletePaymentProvider: (id: string) => void;

  addAdminUser: (admin: Omit<AdminUser, 'id' | 'createdAt'>) => void;
  updateAdminUser: (id: string, data: Partial<AdminUser>) => void;
  deleteAdminUser: (id: string) => void;

  updateFraudAlert: (id: string, data: Partial<FraudAlert>) => void;
  markNotificationRead: (id: string) => void;
  addNotification: (n: Omit<Notification, 'id' | 'createdAt'>) => void;
  updatePlatformConfig: (data: Partial<PlatformConfig>) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'createdAt'>) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useAppStore = create<AppState>((set) => ({
  currentView: 'miniapp',
  miniAppPage: 'dashboard',
  adminPage: 'overview',
  adminSidebarOpen: false,
  modalOpen: null,
  modalData: null,

  currentUser: mockUsers[0],
  users: mockUsers,
  tasks: mockTasks,
  transactions: mockTransactions,
  campaigns: mockCampaigns,
  channels: mockChannels,
  shopItems: mockShopItems,
  notifications: mockNotifications,
  fraudAlerts: mockFraudAlerts,
  cryptoNetworks: mockCryptoNetworks,
  levelConfigs: mockLevelConfigs,
  badgeConfigs: mockBadgeConfigs,
  referralConfigs: mockReferralConfigs,
  antiFraudRules: mockAntiFraudRules,
  messageTemplates: mockMessageTemplates,
  botCommands: mockBotCommands,
  welcomeSteps: mockWelcomeSteps,
  withdrawalRules: mockWithdrawalRules,
  dailyLimits: mockDailyLimits,
  paymentProviders: mockPaymentProviders,
  adminUsers: mockAdminUsers,
  platformConfig: mockPlatformConfig,
  platformStats: mockStats,
  logs: mockLogs,

  // View Actions
  setCurrentView: (view) => set({ currentView: view }),
  setMiniAppPage: (page) => set({ miniAppPage: page }),
  setAdminPage: (page) => set({ adminPage: page }),
  toggleAdminSidebar: () => set((s) => ({ adminSidebarOpen: !s.adminSidebarOpen })),
  openModal: (modal, data) => set({ modalOpen: modal, modalData: data || null }),
  closeModal: () => set({ modalOpen: null, modalData: null }),

  // User CRUD
  addUser: (user) => set((s) => ({ users: [...s.users, { ...user, id: generateId() }] })),
  updateUser: (id, data) => set((s) => ({ users: s.users.map(u => u.id === id ? { ...u, ...data } : u) })),
  deleteUser: (id) => set((s) => ({ users: s.users.filter(u => u.id !== id) })),

  // Task CRUD
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, { ...task, id: generateId(), createdAt: new Date().toISOString(), totalCompletions: 0 }] })),
  updateTask: (id, data) => set((s) => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...data } : t) })),
  deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter(t => t.id !== id) })),

  // Transaction CRUD
  addTransaction: (tx) => set((s) => ({ transactions: [{ ...tx, id: generateId(), createdAt: new Date().toISOString() }, ...s.transactions] })),
  updateTransaction: (id, data) => set((s) => ({ transactions: s.transactions.map(t => t.id === id ? { ...t, ...data } : t) })),

  // Campaign CRUD
  addCampaign: (campaign) => set((s) => ({ campaigns: [...s.campaigns, { ...campaign, id: generateId(), createdAt: new Date().toISOString(), spent: 0, totalActions: 0 }] })),
  updateCampaign: (id, data) => set((s) => ({ campaigns: s.campaigns.map(c => c.id === id ? { ...c, ...data } : c) })),
  deleteCampaign: (id) => set((s) => ({ campaigns: s.campaigns.filter(c => c.id !== id) })),

  // Channel CRUD
  addChannel: (channel) => set((s) => ({ channels: [...s.channels, { ...channel, id: generateId() }] })),
  updateChannel: (id, data) => set((s) => ({ channels: s.channels.map(c => c.id === id ? { ...c, ...data } : c) })),
  deleteChannel: (id) => set((s) => ({ channels: s.channels.filter(c => c.id !== id) })),

  // Shop Item CRUD
  addShopItem: (item) => set((s) => ({ shopItems: [...s.shopItems, { ...item, id: generateId(), purchases: 0 }] })),
  updateShopItem: (id, data) => set((s) => ({ shopItems: s.shopItems.map(i => i.id === id ? { ...i, ...data } : i) })),
  deleteShopItem: (id) => set((s) => ({ shopItems: s.shopItems.filter(i => i.id !== id) })),

  // Crypto Network CRUD
  addCryptoNetwork: (network) => set((s) => ({ cryptoNetworks: [...s.cryptoNetworks, { ...network, id: generateId() }] })),
  updateCryptoNetwork: (id, data) => set((s) => ({ cryptoNetworks: s.cryptoNetworks.map(n => n.id === id ? { ...n, ...data } : n) })),
  deleteCryptoNetwork: (id) => set((s) => ({ cryptoNetworks: s.cryptoNetworks.filter(n => n.id !== id) })),

  // Level Config CRUD
  addLevelConfig: (level) => set((s) => ({ levelConfigs: [...s.levelConfigs, level].sort((a, b) => a.level - b.level) })),
  updateLevelConfig: (level, data) => set((s) => ({ levelConfigs: s.levelConfigs.map(l => l.level === level ? { ...l, ...data } : l) })),
  deleteLevelConfig: (level) => set((s) => ({ levelConfigs: s.levelConfigs.filter(l => l.level !== level) })),

  // Badge Config CRUD
  addBadgeConfig: (badge) => set((s) => ({ badgeConfigs: [...s.badgeConfigs, { ...badge, id: generateId() }] })),
  updateBadgeConfig: (id, data) => set((s) => ({ badgeConfigs: s.badgeConfigs.map(b => b.id === id ? { ...b, ...data } : b) })),
  deleteBadgeConfig: (id) => set((s) => ({ badgeConfigs: s.badgeConfigs.filter(b => b.id !== id) })),

  // Referral Config
  updateReferralConfig: (level, bonusType, data) => set((s) => ({
    referralConfigs: s.referralConfigs.map(r => r.level === level && r.bonusType === bonusType ? { ...r, ...data } : r)
  })),
  addReferralConfig: (config) => set((s) => ({ referralConfigs: [...s.referralConfigs, config] })),

  // Anti-Fraud Rule CRUD
  addAntiFraudRule: (rule) => set((s) => ({ antiFraudRules: [...s.antiFraudRules, { ...rule, id: generateId() }] })),
  updateAntiFraudRule: (id, data) => set((s) => ({ antiFraudRules: s.antiFraudRules.map(r => r.id === id ? { ...r, ...data } : r) })),
  deleteAntiFraudRule: (id) => set((s) => ({ antiFraudRules: s.antiFraudRules.filter(r => r.id !== id) })),

  // Message Template CRUD
  addMessageTemplate: (template) => set((s) => ({ messageTemplates: [...s.messageTemplates, { ...template, id: generateId() }] })),
  updateMessageTemplate: (id, data) => set((s) => ({ messageTemplates: s.messageTemplates.map(t => t.id === id ? { ...t, ...data } : t) })),
  deleteMessageTemplate: (id) => set((s) => ({ messageTemplates: s.messageTemplates.filter(t => t.id !== id) })),

  // Bot Command CRUD
  addBotCommand: (command) => set((s) => ({ botCommands: [...s.botCommands, { ...command, id: generateId() }] })),
  updateBotCommand: (id, data) => set((s) => ({ botCommands: s.botCommands.map(c => c.id === id ? { ...c, ...data } : c) })),
  deleteBotCommand: (id) => set((s) => ({ botCommands: s.botCommands.filter(c => c.id !== id) })),

  // Welcome Step CRUD
  addWelcomeStep: (step) => set((s) => ({ welcomeSteps: [...s.welcomeSteps, { ...step, id: generateId() }].sort((a, b) => a.order - b.order) })),
  updateWelcomeStep: (id, data) => set((s) => ({ welcomeSteps: s.welcomeSteps.map(st => st.id === id ? { ...st, ...data } : st) })),
  deleteWelcomeStep: (id) => set((s) => ({ welcomeSteps: s.welcomeSteps.filter(st => st.id !== id) })),

  // Withdrawal Rule CRUD
  addWithdrawalRule: (rule) => set((s) => ({ withdrawalRules: [...s.withdrawalRules, { ...rule, id: generateId() }] })),
  updateWithdrawalRule: (id, data) => set((s) => ({ withdrawalRules: s.withdrawalRules.map(r => r.id === id ? { ...r, ...data } : r) })),
  deleteWithdrawalRule: (id) => set((s) => ({ withdrawalRules: s.withdrawalRules.filter(r => r.id !== id) })),

  // Daily Limit
  updateDailyLimit: (id, data) => set((s) => ({ dailyLimits: s.dailyLimits.map(l => l.id === id ? { ...l, ...data } : l) })),

  // Payment Provider CRUD
  addPaymentProvider: (provider) => set((s) => ({ paymentProviders: [...s.paymentProviders, { ...provider, id: generateId() }] })),
  updatePaymentProvider: (id, data) => set((s) => ({ paymentProviders: s.paymentProviders.map(p => p.id === id ? { ...p, ...data } : p) })),
  deletePaymentProvider: (id) => set((s) => ({ paymentProviders: s.paymentProviders.filter(p => p.id !== id) })),

  // Admin User CRUD
  addAdminUser: (admin) => set((s) => ({ adminUsers: [...s.adminUsers, { ...admin, id: generateId(), createdAt: new Date().toISOString() }] })),
  updateAdminUser: (id, data) => set((s) => ({ adminUsers: s.adminUsers.map(a => a.id === id ? { ...a, ...data } : a) })),
  deleteAdminUser: (id) => set((s) => ({ adminUsers: s.adminUsers.filter(a => a.id !== id) })),

  // Others
  updateFraudAlert: (id, data) => set((s) => ({ fraudAlerts: s.fraudAlerts.map(a => a.id === id ? { ...a, ...data } : a) })),
  markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n) })),
  addNotification: (n) => set((s) => ({ notifications: [{ ...n, id: generateId(), createdAt: new Date().toISOString() }, ...s.notifications] })),
  updatePlatformConfig: (data) => set((s) => ({ platformConfig: { ...s.platformConfig, ...data } })),
  addLog: (log) => set((s) => ({ logs: [{ ...log, id: generateId(), createdAt: new Date().toISOString() }, ...s.logs] })),
}));
