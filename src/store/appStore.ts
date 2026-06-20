import { create } from 'zustand';
import { getAdminKey } from '../utils/adminFetch';

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
  referralDailyCount: number;
  loginStreak: number;
  referralCode: string;
  referredBy?: string;
  riskScore: number;
  status: 'active' | 'suspended' | 'banned';
  createdAt: string;
  lastActive: string;
  ip?: string;
  deviceHash?: string;
  taskCredits: number;
  withdrawalBlocked: boolean;
  verificationStatus: 'none' | 'pending' | 'verified';
  dailyWithdrawn: number;
  dailyTasksCompleted: number;
}

export interface GameResult {
  game: string;
  bet: number;
  win: number;
  ts: number;
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
  verificationMethod: 'auto' | 'manual' | 'api' | 'auto_referral';
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
  type: 'multiplier' | 'bonus_pack' | 'premium' | 'special' | 'badge' | 'vip' | 'task_credit';
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
  appShortName: string;
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
  streakMilestones: { day: number; bonus: number }[];
  
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

  // Promo Event
  promoEvent: { active: boolean; multiplier: number; endsAt: string; label: string } | null;
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
  proofImageBase64?: string;
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

const _savedBalance: {
  v?: number;
  balanceMain?: number; totalEarnings?: number; todayEarnings?: number;
  tasksCompleted?: number; taskCredits?: number; loginStreak?: number;
  lastSyncedReferralBalance?: number;
  completedTaskIds?: string[];
} = (() => {
  try { return JSON.parse(localStorage.getItem('tc_balance') || '{}'); }
  catch { return {}; }
})();
// True when this device already has persisted app data. When false (fresh
// WebView / cleared storage / new device), the server-side balance backup
// returned by /api/user/init is adopted instead of the local mock defaults.
export const hadSavedBalance: boolean = (() => {
  try { return localStorage.getItem('tc_balance') !== null; }
  catch { return false; }
})();
const _savedCompleted: string[] = (() => {
  try {
    const local = JSON.parse(localStorage.getItem('tc_completed_tasks') || '[]') as string[];
    // Fall back to the copy embedded in tc_balance if tc_completed_tasks was cleared
    if (local.length === 0 && Array.isArray(_savedBalance.completedTaskIds) && _savedBalance.completedTaskIds.length > 0) {
      return _savedBalance.completedTaskIds;
    }
    return local;
  }
  catch { return _savedBalance.completedTaskIds ?? []; }
})();
const _savedBoosters: { multiplier: number; expiresAt: string }[] = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem('tc_boosters') || '[]') as { multiplier: number; expiresAt: string }[];
    return raw.filter(b => new Date(b.expiresAt) > new Date());
  }
  catch { return []; }
})();
const _savedRefBoost: string | null = (() => {
  try {
    const v = localStorage.getItem('tc_ref_boost');
    return v && new Date(v) > new Date() ? v : null;
  } catch { return null; }
})();
const _savedTransactions: Transaction[] = (() => {
  try { return JSON.parse(localStorage.getItem('tc_transactions') || '[]') as Transaction[]; }
  catch { return []; }
})();
const _savedNotifications: Notification[] = (() => {
  try { return JSON.parse(localStorage.getItem('tc_notifications') || '[]') as Notification[]; }
  catch { return []; }
})();
const _savedCampaigns: Campaign[] = (() => {
  try { return JSON.parse(localStorage.getItem('tc_campaigns') || '[]') as Campaign[]; }
  catch { return []; }
})();
const _savedChannels: Channel[] = (() => {
  try { return JSON.parse(localStorage.getItem('tc_channels') || '[]') as Channel[]; }
  catch { return []; }
})();
const _savedShopItems: ShopItem[] = (() => {
  try { return JSON.parse(localStorage.getItem('tc_shop_items') || '[]') as ShopItem[]; }
  catch { return []; }
})();
const _savedPromoCodes: PromoCode[] = (() => {
  try { return JSON.parse(localStorage.getItem('tc_promo_codes') || '[]') as PromoCode[]; }
  catch { return []; }
})();
const _savedReferralMilestones: ReferralMilestone[] = (() => {
  try { return JSON.parse(localStorage.getItem('tc_referral_milestones') || '[]') as ReferralMilestone[]; }
  catch { return []; }
})();

const mockUsers: User[] = [
  {
    id: '1', telegramId: 0, username: 'you', firstName: 'You', lastName: '',
    balanceMain: _savedBalance.balanceMain ?? 1.0, totalEarnings: _savedBalance.totalEarnings ?? 0, todayEarnings: _savedBalance.todayEarnings ?? 0, tasksCompleted: _savedBalance.tasksCompleted ?? 0, taskCredits: _savedBalance.taskCredits ?? 0,
    referralCount: 0, referralDailyCount: 0, loginStreak: _savedBalance.loginStreak ?? 0, referralCode: 'START00',
    riskScore: 0, status: 'active', createdAt: new Date().toISOString(), lastActive: new Date().toISOString(),
    withdrawalBlocked: false, verificationStatus: 'none',
    dailyWithdrawn: 0, dailyTasksCompleted: 0,
  },
];

const _defaultTasks: Task[] = [
  { id: '2', type: 'join_channel', title: 'Join TonCipher Official', description: 'Subscribe to our official channel to stay informed', reward: 0.002, rewardType: 'main', targetUrl: 'https://t.me/TonCipher_Official', isActive: true, totalCompletions: 0, maxCompletions: 1000, createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), verificationMethod: 'auto', priority: 8, icon: '📢', createdByUserId: 'platform' },
  { id: '3', type: 'join_channel', title: 'Join TonCipher Payments', description: 'Join our payment tracking channel', reward: 0.002, rewardType: 'main', targetUrl: 'https://t.me/TonCipher_Pays', isActive: true, totalCompletions: 0, maxCompletions: 500, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), verificationMethod: 'auto', priority: 7, icon: '💸', createdByUserId: 'platform' },
  { id: '4', type: 'start_bot', title: 'Start @TonCipher_bot', description: 'Open the TonCipher bot and press the Start button', reward: 0.002, rewardType: 'main', targetUrl: 'https://t.me/TonCipher_bot', isActive: true, totalCompletions: 0, maxCompletions: 200, createdAt: new Date(Date.now() - 1 * 86400000).toISOString(), verificationMethod: 'auto', priority: 5, icon: '🤖', createdByUserId: 'platform' },
  { id: '5', type: 'special', title: '🏆 Referral Challenge', description: 'Invite 3 friends to join TonCipher. Verification is automatic once you have 3 referrals.', reward: 1.50, rewardType: 'main', isActive: true, totalCompletions: 0, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), verificationMethod: 'auto_referral', requiredCount: 3, priority: 10, isPromoTask: true, icon: '🏆', createdByUserId: 'platform' },
  { id: '6', type: 'special', title: '📢 Community Share', description: 'Share TonCipher in a Telegram group with 100+ members. Submit a link or description as proof — the team will validate within 24h.', reward: 0.80, rewardType: 'main', isActive: true, totalCompletions: 0, createdAt: new Date(Date.now() - 1 * 86400000).toISOString(), verificationMethod: 'manual', priority: 9, isPromoTask: true, icon: '📢', createdByUserId: 'platform' },
  { id: '7', type: 'watch_video', title: 'Watch our YouTube video', description: 'Watch the video for at least 20 seconds to validate', reward: 0.002, rewardType: 'main', targetUrl: '', isActive: false, totalCompletions: 0, maxCompletions: 500, createdAt: new Date(Date.now() - 4 * 86400000).toISOString(), verificationMethod: 'auto', priority: 6, icon: '▶️', createdByUserId: 'platform' },
  { id: '8', type: 'social', title: 'Follow us on X (Twitter)', description: 'Follow our official X account and stay up to date with the latest news', reward: 0.002, rewardType: 'main', targetUrl: '', isActive: false, totalCompletions: 0, maxCompletions: 800, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), verificationMethod: 'auto', priority: 4, icon: '🐦', createdByUserId: 'platform' },
  { id: '9', type: 'social', title: 'Follow us on Instagram', description: 'Follow our Instagram account to see our latest posts', reward: 0.002, rewardType: 'main', targetUrl: '', isActive: false, totalCompletions: 0, maxCompletions: 800, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), verificationMethod: 'auto', priority: 3, icon: '📸', createdByUserId: 'platform' },
  { id: '10', type: 'social', title: 'Follow us on TikTok', description: 'Subscribe to our TikTok and watch our exclusive videos', reward: 0.002, rewardType: 'main', targetUrl: '', isActive: false, totalCompletions: 0, maxCompletions: 800, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), verificationMethod: 'auto', priority: 2, icon: '🎵', createdByUserId: 'platform' },
];
// Merge saved tasks (user/admin-created) with defaults; defaults fill any missing IDs
const mockTasks: Task[] = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem('tc_tasks') || '[]') as Task[];
    if (saved.length === 0) return _defaultTasks;
    const defaultMap = new Map(_defaultTasks.map(t => [t.id, t]));
    const savedIds = new Set(saved.map((t: Task) => t.id));
    const missingDefaults = _defaultTasks.filter(t => !savedIds.has(t.id));
    const merged = saved.map((t: Task) => {
      const def = defaultMap.get(t.id);
      if (def && t.createdByUserId === 'platform') return { ...t, reward: def.reward };
      return t;
    });
    return [...merged, ...missingDefaults];
  } catch { return _defaultTasks; }
})();

