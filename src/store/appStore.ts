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
    id: '1', telegramId: 0, username: 'vous', firstName: 'Vous', lastName: '',
    balanceMain: 0, balanceBonus: 0, balanceReferral: 0, balanceRewards: 0,
    totalEarnings: 0, todayEarnings: 0, xp: 0, level: 1, tasksCompleted: 0,
    referralCount: 0, referralCode: 'START00', streak: 0, badges: [],
    riskScore: 0, status: 'active', createdAt: new Date().toISOString(), lastActive: new Date().toISOString(),
    withdrawalBlocked: false, verificationStatus: 'none',
    dailyWithdrawn: 0, dailyTasksCompleted: 0
  },
];

const mockTasks: Task[] = [
  { id: '1', type: 'daily', title: 'Mission Quotidienne', description: 'Connectez-vous chaque jour pour gagner', reward: 0.10, rewardType: 'main', cooldownHours: 24, isActive: true, totalCompletions: 0, createdAt: new Date().toISOString(), verificationMethod: 'auto', priority: 0, maxPerUser: 1, icon: '📅' },
];

const mockTransactions: Transaction[] = [];

const mockCampaigns: Campaign[] = [];

const mockChannels: Channel[] = [];

const mockShopItems: ShopItem[] = [
  { id: '1', name: 'Double XP (24h)', description: 'Multipliez vos gains d\'XP par 2 pendant 24 heures', price: 5.00, currency: 'main', type: 'multiplier', value: 2, duration: 24, isActive: true, purchases: 0, icon: '⚡', category: 'boosters' },
  { id: '2', name: 'Pack Bonus 50', description: 'Recevez 50 crédits bonus instantanément', price: 10.00, currency: 'main', type: 'bonus_pack', value: 50, isActive: true, purchases: 0, icon: '🎁', category: 'packs' },
  { id: '3', name: 'Triple Récompenses (12h)', description: 'Triplez vos récompenses de tâches', price: 15.00, currency: 'main', type: 'multiplier', value: 3, duration: 12, isActive: true, purchases: 0, icon: '🚀', category: 'boosters' },
  { id: '4', name: 'Statut Premium (7j)', description: 'Accédez aux tâches premium pendant 7 jours', price: 25.00, currency: 'main', type: 'premium', value: 1, duration: 168, isActive: true, purchases: 0, icon: '👑', category: 'premium' },
  { id: '5', name: 'Badge Exclusif', description: 'Obtenez un badge rare pour votre profil', price: 100.00, currency: 'bonus', type: 'badge', value: 1, isActive: true, purchases: 0, maxPurchases: 50, icon: '💎', category: 'collectibles' },
];

const mockNotifications: Notification[] = [];

const mockFraudAlerts: FraudAlert[] = [];

