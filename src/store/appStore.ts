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
  totalEarnings: number;
  todayEarnings: number;
  tasksCompleted: number;
  referralCount: number;
  referralCode: string;
  referredBy?: string;
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
  createdByUserId?: string;
  verificationMethod: 'auto' | 'manual' | 'api';
  priority: number;
  requiredLevel?: number;
  icon?: string;
  promotion?: { multiplier: number; endsAt: string };
  isPromoTask?: boolean;
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
  taskCreationFeeRate: number; // e.g. 0.15 = 15%
  taskPricePerExecution: number; // fixed cost charged to task creator per execution
  taskMinExecutions: number;
  taskMaxExecutions: number;
  
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

export interface ReferralMilestone {
  id: string;
  referralCount: number;
  reward: number;
  description: string;
  isActive: boolean;
}

export interface PromoCode {
  id: string;
  code: string;
  reward: number;
  currency: 'main';
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  expiresAt?: string;
  description: string;
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  userId: string;
  username: string;
  proofText: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
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
    id: '1', telegramId: 0, username: 'vous', firstName: 'Vous', lastName: '',
    balanceMain: 0, totalEarnings: 0, todayEarnings: 0, tasksCompleted: 0,
    referralCount: 0, referralCode: 'START00',
    riskScore: 0, status: 'active', createdAt: new Date().toISOString(), lastActive: new Date().toISOString(),
    withdrawalBlocked: false, verificationStatus: 'none',
    dailyWithdrawn: 0, dailyTasksCompleted: 0
  },
  {
    id: '2', telegramId: 112233, username: 'alice_ton', firstName: 'Alice', lastName: 'M.',
    balanceMain: 12.5, totalEarnings: 28.75, todayEarnings: 1.20, tasksCompleted: 47,
    referralCount: 8, referralCode: 'ALICE01',
    riskScore: 0, status: 'active', createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), lastActive: new Date().toISOString(),
    withdrawalBlocked: false, verificationStatus: 'none',
    dailyWithdrawn: 0, dailyTasksCompleted: 3
  },
  {
    id: '3', telegramId: 445566, username: 'crypto_bob', firstName: 'Bob', lastName: 'K.',
    balanceMain: 5.0, totalEarnings: 11.40, todayEarnings: 0.42, tasksCompleted: 23,
    referralCount: 2, referralCode: 'BOBK22',
    riskScore: 5, status: 'active', createdAt: new Date(Date.now() - 15 * 86400000).toISOString(), lastActive: new Date().toISOString(),
    withdrawalBlocked: false, verificationStatus: 'none',
    dailyWithdrawn: 0, dailyTasksCompleted: 1
  },
  {
    id: '4', telegramId: 778899, username: 'sofia_w', firstName: 'Sofia', lastName: 'W.',
    balanceMain: 31.2, totalEarnings: 67.00, todayEarnings: 2.55, tasksCompleted: 112,
    referralCount: 21, referralCode: 'SOFIAW',
    riskScore: 0, status: 'active', createdAt: new Date(Date.now() - 60 * 86400000).toISOString(), lastActive: new Date().toISOString(),
    withdrawalBlocked: false, verificationStatus: 'verified',
    dailyWithdrawn: 0, dailyTasksCompleted: 5
  },
  {
    id: '5', telegramId: 321654, username: 'max_earn', firstName: 'Max', lastName: 'D.',
    balanceMain: 8.9, totalEarnings: 19.30, todayEarnings: 0.85, tasksCompleted: 38,
    referralCount: 5, referralCode: 'MAXD55',
    riskScore: 0, status: 'active', createdAt: new Date(Date.now() - 20 * 86400000).toISOString(), lastActive: new Date().toISOString(),
    withdrawalBlocked: false, verificationStatus: 'none',
    dailyWithdrawn: 0, dailyTasksCompleted: 2
  },
];