const _defaultPromoCodes: PromoCode[] = [
  { id: '1', code: 'LAUNCH50', reward: 0.50, currency: 'main', maxUses: 500, currentUses: 127, isActive: true, description: 'Official launch code', createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: '2', code: 'VIP200', reward: 2.00, currency: 'main', maxUses: 20, currentUses: 3, isActive: true, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), description: 'Exclusive VIP code — 7 days', createdAt: new Date().toISOString() },
];
const mockPromoCodes: PromoCode[] = _savedPromoCodes.length > 0 ? _savedPromoCodes : _defaultPromoCodes;

const mockTaskSubmissions: TaskSubmission[] = [];

const mockTransactions: Transaction[] = _savedTransactions;

const mockCampaigns: Campaign[] = _savedCampaigns;

const mockChannels: Channel[] = _savedChannels;

const mockShopItems: ShopItem[] = _savedShopItems;

const mockNotifications: Notification[] = _savedNotifications;

const mockFraudAlerts: FraudAlert[] = [];

const mockCryptoNetworks: CryptoNetwork[] = [
  { id: '1', name: 'Toncoin', symbol: 'TON', network: 'TON', isActive: true, isDepositEnabled: true, isWithdrawalEnabled: true, minDeposit: 1, maxDeposit: 10000, minWithdrawal: 0.1, maxWithdrawal: 5000, withdrawalFee: 0.02, withdrawalFeeType: 'fixed', requiredConfirmations: 12, dailyWithdrawalLimit: 10000, autoWithdrawal: true, autoWithdrawalThreshold: 100, hotWalletBalance: 0, coldWalletBalance: 0, hotWalletAddress: 'UQDCLLOiZ8_KzB_lJXPaTuinjyEemjbnzS3-VAZD6fU-Rp2S', coldWalletAddress: '', explorerUrl: 'https://tonscan.org/tx/', decimals: 9, priority: 1 },
  { id: '2', name: 'Tether USD (TON)', symbol: 'USDT', network: 'TON', isActive: true, isDepositEnabled: true, isWithdrawalEnabled: true, minDeposit: 5, maxDeposit: 50000, minWithdrawal: 10, maxWithdrawal: 25000, withdrawalFee: 1.0, withdrawalFeeType: 'fixed', requiredConfirmations: 12, dailyWithdrawalLimit: 50000, autoWithdrawal: false, autoWithdrawalThreshold: 500, hotWalletBalance: 0, coldWalletBalance: 0, hotWalletAddress: 'UQDCLLOiZ8_KzB_lJXPaTuinjyEemjbnzS3-VAZD6fU-Rp2S', coldWalletAddress: '', explorerUrl: 'https://tonscan.org/tx/', decimals: 6, contractAddress: '0:b113a994b5024a16719f69139328eb759596c38a25f5972a7e5b7892d4b7a09e', priority: 2 },
];

const mockLevelConfigs: LevelConfig[] = [
  { level: 1, xpRequired: 0, title: 'Beginner', color: '#94a3b8', reward: 0, rewardType: 'main', unlocks: [] },
  { level: 2, xpRequired: 100, title: 'Novice', color: '#94a3b8', reward: 0.50, rewardType: 'main', unlocks: ['daily_task'] },
  { level: 3, xpRequired: 300, title: 'Apprentice', color: '#22c55e', reward: 1.00, rewardType: 'main', unlocks: ['referral'] },
  { level: 5, xpRequired: 800, title: 'Explorer', color: '#22c55e', reward: 2.00, rewardType: 'main', unlocks: ['special_tasks'] },
  { level: 10, xpRequired: 2500, title: 'Advanced', color: '#3b82f6', reward: 5.00, rewardType: 'main', unlocks: ['premium_tasks'], badge: 'level_10' },
  { level: 15, xpRequired: 5000, title: 'Expert', color: '#8b5cf6', reward: 10.00, rewardType: 'main', unlocks: ['vip_tasks'], badge: 'level_15' },
  { level: 20, xpRequired: 10000, title: 'Master', color: '#f59e0b', reward: 25.00, rewardType: 'main', unlocks: ['master_badge'], badge: 'level_20' },
  { level: 25, xpRequired: 20000, title: 'Legend', color: '#ef4444', reward: 50.00, rewardType: 'main', unlocks: ['legend_badge'], badge: 'level_25' },
];

const mockBadgeConfigs: BadgeConfig[] = [
  { id: '1', name: 'Early Adopter', description: 'Registered among the first 100', icon: '🌟', condition: 'first_100_users', conditionType: 'special', conditionValue: 100, reward: 5.00, isActive: true },
  { id: '2', name: 'Task Master', description: '100+ tasks completed', icon: '🎯', condition: 'tasks_completed', conditionType: 'tasks', conditionValue: 100, reward: 10.00, isActive: true },
  { id: '3', name: 'Referral King', description: '20+ active referrals', icon: '👑', condition: 'referral_count', conditionType: 'referrals', conditionValue: 20, reward: 15.00, isActive: true },
  { id: '4', name: 'Whale', description: '$1000+ in total deposits', icon: '🐋', condition: 'total_deposits', conditionType: 'deposit', conditionValue: 1000, reward: 25.00, isActive: true },
  { id: '5', name: 'Streak Champion', description: '14+ consecutive days', icon: '🔥', condition: 'streak_days', conditionType: 'streak', conditionValue: 14, reward: 20.00, isActive: true },
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
  { id: '1', name: 'IP Duplicate Detection', type: 'ip_duplicate', isActive: true, threshold: 3, action: 'flag', severity: 'medium', description: 'Detects multiple accounts with the same IP' },
  { id: '2', name: 'Device Fingerprint Check', type: 'device_duplicate', isActive: true, threshold: 2, action: 'suspend', severity: 'high', description: 'Detects multiple accounts on the same device' },
  { id: '3', name: 'VPN/Proxy Detection', type: 'vpn', isActive: true, threshold: 1, action: 'flag', severity: 'medium', description: 'Detects VPN or proxy connections' },
  { id: '4', name: 'Referral Abuse', type: 'referral_abuse', isActive: true, threshold: 50, action: 'review', severity: 'high', description: 'Too many referrals in a short time' },
  { id: '5', name: 'Bot Behavior', type: 'behavior', isActive: true, threshold: 90, action: 'ban', severity: 'critical', description: 'Automated behavior detected' },
  { id: '6', name: 'Withdrawal Pattern', type: 'withdrawal_pattern', isActive: true, threshold: 5, action: 'block_withdrawal', severity: 'high', description: 'Suspicious withdrawal pattern' },
];