const mockCryptoNetworks: CryptoNetwork[] = [
  { id: '1', name: 'Toncoin', symbol: 'TON', network: 'TON', isActive: true, isDepositEnabled: true, isWithdrawalEnabled: true, minDeposit: 1, maxDeposit: 10000, minWithdrawal: 5, maxWithdrawal: 5000, withdrawalFee: 0.5, withdrawalFeeType: 'fixed', requiredConfirmations: 12, dailyWithdrawalLimit: 10000, autoWithdrawal: true, autoWithdrawalThreshold: 100, hotWalletBalance: 0, coldWalletBalance: 0, hotWalletAddress: '', coldWalletAddress: '', explorerUrl: 'https://tonscan.org/tx/', decimals: 9, priority: 1 },
  { id: '2', name: 'Tether Polygon', symbol: 'USDT', network: 'POLYGON', isActive: true, isDepositEnabled: true, isWithdrawalEnabled: true, minDeposit: 5, maxDeposit: 50000, minWithdrawal: 10, maxWithdrawal: 25000, withdrawalFee: 1.0, withdrawalFeeType: 'fixed', requiredConfirmations: 20, dailyWithdrawalLimit: 50000, autoWithdrawal: true, autoWithdrawalThreshold: 500, hotWalletBalance: 0, coldWalletBalance: 0, hotWalletAddress: '', coldWalletAddress: '', explorerUrl: 'https://polygonscan.com/tx/', decimals: 6, contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', priority: 2 },
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

const mockPlatformConfig: PlatformConfig = {
  botToken: '',
  botUsername: 'toncipherbot',
  apiId: '',
  apiHash: '',
  databaseUrl: '',
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

  // Mini App State
  completedTaskIds: string[];
  dailyRewardClaimed: boolean;
  claimedMilestoneIds: string[];

  // Actions - Mini App
  completeTask: (taskId: string) => void;
  claimDailyReward: () => void;
  claimMilestone: (id: string, amount: number) => void;
  purchaseShopItem: (itemId: string) => boolean;
  submitWithdrawal: (networkId: string, amount: number, address: string) => { success: boolean; error?: string };

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

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'miniapp',
  miniAppPage: 'dashboard',
  adminPage: 'overview',
  adminSidebarOpen: false,
  modalOpen: null,
  modalData: null,
  completedTaskIds: [],
  dailyRewardClaimed: false,
  claimedMilestoneIds: [],

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

  // Mini App Actions
  completeTask: (taskId) => {
    const state = get();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || state.completedTaskIds.includes(taskId)) return;
    set(s => ({
      completedTaskIds: [...s.completedTaskIds, taskId],
      tasks: s.tasks.map(t => t.id === taskId ? { ...t, totalCompletions: t.totalCompletions + 1 } : t),
      currentUser: {
        ...s.currentUser,
        balanceMain: task.rewardType === 'main' ? s.currentUser.balanceMain + task.reward : s.currentUser.balanceMain,
        balanceBonus: task.rewardType === 'bonus' ? s.currentUser.balanceBonus + task.reward : s.currentUser.balanceBonus,
        xp: s.currentUser.xp + (task.rewardType === 'xp' ? task.reward : 10),
        tasksCompleted: s.currentUser.tasksCompleted + 1,
        todayEarnings: task.rewardType !== 'xp' ? s.currentUser.todayEarnings + task.reward : s.currentUser.todayEarnings,
        totalEarnings: task.rewardType !== 'xp' ? s.currentUser.totalEarnings + task.reward : s.currentUser.totalEarnings,
        balanceRewards: task.rewardType === 'main' ? s.currentUser.balanceRewards + task.reward : s.currentUser.balanceRewards,
      },
    }));
    get().addTransaction({ userId: state.currentUser.id, type: 'reward', amount: task.reward, currency: task.rewardType === 'xp' ? 'XP' : 'TON', status: 'completed', completedAt: new Date().toISOString() });
    get().addNotification({ userId: state.currentUser.id, type: 'reward', title: 'Tâche complétée!', message: `+${task.reward} ${task.rewardType === 'xp' ? 'XP' : 'TON'} pour "${task.title}"`, isRead: false });
  },

  claimDailyReward: () => {
    if (get().dailyRewardClaimed) return;
    const userId = get().currentUser.id;
    set(s => ({
      dailyRewardClaimed: true,
      currentUser: {
        ...s.currentUser,
        balanceMain: s.currentUser.balanceMain + 0.10,
        balanceRewards: s.currentUser.balanceRewards + 0.10,
        todayEarnings: s.currentUser.todayEarnings + 0.10,
        totalEarnings: s.currentUser.totalEarnings + 0.10,
        streak: s.currentUser.streak + 1,
      },
    }));
    get().addTransaction({ userId, type: 'reward', amount: 0.10, currency: 'TON', status: 'completed', completedAt: new Date().toISOString() });
  },

  claimMilestone: (id, amount) => {
    if (get().claimedMilestoneIds.includes(id)) return;
    const userId = get().currentUser.id;
    set(s => ({
      claimedMilestoneIds: [...s.claimedMilestoneIds, id],
      currentUser: {
        ...s.currentUser,
        balanceMain: s.currentUser.balanceMain + amount,
        balanceRewards: s.currentUser.balanceRewards + amount,
        totalEarnings: s.currentUser.totalEarnings + amount,
      },
    }));
    get().addTransaction({ userId, type: 'reward', amount, currency: 'TON', status: 'completed', completedAt: new Date().toISOString() });
  },

  purchaseShopItem: (itemId) => {
    const state = get();
    const item = state.shopItems.find(i => i.id === itemId);
    if (!item || !item.isActive) return false;
    if (item.maxPurchases && item.purchases >= item.maxPurchases) return false;
    const balance = item.currency === 'xp' ? state.currentUser.xp : item.currency === 'bonus' ? state.currentUser.balanceBonus : state.currentUser.balanceMain;
    if (balance < item.price) return false;
    set(s => ({
      shopItems: s.shopItems.map(i => i.id === itemId ? { ...i, purchases: i.purchases + 1 } : i),
      currentUser: {
        ...s.currentUser,
        xp: item.currency === 'xp' ? s.currentUser.xp - item.price : s.currentUser.xp,
        balanceBonus: item.currency === 'bonus' ? s.currentUser.balanceBonus - item.price : s.currentUser.balanceBonus,
        balanceMain: item.currency === 'main' ? s.currentUser.balanceMain - item.price : s.currentUser.balanceMain,
      },
    }));
    get().addTransaction({ userId: state.currentUser.id, type: 'purchase', amount: item.price, currency: item.currency === 'xp' ? 'XP' : 'TON', status: 'completed', completedAt: new Date().toISOString() });
    return true;
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
    set(s => ({ currentUser: { ...s.currentUser, balanceMain: s.currentUser.balanceMain - amount } }));
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