const mockTasks: Task[] = [
  { id: '1', type: 'daily', title: 'Mission Quotidienne', description: 'Connectez-vous chaque jour pour gagner', reward: 0.10, rewardType: 'main', cooldownHours: 24, isActive: true, totalCompletions: 0, createdAt: new Date().toISOString(), verificationMethod: 'auto', priority: 0, maxPerUser: 1, icon: '📅', createdByUserId: 'platform' },
  { id: '2', type: 'join_channel', title: 'Rejoindre TonCipher Official', description: 'Abonnez-vous à notre canal principal pour rester informé', reward: 0.0425, rewardType: 'main', targetUrl: 'https://t.me/toncipherofficial', isActive: true, totalCompletions: 234, maxCompletions: 1000, createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), verificationMethod: 'auto', priority: 8, icon: '📢', createdByUserId: 'platform' },
  { id: '3', type: 'join_group', title: 'Rejoindre la communauté', description: 'Participez à notre groupe de discussion officiel', reward: 0.0425, rewardType: 'main', targetUrl: 'https://t.me/toncipherchat', isActive: true, totalCompletions: 98, maxCompletions: 500, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), verificationMethod: 'auto', priority: 7, icon: '👥', createdByUserId: 'platform' },
  { id: '4', type: 'start_bot', title: 'Démarrer @toncipherbot', description: 'Lancez le bot TonCipher et cliquez sur Start', reward: 0.0212, rewardType: 'main', targetUrl: 'https://t.me/toncipherbot', isActive: true, totalCompletions: 45, maxCompletions: 200, createdAt: new Date(Date.now() - 1 * 86400000).toISOString(), verificationMethod: 'auto', priority: 5, icon: '🤖', createdByUserId: 'platform' },
  { id: '5', type: 'special', title: '🏆 Challenge Parrainage', description: 'Invitez 3 amis à rejoindre TonCipher. Envoyez une capture d\'écran de votre section Parrainage avec 3+ filleuls visibles.', reward: 1.50, rewardType: 'main', isActive: true, totalCompletions: 12, maxCompletions: 50, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), verificationMethod: 'manual', priority: 10, isPromoTask: true, icon: '🏆', createdByUserId: 'platform' },
  { id: '6', type: 'special', title: '📢 Partage Communauté', description: 'Partagez TonCipher dans un groupe Telegram de 100+ membres. Envoyez la capture d\'écran de votre message publié avec le lien visible.', reward: 0.80, rewardType: 'main', isActive: true, totalCompletions: 5, maxCompletions: 100, createdAt: new Date(Date.now() - 1 * 86400000).toISOString(), verificationMethod: 'manual', priority: 9, isPromoTask: true, icon: '📢', createdByUserId: 'platform' },
];

const mockPromoCodes: PromoCode[] = [
  { id: '1', code: 'LAUNCH50', reward: 0.50, currency: 'main', maxUses: 500, currentUses: 127, isActive: true, description: 'Code de lancement officiel', createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: '2', code: 'VIP200', reward: 2.00, currency: 'main', maxUses: 20, currentUses: 3, isActive: true, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), description: 'Code VIP exclusif — 7 jours', createdAt: new Date().toISOString() },
];

const mockTaskSubmissions: TaskSubmission[] = [];

const mockTransactions: Transaction[] = [];

const mockCampaigns: Campaign[] = [];

const mockChannels: Channel[] = [];

const mockShopItems: ShopItem[] = [
  { id: '1', name: 'Double Récompenses (24h)', description: 'Multipliez vos récompenses de tâches par 2 pendant 24 heures', price: 5.00, currency: 'main', type: 'multiplier', value: 2, duration: 24, isActive: true, purchases: 0, icon: '⚡', category: 'boosters' },
  { id: '2', name: 'Pack Bonus 50', description: 'Recevez 50 crédits bonus instantanément', price: 10.00, currency: 'main', type: 'bonus_pack', value: 50, isActive: true, purchases: 0, icon: '🎁', category: 'packs' },
  { id: '3', name: 'Triple Récompenses (12h)', description: 'Triplez vos récompenses de tâches', price: 15.00, currency: 'main', type: 'multiplier', value: 3, duration: 12, isActive: true, purchases: 0, icon: '🚀', category: 'boosters' },
  { id: '4', name: 'Statut Premium (7j)', description: 'Accédez aux tâches premium pendant 7 jours', price: 25.00, currency: 'main', type: 'premium', value: 1, duration: 168, isActive: true, purchases: 0, icon: '👑', category: 'premium' },
  { id: '5', name: 'Badge Exclusif', description: 'Obtenez un badge rare pour votre profil', price: 100.00, currency: 'main', type: 'badge', value: 1, isActive: true, purchases: 0, maxPurchases: 50, icon: '💎', category: 'collectibles' },
];