const mockMessageTemplates: MessageTemplate[] = [
  { id: '1', key: 'welcome', name: 'Welcome message', category: 'welcome', content: '👋 Welcome to TonCipher, {firstName}!\n\n🎁 Your welcome bonus: {welcomeBonus}$\n\n📱 Start earning now!', variables: ['firstName', 'welcomeBonus'], isActive: true },
  { id: '2', key: 'deposit_confirmed', name: 'Deposit confirmed', category: 'payment', content: '✅ Deposit confirmed!\n\n💰 Amount: {amount} {currency}\n🔗 TX: {txHash}\n\nYour new balance: {newBalance}$', variables: ['amount', 'currency', 'txHash', 'newBalance'], isActive: true },
  { id: '3', key: 'withdrawal_sent', name: 'Withdrawal sent', category: 'payment', content: '📤 Withdrawal sent!\n\n💰 Amount: {amount} {currency}\n📍 Address: {address}\n🔗 TX: {txHash}', variables: ['amount', 'currency', 'address', 'txHash'], isActive: true },
  { id: '4', key: 'task_completed', name: 'Task completed', category: 'task', content: '✅ Task completed!\n\n📋 {taskName}\n💰 Reward: +{reward}$\n⭐ XP: +{xp}', variables: ['taskName', 'reward', 'xp'], isActive: true },
  { id: '5', key: 'level_up', name: 'Level up', category: 'level', content: '🎉 Congratulations {firstName}!\n\n⬆️ You reached level {level}!\n🏆 Title: {levelTitle}\n💰 Bonus: +{reward}$', variables: ['firstName', 'level', 'levelTitle', 'reward'], isActive: true },
  { id: '6', key: 'referral_bonus', name: 'Referral bonus', category: 'referral', content: '👥 New referral!\n\n{referralName} signed up with your code!\n💰 Bonus: +{bonus}$', variables: ['referralName', 'bonus'], isActive: true },
];

const mockBotCommands: BotCommand[] = [
  { id: '1', command: '/start', description: 'Start the bot', response: '', isActive: true, requiresAdmin: false, category: 'general' },
  { id: '2', command: '/help', description: 'Show help', response: '📚 Available commands:\n\n/wallet - View your balance\n/tasks - View tasks\n/referral - Your referral link\n/withdraw - Make a withdrawal', isActive: true, requiresAdmin: false, category: 'general' },
  { id: '3', command: '/wallet', description: 'View balance', response: '', isActive: true, requiresAdmin: false, category: 'wallet' },
  { id: '4', command: '/tasks', description: 'View tasks', response: '', isActive: true, requiresAdmin: false, category: 'tasks' },
  { id: '5', command: '/referral', description: 'Referral link', response: '', isActive: true, requiresAdmin: false, category: 'referral' },
  { id: '6', command: '/withdraw', description: 'Make a withdrawal', response: '', isActive: true, requiresAdmin: false, category: 'wallet' },
  { id: '7', command: '/admin', description: 'Admin menu', response: '', isActive: true, requiresAdmin: true, category: 'admin' },
  { id: '8', command: '/broadcast', description: 'Send a message to everyone', response: '', isActive: true, requiresAdmin: true, category: 'admin' },
];

const mockWelcomeSteps: WelcomeStep[] = [
  { id: '1', order: 1, type: 'message', content: 'Welcome to TonCipher! 🚀', isRequired: true, isActive: true },
  { id: '2', order: 2, type: 'mandatory_join', content: 'Join our mandatory channels to continue', isRequired: true, isActive: true },
  { id: '3', order: 3, type: 'referral_check', content: 'Do you have a referral code?', isRequired: false, isActive: true },
  { id: '4', order: 4, type: 'wallet_create', content: 'Creating your wallet...', isRequired: true, isActive: true },
  { id: '5', order: 5, type: 'bonus', content: 'Here is your welcome bonus!', isRequired: false, isActive: true, bonus: 1.00 },
];

const mockWithdrawalRules: WithdrawalRule[] = [
  { id: '1', name: 'Minimum tasks', condition: 'min_tasks', value: 10, isActive: true, errorMessage: 'You must complete at least 10 tasks before withdrawing' },
  { id: '2', name: 'Minimum level', condition: 'min_level', value: 3, isActive: true, errorMessage: 'You must be at least level 3 to withdraw' },
  { id: '3', name: 'Account age', condition: 'account_age', value: 7, isActive: true, errorMessage: 'Your account must be at least 7 days old' },
  { id: '4', name: 'Verification required', condition: 'verification', value: 500, isActive: true, errorMessage: 'Verification required for withdrawals above $500' },
  { id: '5', name: 'No fraud', condition: 'no_fraud', value: 50, isActive: true, errorMessage: 'Your risk score is too high' },
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
  { id: '1', telegramId: 0, username: 'puriaryan', role: 'super_admin', permissions: ['*'], isActive: true, createdAt: new Date().toISOString() },
];

const _defaultReferralMilestones: ReferralMilestone[] = [
  { id: '1', referralCount: 5, reward: 2.00, description: 'Invite 5 friends', isActive: true },
  { id: '2', referralCount: 20, reward: 10.00, description: 'Invite 20 friends', isActive: true },
  { id: '3', referralCount: 50, reward: 30.00, description: 'Invite 50 friends', isActive: true },
  { id: '4', referralCount: 100, reward: 75.00, description: 'Invite 100 friends', isActive: true },
];
const mockReferralMilestones: ReferralMilestone[] = _savedReferralMilestones.length > 0 ? _savedReferralMilestones : _defaultReferralMilestones;

const _savedPlatformConfig: Partial<PlatformConfig> = (() => {
  try { return JSON.parse(localStorage.getItem('tc_platform_config') ?? '{}') as Partial<PlatformConfig>; }
  catch { return {}; }
})();

const mockPlatformConfig: PlatformConfig = {
  botToken: '',
  botUsername: 'TonCipher_bot',
  appShortName: 'app',
  apiId: '',
  apiHash: '',
  databaseUrl: '',
  mainChannel: '@toncipherofficial',
  mainGroup: '@TonCipher_Pays',
  supportBot: '@TonCipher_bot',
  announcementChannel: '@TonCipher_Official',
  mainWallet: '',
  hotWalletThreshold: 10000,
  coldWalletThreshold: 100000,
  referralBonusSignup: 0.005,
  referralBonusActivity: 0.10,
  referralBonusDeposit: 5.00,
  referralBonusDepositPercent: 5,
  referralLevels: 3,
  referralCodeLength: 8,
  referralLinkPrefix: 'https://t.me/TonCipher_bot/app?startapp=r_',
  xpPerTask: 10,
  xpPerReferral: 50,
  xpPerDeposit: 5,
  xpMultiplier: 1.0,
  maxLevel: 50,
  streakBonusPerDay: 0.05,
  streakMultiplier: 1.1,
  maxStreakBonus: 5.00,
  streakResetHours: 48,
  streakMilestones: [
    { day: 3,  bonus: 0.05 },
    { day: 7,  bonus: 0.15 },
    { day: 14, bonus: 0.30 },
    { day: 30, bonus: 1.00 },
  ],
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
  taskCreationFeeRate: 0.30,
  taskPricePerExecution: 0.003,
  taskMinExecutions: 100,
  taskMaxExecutions: 100000,
  depositBonusPercent: 5,
  firstDepositBonus: 10,
  minDepositForBonus: 50,
  maintenanceMode: false,
  maintenanceMessage: 'The bot is under maintenance. Please try again later.',
  registrationEnabled: true,
  welcomeBonusEnabled: false,
  welcomeBonusAmount: 0,
  adminNotifyDeposit: true,
  adminNotifyWithdrawal: true,
  adminNotifyFraud: true,
  adminNotifyNewUser: true,
  adminChatId: '-1001234567890',
  globalDailyWithdrawalLimit: 50000,
  globalDailyDepositLimit: 100000,
  maxPendingWithdrawals: 100,
  promoEvent: null,
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
  lastSyncedReferralBalance: number;
  activeBoosters: { multiplier: number; expiresAt: string }[];
  referralBoostExpiresAt: string | null;

  // Demo / Jeu
  demoMode: boolean;
  demoBalance: number;
  gameHistory: GameResult[];
  toggleDemoMode: () => void;
  recordGameResult: (game: string, bet: number, win: number) => void;

  // Actions - Mini App
  confirmDeposit: (txId: string, txHash: string) => void;
  creditDeposit: (userId: string, amount: number, currency: string, txHash: string, network: string) => void;
  resetDailyTasks: () => void;
  resetDailyRefTask: () => void;
  checkLoginStreak: () => void;
  completeTask: (taskId: string) => void;
  completeTaskSecure: (taskId: string) => Promise<{ success: boolean; earned?: number; error?: string }>;
  creditReferralBonus: (earned: number) => void;
  submitWithdrawal: (networkId: string, amount: number, address: string) => Promise<{ success: boolean; error?: string }>;
  claimReferralMilestone: (id: string) => Promise<void>;
  addReferralMilestone: (milestone: Omit<ReferralMilestone, 'id'>) => void;
  updateReferralMilestone: (id: string, data: Partial<ReferralMilestone>) => void;
  deleteReferralMilestone: (id: string) => void;
  initFromTelegram: (user: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string }) => void;
  syncUserFromApi: (data: { referralCount: number; referralBalance: number; flagged: boolean; banned?: boolean; withdrawalBlocked?: boolean; claimedMilestoneIds?: string[] }) => void;
  adoptServerBalance: (data: { balance: number; totalEarnings: number; tasksCompleted: number; referralBalance: number; completedTaskIds: string[] }) => void;
  placeGameBet: (bet: number, win: number) => void;
  activatePromoEvent: (multiplier: number, hours: number, label: string) => void;
  deactivatePromoEvent: () => void;
  syncConfigFromBackend: () => Promise<void>;

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
  markAllNotificationsRead: () => void;
  addNotification: (n: Omit<Notification, 'id' | 'createdAt'>) => void;
  updatePlatformConfig: (data: Partial<PlatformConfig>) => void;
  addPlatformRevenue: (amount: number) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'createdAt'>) => void;

  redeemPromoCode: (code: string) => { success: boolean; error?: string; reward?: number };
  submitTaskProof: (taskId: string, proofText: string, imageBase64?: string) => { success: boolean; error?: string };
  reviewTaskSubmission: (submissionId: string, status: 'approved' | 'rejected', adminNote?: string) => void;
  addPromoCode: (code: Omit<PromoCode, 'id' | 'createdAt' | 'currentUses'>) => void;
  updatePromoCode: (id: string, data: Partial<PromoCode>) => void;
  deletePromoCode: (id: string) => void;
  buyShopItem: (itemId: string) => { success: boolean; error?: string };
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// Persist a platform-config key on the backend so every user's app sees it
// (the store itself is per-device; without this, admin changes stay local).
async function pushConfigToBackend(key: string, value: unknown): Promise<void> {
  try {
    const adminKey = getAdminKey();
    await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(adminKey ? { 'X-Admin-Key': adminKey } : {}) },
      body: JSON.stringify({ key, value }),
    });
  } catch { /* offline — config stays local-only */ }
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'miniapp',
  miniAppPage: 'dashboard',
  adminPage: 'overview',
  adminSidebarOpen: false,
  modalOpen: null,
  modalData: null,
  completedTaskIds: _savedCompleted,

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
  platformConfig: { ...mockPlatformConfig, ..._savedPlatformConfig },
  platformStats: mockStats,
  logs: mockLogs,
  referralMilestones: mockReferralMilestones,
  promoCodes: mockPromoCodes,
  taskSubmissions: mockTaskSubmissions,

  claimedReferralMilestoneIds: (() => { try { return JSON.parse(localStorage.getItem('tc_claimed_milestones') || '[]'); } catch { return []; } })(),
  usedPromoCodeIds: (() => { try { return JSON.parse(localStorage.getItem('tc_used_promos') || '[]'); } catch { return []; } })(),
  // Persisted across sessions — without this the full referral balance would
  // be re-credited as a "delta" on every app open (balance growing on its own).
  lastSyncedReferralBalance: _savedBalance.lastSyncedReferralBalance ?? 0,
  activeBoosters: _savedBoosters,
  referralBoostExpiresAt: _savedRefBoost,
  demoMode: false,
  demoBalance: 10.0,
  gameHistory: (() => { try { return JSON.parse(localStorage.getItem('tc_game_history') || '[]'); } catch { return []; } })(),

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
      title: 'Deposit confirmed! 🎉',
      message: `+${tx.amount.toFixed(2)} ${tx.currency} credited to your account.`,
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
      title: 'Deposit received! 🎉',
      message: `+${amount.toFixed(2)} ${currency} automatically credited.`,
      isRead: false,
    });
  },

  resetDailyTasks: () => set(s => ({
    completedTaskIds: s.completedTaskIds.filter(id => {
      const task = s.tasks.find(t => t.id === id);
      return task?.type !== 'daily';
    }),
    currentUser: { ...s.currentUser, dailyTasksCompleted: 0, dailyWithdrawn: 0 },
  })),

  resetDailyRefTask: () => set(s => {
    // Remove task '5' (Referral Challenge) from completedTaskIds so it can be reclaimed today
    const newCompleted = s.completedTaskIds.filter(id => id !== '5');
    localStorage.setItem('tc_completed_tasks', JSON.stringify(newCompleted));
    // New baseline = current lifetime count — today's count starts from 0
    localStorage.setItem('tc_ref_daily_baseline', String(s.currentUser.referralCount));
    return {
      completedTaskIds: newCompleted,
      currentUser: { ...s.currentUser, referralDailyCount: 0 },
      users: s.users.map(u => u.id === s.currentUser.id ? { ...u, referralDailyCount: 0 } : u),
    };
  }),

  checkLoginStreak: () => {
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = localStorage.getItem('tc_streak_date');
    if (lastDate === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newStreak = lastDate === yesterday ? (get().currentUser.loginStreak ?? 0) + 1 : 1;

    localStorage.setItem('tc_streak_date', today);

    set(s => ({
      currentUser: { ...s.currentUser, loginStreak: newStreak },
      users: s.users.map(u => u.id === s.currentUser.id ? { ...u, loginStreak: newStreak } : u),
    }));
  },

  completeTask: (taskId) => {
    const state = get();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || state.completedTaskIds.includes(taskId)) return;
    if (state.currentUser.dailyTasksCompleted >= state.platformConfig.maxDailyTasks) {
      get().addNotification({ userId: state.currentUser.id, type: 'system', title: 'Limit reached', message: `Maximum ${state.platformConfig.maxDailyTasks} tasks per day. Come back tomorrow!`, isRead: false });
      return;
    }
    const isPromoActive = task.promotion && new Date(task.promotion.endsAt) > new Date();
    const promoMult = isPromoActive ? task.promotion!.multiplier : 1;
    const now = new Date();
    const liveBoosts = state.activeBoosters.filter(b => new Date(b.expiresAt) > now);
    const boosterMult = liveBoosts.length > 0 ? Math.max(...liveBoosts.map(b => b.multiplier)) : 1;
    const eventPromo = state.platformConfig.promoEvent;
    const isEventActive = eventPromo?.active && new Date(eventPromo.endsAt) > now;
    const eventMult = isEventActive ? eventPromo!.multiplier : 1;
    const multiplier = promoMult * boosterMult * eventMult;
    const earned = task.reward * multiplier;
    const updatedUser = {
      balanceMain: state.currentUser.balanceMain + earned,
      tasksCompleted: state.currentUser.tasksCompleted + 1,
      dailyTasksCompleted: state.currentUser.dailyTasksCompleted + 1,
      todayEarnings: state.currentUser.todayEarnings + earned,
      totalEarnings: state.currentUser.totalEarnings + earned,
    };
    // Referral bonus: configurable % of task earnings credited to referrer
    const referralBonus = parseFloat((earned * (state.platformConfig.referralBonusDepositPercent / 100)).toFixed(6));
    const referrer = state.currentUser.referredBy
      ? state.users.find(u => u.referralCode === state.currentUser.referredBy && u.id !== state.currentUser.id)
      : null;
    set(s => ({
      completedTaskIds: [...s.completedTaskIds, taskId],
      tasks: s.tasks.map(t => t.id === taskId ? { ...t, totalCompletions: t.totalCompletions + 1 } : t),
      currentUser: { ...s.currentUser, ...updatedUser },
      users: s.users.map(u => {
        if (u.id === state.currentUser.id) return { ...u, ...updatedUser };
        if (referrer && u.id === referrer.id) return { ...u, balanceMain: u.balanceMain + referralBonus, totalEarnings: u.totalEarnings + referralBonus };
        return u;
      }),
    }));
    const rewardCurrency = task.rewardType === 'main' ? 'TON' : task.rewardType.toUpperCase();
    get().addTransaction({ userId: state.currentUser.id, type: 'reward', amount: earned, currency: rewardCurrency, status: 'completed', completedAt: new Date().toISOString() });
    const multLabel = multiplier > 1 ? ` (×${multiplier.toFixed(1)} boost!)` : '';
    get().addNotification({ userId: state.currentUser.id, type: 'reward', title: 'Task completed!', message: `+${earned.toFixed(2)} TON${multLabel} for "${task.title}"`, isRead: false });
  },

  completeTaskSecure: async (taskId) => {
    const state = get();
    const task  = state.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };
    if (state.completedTaskIds.includes(taskId)) return { success: false, error: 'Already completed' };

    const telegramId = state.currentUser.telegramId;
    // No Telegram context (local dev / mock) — fall back to client-only completion
    if (!telegramId) {
      get().completeTask(taskId);
      return { success: true, earned: task.reward };
    }

    const initData = (() => {
      try {
        return (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })
          .Telegram?.WebApp?.initData ?? '';
      } catch { return ''; }
    })();

    try {
      const res  = await fetch('/api/platform-tasks/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ telegramId, taskId, initData }),
      });
      const body = await res.json() as { success?: boolean; earned?: number; error?: string };
      if (!res.ok || !body.success) {
        return { success: false, error: body.error ?? `Error ${res.status}` };
      }
      const earned = typeof body.earned === 'number' ? body.earned : task.reward;
      // Apply local state — server already persisted the credit to app_balance
      set(s => ({
        completedTaskIds: [...s.completedTaskIds, taskId],
        tasks: s.tasks.map(t => t.id === taskId ? { ...t, totalCompletions: t.totalCompletions + 1 } : t),
        currentUser: {
          ...s.currentUser,
          balanceMain:         s.currentUser.balanceMain         + earned,
          tasksCompleted:      s.currentUser.tasksCompleted      + 1,
          dailyTasksCompleted: s.currentUser.dailyTasksCompleted + 1,
          todayEarnings:       s.currentUser.todayEarnings       + earned,
          totalEarnings:       s.currentUser.totalEarnings       + earned,
        },
      }));
      get().addTransaction({ userId: state.currentUser.id, type: 'reward', amount: earned, currency: 'GRAM', status: 'completed', completedAt: new Date().toISOString() });
      get().addNotification({ userId: state.currentUser.id, type: 'reward', title: 'Task completed!', message: `+${earned.toFixed(4)} GRAM for "${task.title}"`, isRead: false });
      get().creditReferralBonus(earned);
      return { success: true, earned };
    } catch {
      return { success: false, error: 'Serveur indisponible. Réessayez dans un instant.' };
    }
  },

  creditReferralBonus: (earned) => {
    const state = get();
    if (!state.currentUser.referredBy) return;
    const referrer = state.users.find(u => u.referralCode === state.currentUser.referredBy && u.id !== state.currentUser.id);
    if (!referrer) return;
    const bonus = parseFloat((earned * (state.platformConfig.referralBonusDepositPercent / 100)).toFixed(6));
    set(s => ({
      users: s.users.map(u => u.id === referrer.id
        ? { ...u, balanceMain: u.balanceMain + bonus, totalEarnings: u.totalEarnings + bonus }
        : u),
    }));
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

  // Restore state from the server-side backup (fresh device / cleared storage).
  // lastSyncedReferralBalance is set to the server's referralBalance so that
  // syncUserFromApi computes a zero delta — the adopted balance already
  // includes all past referral credits.
  adoptServerBalance: (data) => set(s => {
    const upd = {
      balanceMain:    data.balance,
      totalEarnings:  data.totalEarnings,
      tasksCompleted: data.tasksCompleted,
    };
    return {
      currentUser: { ...s.currentUser, ...upd },
      users: s.users.map(u => u.id === s.currentUser.id ? { ...u, ...upd } : u),
      lastSyncedReferralBalance: data.referralBalance,
      // Restoring completed tasks together with the balance prevents
      // re-farming one-time/daily tasks by clearing localStorage.
      completedTaskIds: Array.from(new Set([...s.completedTaskIds, ...data.completedTaskIds])),
    };
  }),

  syncUserFromApi: (data) => set(s => {
    const isRefBoostActive = s.referralBoostExpiresAt && new Date(s.referralBoostExpiresAt) > new Date();
    const refMult = isRefBoostActive ? 2 : 1;
    const delta = Math.max(0, data.referralBalance - s.lastSyncedReferralBalance) * refMult;
    // Daily referral count = total count minus the baseline recorded at the last 1am reset
    const refDailyBaseline = parseInt(localStorage.getItem('tc_ref_daily_baseline') ?? '0', 10);
    const referralDailyCount = Math.max(0, data.referralCount - refDailyBaseline);
    const updatedUser = {
      ...s.currentUser,
      referralCount:      data.referralCount,
      referralDailyCount,
      balanceMain:        s.currentUser.balanceMain + delta,
      totalEarnings:      s.currentUser.totalEarnings + delta,
      todayEarnings:      s.currentUser.todayEarnings + delta,
      ...(data.banned             !== undefined && { status: data.banned ? 'banned' as const : s.currentUser.status }),
      ...(data.withdrawalBlocked  !== undefined && { withdrawalBlocked: data.withdrawalBlocked }),
    };
    const serverClaimed = data.claimedMilestoneIds ?? [];
    const mergedClaimed = serverClaimed.length > 0
      ? Array.from(new Set([...s.claimedReferralMilestoneIds, ...serverClaimed]))
      : s.claimedReferralMilestoneIds;
    if (mergedClaimed !== s.claimedReferralMilestoneIds) {
      try { localStorage.setItem('tc_claimed_milestones', JSON.stringify(mergedClaimed)); } catch { /* noop */ }
    }
    return {
      currentUser: updatedUser,
      users: s.users.map(u => u.id === s.currentUser.id ? updatedUser : u),
      lastSyncedReferralBalance: data.referralBalance,
      claimedReferralMilestoneIds: mergedClaimed,
    };
  }),

  claimReferralMilestone: async (id) => {
    const state = get();
    if (state.claimedReferralMilestoneIds.includes(id)) return;
    const milestone = state.referralMilestones.find(m => m.id === id);
    if (!milestone || !milestone.isActive) return;
    if (state.currentUser.referralCount < milestone.referralCount) return;

    // Dev mode (telegramId 0): skip server, apply locally
    if (state.currentUser.telegramId === 0) {
      const reward = milestone.reward;
      const newIds = [...state.claimedReferralMilestoneIds, id];
      localStorage.setItem('tc_claimed_milestones', JSON.stringify(newIds));
      set(s => ({
        claimedReferralMilestoneIds: newIds,
        currentUser: { ...s.currentUser, balanceMain: s.currentUser.balanceMain + reward, totalEarnings: s.currentUser.totalEarnings + reward },
        users: s.users.map(u => u.id === state.currentUser.id ? { ...u, balanceMain: u.balanceMain + reward, totalEarnings: u.totalEarnings + reward } : u),
      }));
      get().addTransaction({ userId: state.currentUser.id, type: 'reward', amount: reward, currency: 'TON', status: 'completed', completedAt: new Date().toISOString() });
      return;
    }

    const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })?.Telegram?.WebApp?.initData ?? '';
    try {
      const res = await fetch('/api/referral/milestone/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: state.currentUser.telegramId, milestoneId: id, initData }),
      });
      const body = await res.json() as { success?: boolean; reward?: number; newBalance?: number; error?: string };
      if (!res.ok || !body.success) return;

      const reward = body.reward ?? milestone.reward;
      const newIds = [...get().claimedReferralMilestoneIds, id];
      localStorage.setItem('tc_claimed_milestones', JSON.stringify(newIds));
      set(s => {
        const updatedUser = {
          ...s.currentUser,
          balanceMain:   typeof body.newBalance === 'number' ? body.newBalance : s.currentUser.balanceMain + reward,
          totalEarnings: s.currentUser.totalEarnings + reward,
        };
        return {
          claimedReferralMilestoneIds: newIds,
          currentUser: updatedUser,
          users: s.users.map(u => u.id === state.currentUser.id ? { ...u, ...updatedUser } : u),
        };
      });
      get().addTransaction({ userId: state.currentUser.id, type: 'reward', amount: reward, currency: 'TON', status: 'completed', completedAt: new Date().toISOString() });
    } catch { /* server unavailable — silently skip */ }
  },

  submitWithdrawal: async (networkId, amount, address) => {
    const state = get();
    if (state.currentUser.status !== 'active') return { success: false, error: 'Account suspended or banned. Contact support.' };
    if (state.currentUser.withdrawalBlocked) return { success: false, error: 'Withdrawals blocked on this account. Contact support.' };
    const network = state.cryptoNetworks.find(n => n.id === networkId);
    if (!network) return { success: false, error: 'Invalid network' };
    if (!network.isWithdrawalEnabled) return { success: false, error: 'Withdrawals disabled for this network' };
    if (amount < network.minWithdrawal) return { success: false, error: `Minimum: ${network.minWithdrawal} ${network.symbol}` };
    if (amount > network.maxWithdrawal) return { success: false, error: `Maximum: ${network.maxWithdrawal} ${network.symbol}` };
    if (state.currentUser.balanceMain < amount) return { success: false, error: 'Insufficient balance' };
    const maxWithdrawable = state.currentUser.balanceMain - state.currentUser.taskCredits;
    if (amount > maxWithdrawable) {
      return { success: false, error: `${state.currentUser.taskCredits.toFixed(2)} GRAM are reserved for campaign creation and cannot be withdrawn.` };
    }
    if (!address || address.trim().length < 20) return { success: false, error: 'Invalid address (too short)' };
    const perUserDailyLimit = state.dailyLimits.find(l => l.type === 'withdrawal' && l.perUser && l.isActive);
    if (perUserDailyLimit && state.currentUser.dailyWithdrawn + amount > perUserDailyLimit.limit) {
      const remaining = Math.max(0, perUserDailyLimit.limit - state.currentUser.dailyWithdrawn);
      return { success: false, error: `Daily limit reached. Remaining: ${remaining.toFixed(2)} ${network.symbol}` };
    }
    if (network.dailyWithdrawalLimit > 0 && amount > network.dailyWithdrawalLimit) {
      return { success: false, error: `Network limit exceeded: max ${network.dailyWithdrawalLimit} ${network.symbol}/day` };
    }
    const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })?.Telegram?.WebApp?.initData ?? '';
    try {
      const res = await fetch('/api/withdrawal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: state.currentUser.telegramId,
          username: state.currentUser.username,
          firstName: state.currentUser.firstName,
          amount,
          currency: network.symbol,
          network: network.network,
          address: address.trim(),
          fee: network.withdrawalFee,
          initData,
        }),
      });
      const body = await res.json() as { success?: boolean; id?: string; error?: string };
      if (!res.ok || !body.success) {
        return { success: false, error: body.error ?? `Error ${res.status}` };
      }
      const serverTxId = body.id!;
      set(s => ({
        currentUser: {
          ...s.currentUser,
          balanceMain: s.currentUser.balanceMain - amount,
          dailyWithdrawn: s.currentUser.dailyWithdrawn + amount,
        },
        users: s.users.map(u => u.id === state.currentUser.id
          ? { ...u, balanceMain: u.balanceMain - amount, dailyWithdrawn: u.dailyWithdrawn + amount }
          : u),
        transactions: [{
          id: serverTxId,
          userId: state.currentUser.id,
          type: 'withdrawal' as const,
          amount,
          currency: network.symbol,
          network: network.network,
          address: address.trim(),
          status: 'pending' as const,
          fee: network.withdrawalFee,
          createdAt: new Date().toISOString(),
        }, ...s.transactions],
      }));
      return { success: true };
    } catch {
      return { success: false, error: 'Serveur indisponible. Réessayez.' };
    }
  },

  toggleDemoMode: () => set(s => {
    const turningOn = !s.demoMode;
    return {
      demoMode: turningOn,
      demoBalance: turningOn && s.demoBalance < 0.5 ? 10.0 : s.demoBalance,
    };
  }),

  placeGameBet: (bet, win) => {
    // Sanity guard: NaN/Infinity would silently corrupt the persisted balance
    if (!Number.isFinite(bet) || !Number.isFinite(win) || bet < 0 || win < 0) return;
    if (win > bet * 10_000) return; // implausible win — guard against overflow
    set(s => {
      if (s.demoMode) {
        // En mode démo : ne toucher que demoBalance
        const nb = +(Math.max(0, s.demoBalance - bet + win)).toFixed(6);
        return { demoBalance: nb < 0.05 ? 10.0 : nb }; // recharge auto si presque vide
      }
      // Guard: can't bet more than current balance (prevents overdraft from stale closures)
      const safeBet = Math.min(bet, s.currentUser.balanceMain);
      const newBalance = +(Math.max(0, s.currentUser.balanceMain - safeBet + win)).toFixed(6);
      const updatedUser = { ...s.currentUser, balanceMain: newBalance };
      try {
        const saved = JSON.parse(localStorage.getItem('tc_balance') || '{}') as Record<string, number>;
        localStorage.setItem('tc_balance', JSON.stringify({ ...saved, balanceMain: newBalance }));
      } catch { /* noop */ }
      return {
        currentUser: updatedUser,
        users: s.users.map(u => u.id === s.currentUser.id ? { ...u, ...updatedUser } : u),
      };
    });
  },

  recordGameResult: (game, bet, win) => {
    const state = get();
    set(s => {
      if (s.demoMode) return {};
      const entry: GameResult = { game, bet, win, ts: Date.now() };
      const updated = [entry, ...s.gameHistory].slice(0, 50);
      try { localStorage.setItem('tc_game_history', JSON.stringify(updated)); } catch { /* noop */ }
      return { gameHistory: updated };
    });
    // Report result to server for validation and balance update.
    // Skipped in demo mode and for dev accounts (telegramId === 0).
    if (!state.demoMode && state.currentUser.telegramId !== 0) {
      const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })
        ?.Telegram?.WebApp?.initData ?? '';
      void fetch('/api/game/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: state.currentUser.telegramId,
          game,
          bet: +bet.toFixed(6),
          win: +win.toFixed(6),
          initData,
        }),
      }).then(async res => {
        if (!res.ok) return;
        const body = await res.json() as { success?: boolean; newBalance?: number };
        if (body.success && typeof body.newBalance === 'number') {
          // Correct local balance to match server-authoritative value
          set(s => {
            if (s.demoMode) return {};
            const updatedUser = { ...s.currentUser, balanceMain: body.newBalance! };
            try {
              const saved = JSON.parse(localStorage.getItem('tc_balance') || '{}') as Record<string, number>;
              localStorage.setItem('tc_balance', JSON.stringify({ ...saved, balanceMain: body.newBalance }));
            } catch { /* noop */ }
            return {
              currentUser: updatedUser,
              users: s.users.map(u => u.id === s.currentUser.id ? { ...u, ...updatedUser } : u),
            };
          });
        }
      }).catch(() => { /* server unavailable — local state already updated */ });
    }
  },

  activatePromoEvent: (multiplier, hours, label) => {
    const promoEvent = {
      active: true,
      multiplier,
      endsAt: new Date(Date.now() + hours * 3600000).toISOString(),
      label: label || `×${multiplier} sur toutes les tâches`,
    };
    set(s => ({ platformConfig: { ...s.platformConfig, promoEvent } }));
    void pushConfigToBackend('promoEvent', promoEvent);
  },

  deactivatePromoEvent: () => {
    set(s => ({ platformConfig: { ...s.platformConfig, promoEvent: null } }));
    void pushConfigToBackend('promoEvent', null);
  },

  syncConfigFromBackend: async () => {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) return;
      const cfg = await res.json() as Partial<PlatformConfig>;
      if (cfg && typeof cfg === 'object') {
        set(s => ({ platformConfig: { ...s.platformConfig, ...cfg } }));
      }
    } catch { /* offline — keep local defaults */ }
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
  addReferralMilestone: (milestone) => {
    set(s => {
      const updated = [...s.referralMilestones, { ...milestone, id: generateId() }].sort((a, b) => a.referralCount - b.referralCount);
      void pushConfigToBackend('referralMilestones', updated);
      return { referralMilestones: updated };
    });
  },
  updateReferralMilestone: (id, data) => {
    set(s => {
      const updated = s.referralMilestones.map(m => m.id === id ? { ...m, ...data } : m);
      void pushConfigToBackend('referralMilestones', updated);
      return { referralMilestones: updated };
    });
  },
  deleteReferralMilestone: (id) => {
    set(s => {
      const updated = s.referralMilestones.filter(m => m.id !== id);
      void pushConfigToBackend('referralMilestones', updated);
      return { referralMilestones: updated };
    });
  },

  // Others
  updateFraudAlert: (id, data) => set((s) => ({ fraudAlerts: s.fraudAlerts.map(a => a.id === id ? { ...a, ...data } : a) })),
  markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n) })),
  markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map(n => ({ ...n, isRead: true })) })),
  addNotification: (n) => set((s) => ({ notifications: [{ ...n, id: generateId(), createdAt: new Date().toISOString() }, ...s.notifications] })),
  updatePlatformConfig: (data) => {
    set((s) => ({ platformConfig: { ...s.platformConfig, ...data } }));
    // Push every changed key to the backend so all users get the update
    for (const [key, value] of Object.entries(data)) {
      void pushConfigToBackend(key, value);
    }
  },
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
    const newPromoIds = [...state.usedPromoCodeIds, promo.id];
    localStorage.setItem('tc_used_promos', JSON.stringify(newPromoIds));
    set(s => ({
      usedPromoCodeIds: [...s.usedPromoCodeIds, promo.id],
      promoCodes: s.promoCodes.map(p => p.id === promo.id ? { ...p, currentUses: p.currentUses + 1 } : p),
      currentUser: { ...s.currentUser, ...balanceUpdate },
      users: s.users.map(u => u.id === state.currentUser.id ? { ...u, ...balanceUpdate } : u),
    }));
    get().addTransaction({ userId: state.currentUser.id, type: 'bonus', amount: earned, currency: 'TON', status: 'completed', completedAt: new Date().toISOString() });
    get().addNotification({ userId: state.currentUser.id, type: 'reward', title: 'Code promo activé! 🎉', message: `+${earned.toFixed(2)} GRAM crédité via le code "${promo.code}".`, isRead: false });
    return { success: true, reward: earned };
  },

  submitTaskProof: (taskId, proofText, imageBase64) => {
    const state = get();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found.' };
    if (!proofText.trim() && !imageBase64) return { success: false, error: 'Add a screenshot or a description.' };
    const existing = state.taskSubmissions.find(s => s.taskId === taskId && s.userId === state.currentUser.id);
    if (existing?.status === 'pending') return { success: false, error: 'A submission is already pending validation.' };
    if (existing?.status === 'approved') return { success: false, error: 'Your proof has already been validated.' };
    set(s => ({
      taskSubmissions: [{
        id: generateId(),
        taskId,
        userId: state.currentUser.id,
        username: state.currentUser.username,
        proofText: proofText.trim(),
        proofImageBase64: imageBase64,
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
      get().addNotification({ userId: submission.userId, type: 'reward', title: 'Promo task approved! 🎉', message: `+${task.reward.toFixed(2)} GRAM credited for "${task.title}".`, isRead: false });
    } else if (status === 'rejected') {
      get().addNotification({ userId: submission.userId, type: 'alert', title: 'Proof rejected', message: `Your submission for "${task?.title}" was rejected.${adminNote ? ` Reason: ${adminNote}` : ''}`, isRead: false });
    }
  },

  addPromoCode: (code) => set((s) => ({ promoCodes: [...s.promoCodes, { ...code, id: generateId(), createdAt: new Date().toISOString(), currentUses: 0 }] })),
  updatePromoCode: (id, data) => set((s) => ({ promoCodes: s.promoCodes.map(p => p.id === id ? { ...p, ...data } : p) })),
  deletePromoCode: (id) => set((s) => ({ promoCodes: s.promoCodes.filter(p => p.id !== id) })),

  buyShopItem: (itemId) => {
    const state = get();
    const item = state.shopItems.find(i => i.id === itemId);
    if (!item || !item.isActive) return { success: false, error: 'Item not found.' };
    if (item.maxPurchases != null && item.purchases >= item.maxPurchases) return { success: false, error: 'Out of stock.' };
    if (state.currentUser.balanceMain < item.price) return { success: false, error: `Insufficient balance. Required: ${item.price.toFixed(2)} TON.` };

    const balanceUpdate: Partial<typeof state.currentUser> = { balanceMain: state.currentUser.balanceMain - item.price };
    if (item.type === 'task_credit') {
      balanceUpdate.taskCredits = state.currentUser.taskCredits + item.value;
    }

    const now = Date.now();
    const newBoosters = item.type === 'multiplier'
      ? [...state.activeBoosters.filter(b => new Date(b.expiresAt).getTime() > now),
         { multiplier: item.value, expiresAt: new Date(now + (item.duration ?? 6) * 3600000).toISOString() }]
      : state.activeBoosters;

    const newRefBoost = (item.type === 'special' && item.duration)
      ? new Date(now + item.duration * 3600000).toISOString()
      : state.referralBoostExpiresAt;

    set(s => ({
      currentUser: { ...s.currentUser, ...balanceUpdate },
      users: s.users.map(u => u.id === state.currentUser.id ? { ...u, ...balanceUpdate } : u),
      shopItems: s.shopItems.map(i => i.id === itemId ? { ...i, purchases: i.purchases + 1 } : i),
      activeBoosters: newBoosters,
      referralBoostExpiresAt: newRefBoost,
    }));
    get().addTransaction({ userId: state.currentUser.id, type: 'purchase', amount: item.price, currency: 'TON', status: 'completed', completedAt: new Date().toISOString() });
    const durationLabel = item.duration ? ` pour ${item.duration >= 24 ? `${item.duration / 24}j` : `${item.duration}h`}` : '';
    get().addNotification({ userId: state.currentUser.id, type: 'system', title: 'Achat effectué! ✅', message: `${item.icon} ${item.name} activé${durationLabel}.`, isRead: false });
    return { success: true };
  },
}));

// Debounced server-side backup of the balance — survives localStorage loss.
let _balancePushTimer: ReturnType<typeof setTimeout> | null = null;
let _lastPushedBalance = '';

function _getTgInitData(): string {
  try { return (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })?.Telegram?.WebApp?.initData ?? ''; }
  catch { return ''; }
}