const mockNotifications: Notification[] = [];

const mockFraudAlerts: FraudAlert[] = [];

const mockCryptoNetworks: CryptoNetwork[] = [
  { id: '1', name: 'Toncoin', symbol: 'TON', network: 'TON', isActive: true, isDepositEnabled: true, isWithdrawalEnabled: true, minDeposit: 1, maxDeposit: 10000, minWithdrawal: 5, maxWithdrawal: 5000, withdrawalFee: 0.5, withdrawalFeeType: 'fixed', requiredConfirmations: 12, dailyWithdrawalLimit: 10000, autoWithdrawal: true, autoWithdrawalThreshold: 100, hotWalletBalance: 0, coldWalletBalance: 0, hotWalletAddress: '', coldWalletAddress: '', explorerUrl: 'https://tonscan.org/tx/', decimals: 9, priority: 1 },
  { id: '2', name: 'Tether USD (TON)', symbol: 'USDT', network: 'TON', isActive: true, isDepositEnabled: true, isWithdrawalEnabled: true, minDeposit: 5, maxDeposit: 50000, minWithdrawal: 10, maxWithdrawal: 25000, withdrawalFee: 1.0, withdrawalFeeType: 'fixed', requiredConfirmations: 12, dailyWithdrawalLimit: 50000, autoWithdrawal: false, autoWithdrawalThreshold: 500, hotWalletBalance: 0, coldWalletBalance: 0, hotWalletAddress: '', coldWalletAddress: '', explorerUrl: 'https://tonscan.org/tx/', decimals: 6, contractAddress: '0:b113a994b5024a16719f69139328eb759596c38a25f5972a7e5b7892d4b7a09e', priority: 2 },
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
  { id: '1', telegramId: 0, username: 'super_admin', role: 'super_admin', permissions: ['*'], isActive: true, createdAt: new Date().toISOString() },
];

const mockReferralMilestones: ReferralMilestone[] = [
  { id: '1', referralCount: 5, reward: 2.00, description: 'Invitez 5 amis', isActive: true },
  { id: '2', referralCount: 20, reward: 10.00, description: 'Invitez 20 amis', isActive: true },
  { id: '3', referralCount: 50, reward: 30.00, description: 'Invitez 50 amis', isActive: true },
  { id: '4', referralCount: 100, reward: 75.00, description: 'Invitez 100 amis', isActive: true },
];

const mockPlatformConfig: PlatformConfig = {
  botToken: '',
  botUsername: 'TonCipher_bot',
  apiId: '',
  apiHash: '',
  databaseUrl: '',
  mainChannel: '@toncipherofficial',
  mainGroup: '@teletask_discuss',
  supportBot: '@teletask_support',
  announcementChannel: '@teletask_news',
  mainWallet: '',
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
  taskCreationFeeRate: 0.15,
  taskPricePerExecution: 0.05,
  taskMinExecutions: 100,
  taskMaxExecutions: 100000,
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
  totalUsers: 0,
  activeUsers: 0,
  newUsersToday: 0,
  totalDeposits: 0,
  totalWithdrawals: 0,
  platformRevenue: 0,
  activeCampaigns: 0,
  totalRewardsDistributed: 0,
  totalTasks: 0,
  completedTasksToday: 0,
  totalReferrals: 0,
  fraudAlertsToday: 0,
  pendingWithdrawals: 0,
  pendingDeposits: 0,
};

const mockLogs: LogEntry[] = [];

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
  referralMilestones: ReferralMilestone[];
  promoCodes: PromoCode[];
  taskSubmissions: TaskSubmission[];

  // Mini App State
  completedTaskIds: string[];
  claimedReferralMilestoneIds: string[];
  usedPromoCodeIds: string[];

  // Actions - Mini App
  confirmDeposit: (txId: string, txHash: string) => void;
  creditDeposit: (userId: string, amount: number, currency: string, txHash: string, network: string) => void;
  completeTask: (taskId: string) => void;
  submitWithdrawal: (networkId: string, amount: number, address: string) => { success: boolean; error?: string };
  claimReferralMilestone: (id: string) => void;
  addReferralMilestone: (milestone: Omit<ReferralMilestone, 'id'>) => void;
  updateReferralMilestone: (id: string, data: Partial<ReferralMilestone>) => void;
  deleteReferralMilestone: (id: string) => void;
  initFromTelegram: (user: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string }) => void;

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
  addPlatformRevenue: (amount: number) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'createdAt'>) => void;

  redeemPromoCode: (code: string) => { success: boolean; error?: string; reward?: number };
  submitTaskProof: (taskId: string, proofText: string) => { success: boolean; error?: string };
  reviewTaskSubmission: (submissionId: string, status: 'approved' | 'rejected', adminNote?: string) => void;
  addPromoCode: (code: Omit<PromoCode, 'id' | 'createdAt' | 'currentUses'>) => void;
  updatePromoCode: (id: string, data: Partial<PromoCode>) => void;
  deletePromoCode: (id: string) => void;
  buyShopItem: (itemId: string) => { success: boolean; error?: string };
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'miniapp',
  miniAppPage: 'dashboard',
  adminPage: 'overview',
  adminSidebarOpen: false,
  modalOpen: null,
  modalData: null,
  completedTaskIds: [],

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
  referralMilestones: mockReferralMilestones,
  promoCodes: mockPromoCodes,
  taskSubmissions: mockTaskSubmissions,

  claimedReferralMilestoneIds: [],
  usedPromoCodeIds: [],

  // Mini App Actions
  confirmDeposit: (txId, txHash) => {
    const state = get();
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx || tx.status === 'completed') return;
    const user = state.users.find(u => u.id === tx.userId);
    if (!user) return;
    const balanceUpdate = {
      balanceMain: user.balanceMain + tx.amount,
      totalEarnings: user.totalEarnings + tx.amount,
    };
    set(s => ({
      transactions: s.transactions.map(t =>
        t.id === txId ? { ...t, status: 'completed', txHash, completedAt: new Date().toISOString() } : t
      ),
      users: s.users.map(u => u.id === tx.userId ? { ...u, ...balanceUpdate } : u),
      currentUser: s.currentUser.id === tx.userId ? { ...s.currentUser, ...balanceUpdate } : s.currentUser,
    }));
    get().addNotification({
      userId: tx.userId,
      type: 'deposit',
      title: 'Dépôt confirmé! 🎉',
      message: `+${tx.amount.toFixed(2)} ${tx.currency} crédité sur votre compte.`,
      isRead: false,
    });
  },

  creditDeposit: (userId, amount, currency, txHash, network) => {
    const state = get();
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    const balanceUpdate = {
      balanceMain: user.balanceMain + amount,
      totalEarnings: user.totalEarnings + amount,
    };
    set(s => ({
      users: s.users.map(u => u.id === userId ? { ...u, ...balanceUpdate } : u),
      currentUser: s.currentUser.id === userId ? { ...s.currentUser, ...balanceUpdate } : s.currentUser,
    }));
    get().addTransaction({
      userId,
      type: 'deposit',
      amount,
      currency,
      network,
      status: 'completed',
      txHash,
      completedAt: new Date().toISOString(),
    });
    get().addNotification({
      userId,
      type: 'deposit',
      title: 'Dépôt reçu! 🎉',
      message: `+${amount.toFixed(2)} ${currency} crédité automatiquement.`,
      isRead: false,
    });
  },

  completeTask: (taskId) => {
    const state = get();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || state.completedTaskIds.includes(taskId)) return;
    const isPromoActive = task.promotion && new Date(task.promotion.endsAt) > new Date();
    const multiplier = isPromoActive ? task.promotion!.multiplier : 1;
    const earned = task.reward * multiplier;
    const updatedUser = {
      balanceMain: state.currentUser.balanceMain + earned,
      tasksCompleted: state.currentUser.tasksCompleted + 1,
      todayEarnings: state.currentUser.todayEarnings + earned,
      totalEarnings: state.currentUser.totalEarnings + earned,
    };
    set(s => ({
      completedTaskIds: [...s.completedTaskIds, taskId],
      tasks: s.tasks.map(t => t.id === taskId ? { ...t, totalCompletions: t.totalCompletions + 1 } : t),
      currentUser: { ...s.currentUser, ...updatedUser },
      users: s.users.map(u => u.id === state.currentUser.id ? { ...u, ...updatedUser } : u),
    }));
    const rewardCurrency = task.rewardType === 'main' ? 'TON' : task.rewardType.toUpperCase();
    get().addTransaction({ userId: state.currentUser.id, type: 'reward', amount: earned, currency: rewardCurrency, status: 'completed', completedAt: new Date().toISOString() });
    get().addNotification({ userId: state.currentUser.id, type: 'reward', title: 'Tâche complétée!', message: `+${earned.toFixed(2)} TON${isPromoActive ? ` (×${multiplier} promo!)` : ''} pour "${task.title}"`, isRead: false });
  },

  initFromTelegram: (tgUser) => set(s => {
    const tgData = {
      telegramId: tgUser.id,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name || '',
      username: tgUser.username || `user${tgUser.id}`,
      avatarUrl: tgUser.photo_url,
      referralCode: tgUser.id.toString(),
    };
    return {
      currentUser: { ...s.currentUser, ...tgData },
      users: s.users.map(u => u.id === s.currentUser.id ? { ...u, ...tgData } : u),
    };
  }),

  claimReferralMilestone: (id) => {
    const state = get();
    if (state.claimedReferralMilestoneIds.includes(id)) return;
    const milestone = state.referralMilestones.find(m => m.id === id);
    if (!milestone || !milestone.isActive) return;
    if (state.currentUser.referralCount < milestone.referralCount) return;
    const milestoneUpdate = {
      balanceMain: state.currentUser.balanceMain + milestone.reward,
      totalEarnings: state.currentUser.totalEarnings + milestone.reward,
    };
    set(s => ({
      claimedReferralMilestoneIds: [...s.claimedReferralMilestoneIds, id],
      currentUser: { ...s.currentUser, ...milestoneUpdate },
      users: s.users.map(u => u.id === state.currentUser.id ? { ...u, ...milestoneUpdate } : u),
    }));
    get().addTransaction({ userId: state.currentUser.id, type: 'reward', amount: milestone.reward, currency: 'TON', status: 'completed', completedAt: new Date().toISOString() });
  },

  submitWithdrawal: (networkId, amount, address) => {
    const state = get();
    const network = state.cryptoNetworks.find(n => n.id === networkId);
    if (!network) return { success: false, error: 'Réseau invalide' };
    if (!network.isWithdrawalEnabled) return { success: false, error: 'Retraits désactivés pour ce réseau' };
    if (amount < network.minWithdrawal) return { success: false, error: `Minimum: ${network.minWithdrawal} ${network.symbol}` };
    if (amount > network.maxWithdrawal) return { success: false, error: `Maximum: ${network.maxWithdrawal} ${network.symbol}` };
    if (state.currentUser.balanceMain < amount) return { success: false, error: 'Solde insuffisant' };
    if (!address || address.trim().length < 10) return { success: false, error: 'Adresse invalide' };
    set(s => ({
      currentUser: { ...s.currentUser, balanceMain: s.currentUser.balanceMain - amount },
      users: s.users.map(u => u.id === state.currentUser.id ? { ...u, balanceMain: u.balanceMain - amount } : u),
    }));
    get().addTransaction({ userId: state.currentUser.id, type: 'withdrawal', amount, currency: network.symbol, network: network.network, address: address.trim(), status: 'pending', fee: network.withdrawalFee });
    return { success: true };
  },

  // View Actions
  setCurrentView: (view) => set({ currentView: view }),
  setMiniAppPage: (page) => set({ miniAppPage: page }),
  setAdminPage: (page) => set({ adminPage: page }),
  toggleAdminSidebar: () => set((s) => ({ adminSidebarOpen: !s.adminSidebarOpen })),
  openModal: (modal, data) => set({ modalOpen: modal, modalData: data || null }),
  closeModal: () => set({ modalOpen: null, modalData: null }),

  // User CRUD
  addUser: (user) => set((s) => ({ users: [...s.users, { ...user, id: generateId() }] })),
  updateUser: (id, data) => set((s) => ({
    users: s.users.map(u => u.id === id ? { ...u, ...data } : u),
    currentUser: s.currentUser.id === id ? { ...s.currentUser, ...data } : s.currentUser,
  })),
  deleteUser: (id) => set((s) => ({ users: s.users.filter(u => u.id !== id) })),

  // Task CRUD
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, { ...task, id: generateId(), createdAt: new Date().toISOString(), totalCompletions: 0, createdByUserId: s.currentUser.id }] })),
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

  // Referral Milestone CRUD
  addReferralMilestone: (milestone) => set((s) => ({ referralMilestones: [...s.referralMilestones, { ...milestone, id: generateId() }].sort((a, b) => a.referralCount - b.referralCount) })),
  updateReferralMilestone: (id, data) => set((s) => ({ referralMilestones: s.referralMilestones.map(m => m.id === id ? { ...m, ...data } : m) })),
  deleteReferralMilestone: (id) => set((s) => ({ referralMilestones: s.referralMilestones.filter(m => m.id !== id) })),

  // Others
  updateFraudAlert: (id, data) => set((s) => ({ fraudAlerts: s.fraudAlerts.map(a => a.id === id ? { ...a, ...data } : a) })),
  markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n) })),
  addNotification: (n) => set((s) => ({ notifications: [{ ...n, id: generateId(), createdAt: new Date().toISOString() }, ...s.notifications] })),
  updatePlatformConfig: (data) => set((s) => ({ platformConfig: { ...s.platformConfig, ...data } })),
  addPlatformRevenue: (amount) => set((s) => ({ platformStats: { ...s.platformStats, platformRevenue: s.platformStats.platformRevenue + amount } })),
  addLog: (log) => set((s) => ({ logs: [{ ...log, id: generateId(), createdAt: new Date().toISOString() }, ...s.logs] })),

  redeemPromoCode: (code) => {
    const state = get();
    const promo = state.promoCodes.find(p => p.code.toUpperCase() === code.toUpperCase().trim());
    if (!promo) return { success: false, error: 'Code invalide.' };
    if (!promo.isActive) return { success: false, error: 'Ce code n\'est plus actif.' };
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return { success: false, error: 'Code expiré.' };
    if (promo.currentUses >= promo.maxUses) return { success: false, error: 'Ce code a atteint sa limite d\'utilisation.' };
    if (state.usedPromoCodeIds.includes(promo.id)) return { success: false, error: 'Vous avez déjà utilisé ce code.' };
    const earned = promo.reward;
    const balanceUpdate = { balanceMain: state.currentUser.balanceMain + earned, totalEarnings: state.currentUser.totalEarnings + earned };
    set(s => ({
      usedPromoCodeIds: [...s.usedPromoCodeIds, promo.id],
      promoCodes: s.promoCodes.map(p => p.id === promo.id ? { ...p, currentUses: p.currentUses + 1 } : p),
      currentUser: { ...s.currentUser, ...balanceUpdate },
      users: s.users.map(u => u.id === state.currentUser.id ? { ...u, ...balanceUpdate } : u),
    }));
    get().addTransaction({ userId: state.currentUser.id, type: 'bonus', amount: earned, currency: 'TON', status: 'completed', completedAt: new Date().toISOString() });
    get().addNotification({ userId: state.currentUser.id, type: 'reward', title: 'Code promo activé! 🎉', message: `+${earned.toFixed(2)} TON crédité via le code "${promo.code}".`, isRead: false });
    return { success: true, reward: earned };
  },

  submitTaskProof: (taskId, proofText) => {
    const state = get();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Tâche introuvable.' };
    if (!proofText.trim()) return { success: false, error: 'La preuve ne peut pas être vide.' };
    const existing = state.taskSubmissions.find(s => s.taskId === taskId && s.userId === state.currentUser.id);
    if (existing?.status === 'pending') return { success: false, error: 'Une soumission est déjà en attente de validation.' };
    if (existing?.status === 'approved') return { success: false, error: 'Votre preuve a déjà été validée.' };
    set(s => ({
      taskSubmissions: [{
        id: generateId(),
        taskId,
        userId: state.currentUser.id,
        username: state.currentUser.username,
        proofText: proofText.trim(),
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      }, ...s.taskSubmissions],
    }));
    return { success: true };
  },

  reviewTaskSubmission: (submissionId, status, adminNote) => {
    const state = get();
    const submission = state.taskSubmissions.find(s => s.id === submissionId);
    if (!submission || submission.status !== 'pending') return;
    set(s => ({
      taskSubmissions: s.taskSubmissions.map(sub =>
        sub.id === submissionId ? { ...sub, status, adminNote, reviewedAt: new Date().toISOString() } : sub
      ),
    }));
    const task = state.tasks.find(t => t.id === submission.taskId);
    const user = state.users.find(u => u.id === submission.userId);
    if (status === 'approved' && task && user) {
      const balanceUpdate = {
        balanceMain: user.balanceMain + task.reward,
        totalEarnings: user.totalEarnings + task.reward,
        tasksCompleted: user.tasksCompleted + 1,
      };
      set(s => ({
        tasks: s.tasks.map(t => t.id === submission.taskId ? { ...t, totalCompletions: t.totalCompletions + 1 } : t),
        users: s.users.map(u => u.id === submission.userId ? { ...u, ...balanceUpdate } : u),
        currentUser: s.currentUser.id === submission.userId ? { ...s.currentUser, ...balanceUpdate } : s.currentUser,
      }));
      get().addTransaction({ userId: submission.userId, type: 'reward', amount: task.reward, currency: 'TON', status: 'completed', completedAt: new Date().toISOString() });
      get().addNotification({ userId: submission.userId, type: 'reward', title: 'Tâche promo validée! 🎉', message: `+${task.reward.toFixed(2)} TON crédité pour "${task.title}".`, isRead: false });
    } else if (status === 'rejected') {
      get().addNotification({ userId: submission.userId, type: 'alert', title: 'Preuve refusée', message: `Votre soumission pour "${task?.title}" a été refusée.${adminNote ? ` Motif: ${adminNote}` : ''}`, isRead: false });
    }
  },

  addPromoCode: (code) => set((s) => ({ promoCodes: [...s.promoCodes, { ...code, id: generateId(), createdAt: new Date().toISOString(), currentUses: 0 }] })),
  updatePromoCode: (id, data) => set((s) => ({ promoCodes: s.promoCodes.map(p => p.id === id ? { ...p, ...data } : p) })),
  deletePromoCode: (id) => set((s) => ({ promoCodes: s.promoCodes.filter(p => p.id !== id) })),

  buyShopItem: (itemId) => {
    const state = get();
    const item = state.shopItems.find(i => i.id === itemId);
    if (!item || !item.isActive) return { success: false, error: 'Article introuvable.' };
    if (item.maxPurchases != null && item.purchases >= item.maxPurchases) return { success: false, error: 'Stock épuisé.' };
    if (state.currentUser.balanceMain < item.price) return { success: false, error: `Solde insuffisant. Requis: ${item.price.toFixed(2)} TON.` };
    const balanceUpdate = { balanceMain: state.currentUser.balanceMain - item.price };
    set(s => ({
      currentUser: { ...s.currentUser, ...balanceUpdate },
      users: s.users.map(u => u.id === state.currentUser.id ? { ...u, ...balanceUpdate } : u),
      shopItems: s.shopItems.map(i => i.id === itemId ? { ...i, purchases: i.purchases + 1 } : i),
    }));
    get().addTransaction({ userId: state.currentUser.id, type: 'purchase', amount: item.price, currency: 'TON', status: 'completed', completedAt: new Date().toISOString() });
    get().addNotification({ userId: state.currentUser.id, type: 'system', title: 'Achat effectué! ✅', message: `${item.icon} ${item.name} activé${item.duration ? ` pour ${item.duration}h` : ''}.`, isRead: false });
    return { success: true };
  },
}));