useAppStore.subscribe((state) => {
  try {
    const u = state.currentUser;
    // v:1 — schema version for future migrations. completedTaskIds is a
    // redundant copy: if tc_completed_tasks is cleared, it restores from here.
    localStorage.setItem('tc_balance', JSON.stringify({
      v:              1,
      balanceMain:    u.balanceMain,
      totalEarnings:  u.totalEarnings,
      todayEarnings:  u.todayEarnings,
      tasksCompleted: u.tasksCompleted,
      taskCredits:    u.taskCredits,
      loginStreak:    u.loginStreak,
      lastSyncedReferralBalance: state.lastSyncedReferralBalance,
      completedTaskIds: state.completedTaskIds.slice(-300),
    }));
    localStorage.setItem('tc_platform_config', JSON.stringify(state.platformConfig));
    localStorage.setItem('tc_completed_tasks', JSON.stringify(state.completedTaskIds));
    localStorage.setItem('tc_tasks', JSON.stringify(state.tasks.slice(-500)));
    localStorage.setItem('tc_transactions', JSON.stringify(state.transactions.slice(-300)));
    localStorage.setItem('tc_notifications', JSON.stringify(state.notifications.slice(0, 50)));
    localStorage.setItem('tc_campaigns', JSON.stringify(state.campaigns.slice(-200)));
    localStorage.setItem('tc_channels', JSON.stringify(state.channels.slice(-200)));
    localStorage.setItem('tc_shop_items', JSON.stringify(state.shopItems.slice(-200)));
    localStorage.setItem('tc_promo_codes', JSON.stringify(state.promoCodes.slice(-200)));
    localStorage.setItem('tc_referral_milestones', JSON.stringify(state.referralMilestones));
    localStorage.setItem('tc_boosters', JSON.stringify(state.activeBoosters));
    if (state.referralBoostExpiresAt) {
      localStorage.setItem('tc_ref_boost', state.referralBoostExpiresAt);
    } else {
      localStorage.removeItem('tc_ref_boost');
    }

    // Push balance to the backend (debounced 3s, only when it actually changed)
    if (u.telegramId !== 0) {
      const snapshot = JSON.stringify({
        telegramId:     u.telegramId,
        balance:        +u.balanceMain.toFixed(6),
        totalEarnings:  +u.totalEarnings.toFixed(6),
        tasksCompleted: u.tasksCompleted,
        completedTasks: state.completedTaskIds.slice(-300),
      });
      if (snapshot !== _lastPushedBalance) {
        if (_balancePushTimer) clearTimeout(_balancePushTimer);
        _balancePushTimer = setTimeout(() => {
          _lastPushedBalance = snapshot;
          void fetch('/api/user/balance', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ ...JSON.parse(snapshot), initData: _getTgInitData() }),
          }).catch(() => {});
        }, 3000);
      }
    }
  } catch {}
});

// Flush any pending balance push when the page/WebView is closed.
// Uses sendBeacon when available (survives page teardown better than fetch).
try {
  window.addEventListener('beforeunload', () => {
    if (!_balancePushTimer) return;
    clearTimeout(_balancePushTimer);
    _balancePushTimer = null;
    const state = useAppStore.getState();
    const u = state.currentUser;
    if (u.telegramId === 0) return;
    const payload = JSON.stringify({
      telegramId:     u.telegramId,
      balance:        +u.balanceMain.toFixed(6),
      totalEarnings:  +u.totalEarnings.toFixed(6),
      tasksCompleted: u.tasksCompleted,
      completedTasks: state.completedTaskIds.slice(-300),
      initData:       _getTgInitData(),
    });
    _lastPushedBalance = JSON.stringify({
      telegramId: u.telegramId,
      balance: +u.balanceMain.toFixed(6),
      totalEarnings: +u.totalEarnings.toFixed(6),
      tasksCompleted: u.tasksCompleted,
      completedTasks: state.completedTaskIds.slice(-300),
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/user/balance', new Blob([payload], { type: 'application/json' }));
    } else {
      void fetch('/api/user/balance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    }
  });
} catch { /* SSR / non-browser env */ }
