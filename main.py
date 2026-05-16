import logging
import asyncio
import aiohttp
import sqlite3
import os
from datetime import datetime, timedelta
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    ReplyKeyboardMarkup, KeyboardButton,
    InlineKeyboardMarkup, InlineKeyboardButton
)
from aiogram.utils.keyboard import ReplyKeyboardBuilder, InlineKeyboardBuilder

# ============================================================
#  CONFIG
# ============================================================
BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_TOKEN_HERE")
ADMIN_ID = int(os.getenv("ADMIN_ID", "6339278677"))
ADMIN_WALLET = os.getenv("ADMIN_WALLET", "UQDCLLOiZ8_KzB_lJXPaTuinjyEemjbnzS3-VAZD6fU-Rp2S")

COMMISSION_RATE = 0.20       # 20% commission admin
REF_BONUS = 0.005            # TON par parrainage
DAILY_BONUS = 0.001          # TON daily bonus
MIN_WITHDRAW = 0.01          # TON minimum retrait
MAX_WITHDRAW = 10.0          # TON maximum retrait
TASK_REWARD = 0.001          # TON par tâche complétée
AD_PRICE_CHANNEL = 0.05      # Prix pub canal
AD_PRICE_GROUP = 0.03        # Prix pub groupe

REQUIRED_CHANNELS = ["@ApexCryptoHub1", "@TonEarnPayment"]
WITHDRAW_CHANNEL = "@TonEarnPayment"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================
#  DATABASE
# ============================================================
def init_db():
    conn = sqlite3.connect("tonciper.db")
    c = conn.cursor()

    c.execute("""CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        balance REAL DEFAULT 0,
        ad_balance REAL DEFAULT 0,
        ref_count INTEGER DEFAULT 0,
        referred_by INTEGER DEFAULT 0,
        ref_bonus_given INTEGER DEFAULT 0,
        wallet TEXT DEFAULT NULL,
        is_banned INTEGER DEFAULT 0,
        last_daily TEXT DEFAULT NULL,
        joined_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        name TEXT,
        username TEXT,
        link TEXT,
        reward REAL DEFAULT 0.001,
        owner_id INTEGER,
        is_active INTEGER DEFAULT 0,
        completions INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS task_completions (
        user_id INTEGER,
        task_id INTEGER,
        completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, task_id)
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        amount REAL,
        wallet TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        amount REAL,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS promo_codes (
        code TEXT PRIMARY KEY,
        amount REAL,
        uses_left INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS used_promos (
        user_id INTEGER,
        code TEXT,
        PRIMARY KEY (user_id, code)
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )""")

    # Paramètres par défaut
    defaults = [
        ("ref_bonus", str(REF_BONUS)),
        ("daily_bonus", str(DAILY_BONUS)),
        ("min_withdraw", str(MIN_WITHDRAW)),
        ("max_withdraw", str(MAX_WITHDRAW)),
        ("withdraw_enabled", "1"),
        ("task_reward", str(TASK_REWARD)),
        ("ad_price_channel", str(AD_PRICE_CHANNEL)),
        ("ad_price_group", str(AD_PRICE_GROUP)),
    ]
    for key, val in defaults:
        c.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, val))

    conn.commit()
    conn.close()

def get_db():
    return sqlite3.connect("tonciper.db")

def get_setting(key):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT value FROM settings WHERE key=?", (key,))
    row = c.fetchone()
    conn.close()
    return row[0] if row else None

def set_setting(key, value):
    conn = get_db()
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
    conn.commit()
    conn.close()

def get_user(user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE user_id=?", (user_id,))
    row = c.fetchone()
    conn.close()
    return row

def create_user(user_id, username, first_name):
    conn = get_db()
    c = conn.cursor()
    c.execute("""INSERT OR IGNORE INTO users 
        (user_id, username, first_name) VALUES (?, ?, ?)""",
        (user_id, username or "", first_name or "User"))
    conn.commit()
    conn.close()

def update_balance(user_id, amount):
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE users SET balance = balance + ? WHERE user_id=?", (amount, user_id))
    conn.commit()
    conn.close()

def update_ad_balance(user_id, amount):
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE users SET ad_balance = ad_balance + ? WHERE user_id=?", (amount, user_id))
    conn.commit()
    conn.close()

# ============================================================
#  FSM STATES
# ============================================================
class SetWallet(StatesGroup):
    waiting = State()

class WithdrawStates(StatesGroup):
    amount = State()

class AdminStates(StatesGroup):
    add_balance = State()
    broadcast = State()
    set_setting = State()
    ban_user = State()
    unban_user = State()
    create_promo = State()
    approve_deposit = State()
    reject_deposit = State()

class AdStates(StatesGroup):
    channel_info = State()
    group_info = State()

class DepositStates(StatesGroup):
    amount = State()

class PromoStates(StatesGroup):
    code = State()

# ============================================================
#  BOT & DISPATCHER
# ============================================================
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(storage=MemoryStorage())

# ============================================================
#  KEYBOARDS
# ============================================================
def main_keyboard(user_id: int):
    kb = ReplyKeyboardBuilder()
    kb.row(
        KeyboardButton(text="💻 Profile"),
        KeyboardButton(text="🗣️ Referral")
    )
    kb.row(
        KeyboardButton(text="📤 Withdraw"),
        KeyboardButton(text="📊 Stats")
    )
    kb.row(
        KeyboardButton(text="🎁 Daily Bonus"),
        KeyboardButton(text="📋 Tasks")
    )
    kb.row(
        KeyboardButton(text="🎟️ Promo Code"),
        KeyboardButton(text="💼 Advertise")
    )
    kb.row(
        KeyboardButton(text="💳 Deposit"),
        KeyboardButton(text="🏆 Leaderboard")
    )
    if user_id == ADMIN_ID:
        kb.row(KeyboardButton(text="🛡️ Admin Panel"))
    return kb.as_markup(resize_keyboard=True)

def join_keyboard():
    kb = InlineKeyboardBuilder()
    for ch in REQUIRED_CHANNELS:
        kb.row(InlineKeyboardButton(
            text=f"📢 Join {ch}",
            url=f"https://t.me/{ch.replace('@', '')}"
        ))
    kb.row(InlineKeyboardButton(text="✅ I Joined", callback_data="check_join"))
    return kb.as_markup()

def cancel_keyboard():
    kb = ReplyKeyboardBuilder()
    kb.row(KeyboardButton(text="❌ Cancel"))
    return kb.as_markup(resize_keyboard=True)

def admin_keyboard():
    kb = ReplyKeyboardBuilder()
    kb.row(
        KeyboardButton(text="📊 Bot Stats"),
        KeyboardButton(text="👥 Users")
    )
    kb.row(
        KeyboardButton(text="💰 Add Balance"),
        KeyboardButton(text="📢 Broadcast")
    )
    kb.row(
        KeyboardButton(text="⚙️ Settings"),
        KeyboardButton(text="🎟️ Create Promo")
    )
    kb.row(
        KeyboardButton(text="🚫 Ban User"),
        KeyboardButton(text="✅ Unban User")
    )
    kb.row(
        KeyboardButton(text="📋 Pending Ads"),
        KeyboardButton(text="💳 Pending Deposits")
    )
    kb.row(KeyboardButton(text="🏠 Main Menu"))
    return kb.as_markup(resize_keyboard=True)

def settings_keyboard():
    kb = ReplyKeyboardBuilder()
    kb.row(
        KeyboardButton(text="💰 Set Ref Bonus"),
        KeyboardButton(text="🎁 Set Daily Bonus")
    )
    kb.row(
        KeyboardButton(text="📉 Min Withdraw"),
        KeyboardButton(text="📈 Max Withdraw")
    )
    kb.row(
        KeyboardButton(text="🔄 Toggle Withdraw"),
        KeyboardButton(text="📢 Ad Prices")
    )
    kb.row(KeyboardButton(text="🔙 Back Admin"))
    return kb.as_markup(resize_keyboard=True)

# ============================================================
#  HELPERS
# ============================================================
async def check_membership(user_id: int) -> bool:
    for channel in REQUIRED_CHANNELS:
        try:
            member = await bot.get_chat_member(channel, user_id)
            if member.status in ["left", "kicked"]:
                return False
        except:
            return False
    return True

def get_rank(ref_count: int) -> str:
    if ref_count >= 100:
        return "💎 Diamond"
    elif ref_count >= 50:
        return "🥇 Gold"
    elif ref_count >= 20:
        return "🥈 Silver"
    elif ref_count >= 5:
        return "🥉 Bronze"
    else:
        return "🌱 Starter"

def get_total_stats():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM users")
    total_users = c.fetchone()[0]
    c.execute("SELECT SUM(amount) FROM withdrawals WHERE status='approved'")
    total_withdrawn = c.fetchone()[0] or 0
    c.execute("SELECT SUM(amount) FROM deposits WHERE status='approved'")
    total_deposits = c.fetchone()[0] or 0
    c.execute("SELECT COUNT(*) FROM tasks WHERE is_active=1")
    active_tasks = c.fetchone()[0]
    conn.close()
    return total_users, total_withdrawn, total_deposits, active_tasks

# ============================================================
#  /START
# ============================================================
@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    username = message.from_user.username
    first_name = message.from_user.first_name

    create_user(user_id, username, first_name)

    user = get_user(user_id)
    if user and user[9] == 1:
        await message.answer("<b>🚫 You are banned from this bot.</b>", parse_mode="html")
        return

    # Gestion referral
    args = message.text.split()
    if len(args) > 1:
        try:
            referrer_id = int(args[1])
            if referrer_id != user_id:
                conn = get_db()
                c = conn.cursor()
                c.execute("SELECT referred_by, ref_bonus_given FROM users WHERE user_id=?", (user_id,))
                row = c.fetchone()
                if row and row[0] == 0:
                    ref_bonus = float(get_setting("ref_bonus"))
                    c.execute("UPDATE users SET referred_by=? WHERE user_id=?", (referrer_id, user_id))
                    c.execute("UPDATE users SET balance=balance+?, ref_count=ref_count+1 WHERE user_id=?",
                              (ref_bonus, referrer_id))
                    conn.commit()
                    await bot.send_message(
                        referrer_id,
                        f"<b>🎉 New Referral!\n\n💰 +{ref_bonus} TON added to your balance!\n👤 Someone joined using your link!</b>",
                        parse_mode="html"
                    )
                conn.close()
        except:
            pass

    is_member = await check_membership(user_id)
    if not is_member:
        await message.answer(
            "<b>🔍 Welcome to TonCipher!\n\nTo get started, please join our channels:</b>",
            parse_mode="html",
            reply_markup=join_keyboard()
        )
    else:
        await message.answer(
            f"<b>🏡 Welcome back, {first_name}!\n\n💎 Earn TON by completing tasks and inviting friends!</b>",
            parse_mode="html",
            reply_markup=main_keyboard(user_id)
        )

# ============================================================
#  CHECK JOIN CALLBACK
# ============================================================
@dp.callback_query(F.data == "check_join")
async def check_join(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    is_member = await check_membership(user_id)

    if is_member:
        await callback.message.delete()
        await callback.message.answer(
            "<b>✅ Welcome to TonCipher!\n\n💎 Earn TON by completing tasks and inviting friends!</b>",
            parse_mode="html",
            reply_markup=main_keyboard(user_id)
        )
    else:
        await callback.answer("❌ You haven't joined all channels yet!", show_alert=True)

# ============================================================
#  PROFILE
# ============================================================
@dp.message(F.text == "💻 Profile")
async def profile(message: types.Message):
    user_id = message.from_user.id
    user = get_user(user_id)
    if not user:
        return

    rank = get_rank(user[5])
    wallet = user[8] or "Not set"

    markup = InlineKeyboardBuilder()
    markup.row(InlineKeyboardButton(text="⚙️ Set Wallet", callback_data="set_wallet"))

    await message.answer(
        f"""<b>╔══════════════════╗
       💻 MY PROFILE
╚══════════════════╝

🆔 User: <a href='tg://user?id={user_id}'>{message.from_user.first_name}</a>
🏅 Rank: {rank}

💳 Balance: {user[3]:.4f} TON
💼 Ad Balance: {user[4]:.4f} TON
👥 Referrals: {user[5]} users

📝 Wallet: <code>{wallet}</code></b>""",
        parse_mode="html",
        reply_markup=markup.as_markup()
    )

@dp.callback_query(F.data == "set_wallet")
async def set_wallet_callback(callback: types.CallbackQuery, state: FSMContext):
    await callback.message.answer(
        "<b>📝 Send your TON wallet address:\n\nExample: <code>EQD...xyz</code></b>",
        parse_mode="html",
        reply_markup=cancel_keyboard()
    )
    await state.set_state(SetWallet.waiting)
    await callback.answer()

@dp.message(SetWallet.waiting)
async def save_wallet(message: types.Message, state: FSMContext):
    if message.text == "❌ Cancel":
        await state.clear()
        await message.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=main_keyboard(message.from_user.id))
        return

    address = message.text.strip()
    if len(address) < 10:
        await message.answer("<b>⚠️ Invalid address. Please try again.</b>", parse_mode="html")
        return

    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE users SET wallet=? WHERE user_id=?", (address, message.from_user.id))
    conn.commit()
    conn.close()

    await state.clear()
    await message.answer(
        f"<b>✅ Wallet saved!\n\n📝 <code>{address}</code></b>",
        parse_mode="html",
        reply_markup=main_keyboard(message.from_user.id)
    )

# ============================================================
#  REFERRAL
# ============================================================
@dp.message(F.text == "🗣️ Referral")
async def referral(message: types.Message):
    user_id = message.from_user.id
    user = get_user(user_id)
    if not user:
        return

    ref_bonus = get_setting("ref_bonus")
    bot_info = await bot.get_me()
    link = f"https://t.me/{bot_info.username}?start={user_id}"

    await message.answer(
        f"""<b>╔══════════════════╗
       🗣️ REFERRAL
╚══════════════════╝

💰 Per Referral: {ref_bonus} TON
👥 Your Referrals: {user[5]} users
💳 Your Balance: {user[3]:.4f} TON

🔗 Your Link:</b>
<code>{link}</code>

<i>Share your link and earn TON for every friend who joins! 🚀</i>""",
        parse_mode="html"
    )

# ============================================================
#  DAILY BONUS
# ============================================================
@dp.message(F.text == "🎁 Daily Bonus")
async def daily_bonus(message: types.Message):
    user_id = message.from_user.id
    user = get_user(user_id)
    if not user:
        return

    if user[9] == 1:
        await message.answer("<b>🚫 You are banned.</b>", parse_mode="html")
        return

    daily_amount = float(get_setting("daily_bonus"))
    last_claim = user[10]
    now = datetime.now()

    can_claim = True
    if last_claim:
        last_dt = datetime.fromisoformat(last_claim)
        diff = now - last_dt
        if diff.total_seconds() < 86400:
            can_claim = False
            remaining = 86400 - diff.total_seconds()
            hours = int(remaining // 3600)
            minutes = int((remaining % 3600) // 60)

    if can_claim:
        conn = get_db()
        c = conn.cursor()
        c.execute("UPDATE users SET balance=balance+?, last_daily=? WHERE user_id=?",
                  (daily_amount, now.isoformat(), user_id))
        conn.commit()
        conn.close()
        await message.answer(
            f"<b>🎁 Daily Bonus Claimed!\n\n💰 +{daily_amount} TON added!\n⏰ Come back in 24 hours!</b>",
            parse_mode="html"
        )
    else:
        await message.answer(
            f"<b>⏰ Already Claimed!\n\nNext bonus in: {hours}h {minutes}m\n💰 Daily Bonus: {daily_amount} TON</b>",
            parse_mode="html"
        )

# ============================================================
#  STATS
# ============================================================
@dp.message(F.text == "📊 Stats")
async def stats(message: types.Message):
    total_users, total_withdrawn, total_deposits, active_tasks = get_total_stats()
    ref_bonus = get_setting("ref_bonus")
    min_w = get_setting("min_withdraw")

    await message.answer(
        f"""<b>╔══════════════════╗
        📊 BOT STATS
╚══════════════════╝

👥 Total Users: {total_users}
📤 Total Withdrawn: {total_withdrawn:.4f} TON
💳 Total Deposits: {total_deposits:.4f} TON
📋 Active Tasks: {active_tasks}

💰 Per Referral: {ref_bonus} TON
📌 Min Withdraw: {min_w} TON</b>""",
        parse_mode="html"
    )

# ============================================================
#  LEADERBOARD
# ============================================================
@dp.message(F.text == "🏆 Leaderboard")
async def leaderboard(message: types.Message):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT first_name, ref_count FROM users ORDER BY ref_count DESC LIMIT 10")
    rows = c.fetchall()
    conn.close()

    medals = {0: "🥇", 1: "🥈", 2: "🥉"}
    if rows:
        text = "\n".join(
            f"{medals.get(i, f'{i+1}.')} {row[0]} — {row[1]} referrals"
            for i, row in enumerate(rows)
        )
    else:
        text = "No referrals yet. Be the first! 🚀"

    await message.answer(
        f"<b>╔══════════════════╗\n      🏆 LEADERBOARD\n╚══════════════════╝\n\n{text}\n\n<i>Invite more friends to climb the ranks!</i></b>",
        parse_mode="html"
    )

# ============================================================
#  WITHDRAW
# ============================================================
@dp.message(F.text == "📤 Withdraw")
async def withdraw_menu(message: types.Message, state: FSMContext):
    user_id = message.from_user.id
    user = get_user(user_id)
    if not user or user[9] == 1:
        await message.answer("<b>🚫 You are banned.</b>", parse_mode="html")
        return

    withdraw_enabled = get_setting("withdraw_enabled")
    if withdraw_enabled != "1":
        await message.answer("<b>⚠️ Withdrawals are currently disabled.</b>", parse_mode="html")
        return

    min_w = float(get_setting("min_withdraw"))
    max_w = float(get_setting("max_withdraw"))

    if not user[8]:
        markup = InlineKeyboardBuilder()
        markup.row(InlineKeyboardButton(text="⚙️ Set Wallet", callback_data="set_wallet"))
        await message.answer(
            "<b>⚠️ Please set your TON wallet first!</b>",
            parse_mode="html",
            reply_markup=markup.as_markup()
        )
        return

    if user[3] < min_w:
        await message.answer(
            f"<b>❌ Insufficient balance.\n\n💳 Your balance: {user[3]:.4f} TON\n📌 Minimum: {min_w} TON</b>",
            parse_mode="html"
        )
        return

    await message.answer(
        f"<b>💰 Enter amount to withdraw:\n\n📌 Min: {min_w} TON\n📌 Max: {max_w} TON\n💳 Your balance: {user[3]:.4f} TON</b>",
        parse_mode="html",
        reply_markup=cancel_keyboard()
    )
    await state.set_state(WithdrawStates.amount)

@dp.message(WithdrawStates.amount)
async def process_withdraw(message: types.Message, state: FSMContext):
    user_id = message.from_user.id

    if message.text == "❌ Cancel":
        await state.clear()
        await message.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=main_keyboard(user_id))
        return

    try:
        amount = float(message.text.strip())
    except:
        await message.answer("<b>⚠️ Invalid amount. Send a number like: 0.05</b>", parse_mode="html")
        return

    user = get_user(user_id)
    min_w = float(get_setting("min_withdraw"))
    max_w = float(get_setting("max_withdraw"))

    if amount < min_w:
        await message.answer(f"<b>⚠️ Minimum is {min_w} TON</b>", parse_mode="html")
        return
    if amount > max_w:
        await message.answer(f"<b>⚠️ Maximum is {max_w} TON</b>", parse_mode="html")
        return
    if amount > user[3]:
        await message.answer("<b>⚠️ Insufficient balance.</b>", parse_mode="html")
        return

    # Débiter et créer la demande
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE users SET balance=balance-? WHERE user_id=?", (amount, user_id))
    c.execute("INSERT INTO withdrawals (user_id, amount, wallet) VALUES (?, ?, ?)",
              (user_id, amount, user[8]))
    withdraw_id = c.lastrowid
    conn.commit()
    conn.close()

    await state.clear()
    await message.answer(
        f"""<b>⏳ Withdrawal Requested!

💵 Amount: {amount} TON
📝 Wallet: <code>{user[8]}</code>
🔍 Status: Pending

Admin will process soon.</b>""",
        parse_mode="html",
        reply_markup=main_keyboard(user_id)
    )

    markup = InlineKeyboardBuilder()
    markup.row(
        InlineKeyboardButton(text="✅ Approve", callback_data=f"approve_w_{withdraw_id}"),
        InlineKeyboardButton(text="❌ Reject", callback_data=f"reject_w_{withdraw_id}")
    )

    await bot.send_message(
        ADMIN_ID,
        f"""<b>📤 NEW WITHDRAWAL REQUEST #{withdraw_id}

👤 User: {message.from_user.first_name} ({user_id})
📝 Wallet: <code>{user[8]}</code>
💵 Amount: {amount} TON</b>""",
        parse_mode="html",
        reply_markup=markup.as_markup()
    )

@dp.callback_query(F.data.startswith("approve_w_"))
async def approve_withdrawal(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer("🚫 Access denied!", show_alert=True)
        return

    withdraw_id = int(callback.data.split("_")[2])
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM withdrawals WHERE id=?", (withdraw_id,))
    w = c.fetchone()

    if not w or w[4] != "pending":
        await callback.answer("⚠️ Already processed!", show_alert=True)
        conn.close()
        return

    c.execute("UPDATE withdrawals SET status='approved' WHERE id=?", (withdraw_id,))
    conn.commit()
    conn.close()

    await bot.send_message(
        w[1],
        f"""<b>✅ Withdrawal Approved!

💵 Amount: {w[2]} TON
📝 Wallet: <code>{w[3]}</code>
🔍 Status: Paid ✅

Thank you for using TonCipher! 🎉</b>""",
        parse_mode="html"
    )

    await bot.send_message(
        WITHDRAW_CHANNEL,
        f"""<b>✅ Withdrawal Confirmed!

🆔 User: {w[1]}
📝 Wallet: <code>{w[3]}</code>
💵 Amount: {w[2]} TON
🔍 Status: Paid ✅</b>""",
        parse_mode="html"
    )

    await callback.message.edit_text(
        callback.message.text + "\n\n<b>✅ APPROVED</b>",
        parse_mode="html"
    )
    await callback.answer("✅ Approved!")

@dp.callback_query(F.data.startswith("reject_w_"))
async def reject_withdrawal(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer("🚫 Access denied!", show_alert=True)
        return

    withdraw_id = int(callback.data.split("_")[2])
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM withdrawals WHERE id=?", (withdraw_id,))
    w = c.fetchone()

    if not w or w[4] != "pending":
        await callback.answer("⚠️ Already processed!", show_alert=True)
        conn.close()
        return

    c.execute("UPDATE withdrawals SET status='rejected' WHERE id=?", (withdraw_id,))
    c.execute("UPDATE users SET balance=balance+? WHERE user_id=?", (w[2], w[1]))
    conn.commit()
    conn.close()

    await bot.send_message(
        w[1],
        f"""<b>❌ Withdrawal Rejected

💵 {w[2]} TON returned to your balance.
🔍 Status: Cancelled

Contact support if needed.</b>""",
        parse_mode="html"
    )

    await callback.message.edit_text(
        callback.message.text + "\n\n<b>❌ REJECTED</b>",
        parse_mode="html"
    )
    await callback.answer("❌ Rejected!")

# ============================================================
#  TASKS
# ============================================================
@dp.message(F.text == "📋 Tasks")
async def tasks_menu(message: types.Message):
    kb = ReplyKeyboardBuilder()
    kb.row(
        KeyboardButton(text="📢 Channel Tasks"),
        KeyboardButton(text="👥 Group Tasks")
    )
    kb.row(KeyboardButton(text="🏠 Main Menu"))

    await message.answer(
        "<b>📋 TASKS CENTER\n\n📢 Channel Tasks — Join channels\n👥 Group Tasks — Join groups\n\n💰 Earn TON for each task completed!</b>",
        parse_mode="html",
        reply_markup=kb.as_markup(resize_keyboard=True)
    )

@dp.message(F.text == "📢 Channel Tasks")
async def channel_tasks(message: types.Message):
    user_id = message.from_user.id
    conn = get_db()
    c = conn.cursor()
    c.execute("""SELECT t.* FROM tasks t
        WHERE t.type='channel' AND t.is_active=1
        AND t.id NOT IN (
            SELECT task_id FROM task_completions WHERE user_id=?
        )""", (user_id,))
    tasks = c.fetchall()
    conn.close()

    if not tasks:
        await message.answer("<b>📢 No channel tasks available.\n\nCheck back later!</b>", parse_mode="html")
        return

    task = tasks[0]
    markup = InlineKeyboardBuilder()
    markup.row(InlineKeyboardButton(text=f"📢 Join {task[2]}", url=task[4]))
    markup.row(InlineKeyboardButton(text="✅ Verify", callback_data=f"verify_task_{task[0]}"))

    await message.answer(
        f"""<b>📢 CHANNEL TASK #{task[0]}

📌 Name: {task[2]}
💰 Reward: {task[5]} TON

1. Click Join button
2. Click Verify to claim reward</b>""",
        parse_mode="html",
        reply_markup=markup.as_markup()
    )

@dp.message(F.text == "👥 Group Tasks")
async def group_tasks(message: types.Message):
    user_id = message.from_user.id
    conn = get_db()
    c = conn.cursor()
    c.execute("""SELECT t.* FROM tasks t
        WHERE t.type='group' AND t.is_active=1
        AND t.id NOT IN (
            SELECT task_id FROM task_completions WHERE user_id=?
        )""", (user_id,))
    tasks = c.fetchall()
    conn.close()

    if not tasks:
        await message.answer("<b>👥 No group tasks available.\n\nCheck back later!</b>", parse_mode="html")
        return

    task = tasks[0]
    markup = InlineKeyboardBuilder()
    markup.row(InlineKeyboardButton(text=f"👥 Join {task[2]}", url=task[4]))
    markup.row(InlineKeyboardButton(text="✅ Verify", callback_data=f"verify_task_{task[0]}"))

    await message.answer(
        f"""<b>👥 GROUP TASK #{task[0]}

📌 Name: {task[2]}
💰 Reward: {task[5]} TON

1. Click Join button
2. Click Verify to claim reward</b>""",
        parse_mode="html",
        reply_markup=markup.as_markup()
    )

@dp.callback_query(F.data.startswith("verify_task_"))
async def verify_task(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    task_id = int(callback.data.split("_")[2])

    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT * FROM task_completions WHERE user_id=? AND task_id=?", (user_id, task_id))
    if c.fetchone():
        await callback.answer("✅ Already completed!", show_alert=True)
        conn.close()
        return

    c.execute("SELECT * FROM tasks WHERE id=?", (task_id,))
    task = c.fetchone()
    if not task:
        await callback.answer("⚠️ Task not found!", show_alert=True)
        conn.close()
        return

    try:
        member = await bot.get_chat_member(task[3], user_id)
        is_member = member.status not in ["left", "kicked"]
    except:
        is_member = False

    if is_member:
        reward = task[5]
        c.execute("INSERT INTO task_completions (user_id, task_id) VALUES (?, ?)", (user_id, task_id))
        c.execute("UPDATE users SET balance=balance+? WHERE user_id=?", (reward, user_id))
        c.execute("UPDATE tasks SET completions=completions+1 WHERE id=?", (task_id,))

        # Débiter l'annonceur
        if task[6]:
            c.execute("UPDATE users SET ad_balance=ad_balance-? WHERE user_id=?", (reward, task[6]))

        conn.commit()
        conn.close()

        await callback.answer(f"✅ +{reward} TON added!", show_alert=True)
        await callback.message.edit_text(
            callback.message.text + "\n\n<b>✅ COMPLETED!</b>",
            parse_mode="html"
        )
    else:
        conn.close()
        await callback.answer("❌ Join first then verify!", show_alert=True)

# ============================================================
#  ADVERTISE
# ============================================================
@dp.message(F.text == "💼 Advertise")
async def advertise_menu(message: types.Message):
    user_id = message.from_user.id
    user = get_user(user_id)

    ad_price_ch = get_setting("ad_price_channel")
    ad_price_gr = get_setting("ad_price_group")

    kb = ReplyKeyboardBuilder()
    kb.row(
        KeyboardButton(text="📢 Create Channel Ad"),
        KeyboardButton(text="👥 Create Group Ad")
    )
    kb.row(
        KeyboardButton(text="📊 My Ads"),
        KeyboardButton(text="💳 Deposit")
    )
    kb.row(KeyboardButton(text="🏠 Main Menu"))

    await message.answer(
        f"""<b>💼 ADVERTISE

💳 Your Ad Balance: {user[4]:.4f} TON

📢 Prices:
├ Channel Ad: {ad_price_ch} TON
└ Group Ad: {ad_price_gr} TON

⚠️ Ad balance is for advertising only.
💳 Deposit TON to get started!</b>""",
        parse_mode="html",
        reply_markup=kb.as_markup(resize_keyboard=True)
    )

@dp.message(F.text == "📢 Create Channel Ad")
async def create_channel_ad(message: types.Message, state: FSMContext):
    user_id = message.from_user.id
    user = get_user(user_id)
    price = float(get_setting("ad_price_channel"))

    if user[4] < price:
        await message.answer(
            f"<b>❌ Insufficient ad balance!\n\n💳 Your Ad Balance: {user[4]:.4f} TON\n💰 Required: {price} TON\n\nPlease deposit TON first.</b>",
            parse_mode="html"
        )
        return

    await message.answer(
        f"""<b>📢 CREATE CHANNEL AD

💰 Cost: {price} TON

Send your channel info:
<code>NAME | @username | https://t.me/username</code>

Example:
<code>My Channel | @mychannel | https://t.me/mychannel</code></b>""",
        parse_mode="html",
        reply_markup=cancel_keyboard()
    )
    await state.set_state(AdStates.channel_info)
    await state.update_data(ad_type="channel", price=price)

@dp.message(F.text == "👥 Create Group Ad")
async def create_group_ad(message: types.Message, state: FSMContext):
    user_id = message.from_user.id
    user = get_user(user_id)
    price = float(get_setting("ad_price_group"))

    if user[4] < price:
        await message.answer(
            f"<b>❌ Insufficient ad balance!\n\n💳 Your Ad Balance: {user[4]:.4f} TON\n💰 Required: {price} TON</b>",
            parse_mode="html"
        )
        return

    await message.answer(
        f"""<b>👥 CREATE GROUP AD

💰 Cost: {price} TON

Send your group info:
<code>NAME | @username | https://t.me/username</code></b>""",
        parse_mode="html",
        reply_markup=cancel_keyboard()
    )
    await state.set_state(AdStates.group_info)
    await state.update_data(ad_type="group", price=price)

@dp.message(AdStates.channel_info)
@dp.message(AdStates.group_info)
async def process_ad(message: types.Message, state: FSMContext):
    user_id = message.from_user.id

    if message.text == "❌ Cancel":
        await state.clear()
        await message.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=main_keyboard(user_id))
        return

    data = await state.get_data()
    ad_type = data["ad_type"]
    price = data["price"]

    try:
        parts = message.text.strip().split("|")
        name = parts[0].strip()
        username = parts[1].strip()
        link = parts[2].strip()

        if not username.startswith("@"):
            raise ValueError
        if not link.startswith("https://t.me/"):
            raise ValueError
    except:
        await message.answer(
            "<b>⚠️ Wrong format!\n\nUse:\n<code>NAME | @username | https://t.me/username</code></b>",
            parse_mode="html"
        )
        return

    # Commission admin 20%
    commission = price * COMMISSION_RATE
    task_budget = price - commission

    # Débiter l'annonceur
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE users SET ad_balance=ad_balance-? WHERE user_id=?", (price, user_id))

    # Créer la tâche
    reward = float(get_setting("task_reward"))
    c.execute("""INSERT INTO tasks (type, name, username, link, reward, owner_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 0)""",
        (ad_type, name, username, link, reward, user_id))
    task_id = c.lastrowid
    conn.commit()
    conn.close()

    # Commission vers wallet admin
    update_balance(ADMIN_ID, commission)

    await state.clear()
    await message.answer(
        f"""<b>⏳ Ad Submitted!

📌 Name: {name}
🔗 Username: {username}
💰 Cost: {price} TON
🆔 Task ID: #{task_id}

Admin will review and activate soon.</b>""",
        parse_mode="html",
        reply_markup=main_keyboard(user_id)
    )

    markup = InlineKeyboardBuilder()
    markup.row(
        InlineKeyboardButton(text="✅ Approve", callback_data=f"approve_ad_{task_id}"),
        InlineKeyboardButton(text="❌ Reject", callback_data=f"reject_ad_{task_id}_{user_id}_{price}")
    )

    await bot.send_message(
        ADMIN_ID,
        f"""<b>{'📢' if ad_type == 'channel' else '👥'} NEW AD REQUEST #{task_id}

👤 From: {user_id}
📌 Name: {name}
🔗 Username: {username}
🔗 Link: {link}
💰 Paid: {price} TON
💰 Commission: {commission} TON</b>""",
        parse_mode="html",
        reply_markup=markup.as_markup()
    )

@dp.callback_query(F.data.startswith("approve_ad_"))
async def approve_ad(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer("🚫 Access denied!", show_alert=True)
        return

    task_id = int(callback.data.split("_")[2])
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE tasks SET is_active=1 WHERE id=?", (task_id,))
    c.execute("SELECT owner_id, name FROM tasks WHERE id=?", (task_id,))
    task = c.fetchone()
    conn.commit()
    conn.close()

    if task:
        await bot.send_message(
            task[0],
            f"<b>✅ Your ad '{task[1]}' has been approved and is now live!</b>",
            parse_mode="html"
        )

    await callback.message.edit_text(
        callback.message.text + "\n\n<b>✅ APPROVED</b>",
        parse_mode="html"
    )
    await callback.answer("✅ Approved!")

@dp.callback_query(F.data.startswith("reject_ad_"))
async def reject_ad(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer("🚫 Access denied!", show_alert=True)
        return

    parts = callback.data.split("_")
    task_id = int(parts[2])
    owner_id = int(parts[3])
    price = float(parts[4])

    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    c.execute("UPDATE users SET ad_balance=ad_balance+? WHERE user_id=?", (price, owner_id))
    conn.commit()
    conn.close()

    update_balance(ADMIN_ID, -price * COMMISSION_RATE)

    await bot.send_message(
        owner_id,
        f"<b>❌ Your ad was rejected.\n\n💰 {price} TON refunded to your ad balance.</b>",
        parse_mode="html"
    )

    await callback.message.edit_text(
        callback.message.text + "\n\n<b>❌ REJECTED</b>",
        parse_mode="html"
    )
    await callback.answer("❌ Rejected!")

@dp.message(F.text == "📊 My Ads")
async def my_ads(message: types.Message):
    user_id = message.from_user.id
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM tasks WHERE owner_id=?", (user_id,))
    ads = c.fetchall()
    conn.close()

    if not ads:
        await message.answer("<b>📊 No ads yet.\n\nCreate one to get started!</b>", parse_mode="html")
        return

    user = get_user(user_id)
    text = f"<b>📊 MY ADS\n\n💳 Ad Balance: {user[4]:.4f} TON\n\n"
    for ad in ads:
        status = "✅ Active" if ad[7] == 1 else "⏳ Pending"
        icon = "📢" if ad[1] == "channel" else "👥"
        text += f"{icon} {ad[2]} — {status} — {ad[8]} completions\n"
    text += "</b>"

    await message.answer(text, parse_mode="html")

# ============================================================
#  DEPOSIT
# ============================================================
@dp.message(F.text == "💳 Deposit")
async def deposit_menu(message: types.Message, state: FSMContext):
    user_id = message.from_user.id

    await message.answer(
        f"""<b>💳 DEPOSIT TON

To deposit, send TON to this wallet:
<code>{ADMIN_WALLET}</code>

⚠️ IMPORTANT: Include your Telegram ID in the memo/comment:
<code>{user_id}</code>

After sending, enter the amount here:</b>""",
        parse_mode="html",
        reply_markup=cancel_keyboard()
    )
    await state.set_state(DepositStates.amount)

@dp.message(DepositStates.amount)
async def process_deposit(message: types.Message, state: FSMContext):
    user_id = message.from_user.id

    if message.text == "❌ Cancel":
        await state.clear()
        await message.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=main_keyboard(user_id))
        return

    try:
        amount = float(message.text.strip())
        if amount < 0.01:
            raise ValueError
    except:
        await message.answer("<b>⚠️ Invalid amount. Minimum is 0.01 TON</b>", parse_mode="html")
        return

    conn = get_db()
    c = conn.cursor()
    c.execute("INSERT INTO deposits (user_id, amount) VALUES (?, ?)", (user_id, amount))
    deposit_id = c.lastrowid
    conn.commit()
    conn.close()

    await state.clear()
    await message.answer(
        f"<b>⏳ Deposit Request Sent!\n\n💰 Amount: {amount} TON\n🆔 Request ID: #{deposit_id}\n\nAdmin will verify your payment soon.</b>",
        parse_mode="html",
        reply_markup=main_keyboard(user_id)
    )

    markup = InlineKeyboardBuilder()
    markup.row(
        InlineKeyboardButton(text="✅ Approve", callback_data=f"approve_d_{deposit_id}"),
        InlineKeyboardButton(text="❌ Reject", callback_data=f"reject_d_{deposit_id}")
    )

    await bot.send_message(
        ADMIN_ID,
        f"""<b>💳 NEW DEPOSIT REQUEST #{deposit_id}

👤 User: {message.from_user.first_name} ({user_id})
💰 Amount: {amount} TON
🆔 Check memo: {user_id}</b>""",
        parse_mode="html",
        reply_markup=markup.as_markup()
    )

@dp.callback_query(F.data.startswith("approve_d_"))
async def approve_deposit(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer("🚫 Access denied!", show_alert=True)
        return

    deposit_id = int(callback.data.split("_")[2])
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM deposits WHERE id=?", (deposit_id,))
    d = c.fetchone()

    if not d or d[3] != "pending":
        await callback.answer("⚠️ Already processed!", show_alert=True)
        conn.close()
        return

    c.execute("UPDATE deposits SET status='approved' WHERE id=?", (deposit_id,))
    c.execute("UPDATE users SET ad_balance=ad_balance+? WHERE user_id=?", (d[2], d[1]))
    conn.commit()
    conn.close()

    await bot.send_message(
        d[1],
        f"<b>✅ Deposit Approved!\n\n💰 {d[2]} TON added to your Ad Balance!\n💼 Use it to create ads!</b>",
        parse_mode="html"
    )

    await callback.message.edit_text(
        callback.message.text + "\n\n<b>✅ APPROVED</b>",
        parse_mode="html"
    )
    await callback.answer("✅ Approved!")

@dp.callback_query(F.data.startswith("reject_d_"))
async def reject_deposit(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer("🚫 Access denied!", show_alert=True)
        return

    deposit_id = int(callback.data.split("_")[2])
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM deposits WHERE id=?", (deposit_id,))
    d = c.fetchone()

    if not d or d[3] != "pending":
        await callback.answer("⚠️ Already processed!", show_alert=True)
        conn.close()
        return

    c.execute("UPDATE deposits SET status='rejected' WHERE id=?", (deposit_id,))
    conn.commit()
    conn.close()

    await bot.send_message(
        d[1],
        "<b>❌ Deposit Rejected.\n\nContact support if you think this is a mistake.</b>",
        parse_mode="html"
    )

    await callback.message.edit_text(
        callback.message.text + "\n\n<b>❌ REJECTED</b>",
        parse_mode="html"
    )
    await callback.answer("❌ Rejected!")

# ============================================================
#  PROMO CODE
# ============================================================
@dp.message(F.text == "🎟️ Promo Code")
async def promo_menu(message: types.Message, state: FSMContext):
    await message.answer(
        "<b>🎟️ Enter your promo code:\n\nExample: <code>BONUS2024</code></b>",
        parse_mode="html",
        reply_markup=cancel_keyboard()
    )
    await state.set_state(PromoStates.code)

@dp.message(PromoStates.code)
async def check_promo(message: types.Message, state: FSMContext):
    user_id = message.from_user.id

    if message.text == "❌ Cancel":
        await state.clear()
        await message.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=main_keyboard(user_id))
        return

    code = message.text.strip().upper()
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT * FROM promo_codes WHERE code=?", (code,))
    promo = c.fetchone()

    c.execute("SELECT * FROM used_promos WHERE user_id=? AND code=?", (user_id, code))
    already_used = c.fetchone()

    if not promo:
        await message.answer("<b>❌ Invalid promo code.</b>", parse_mode="html")
        conn.close()
        await state.clear()
        return

    if already_used:
        await message.answer("<b>⚠️ You already used this code!</b>", parse_mode="html")
        conn.close()
        await state.clear()
        return

    if promo[2] <= 0:
        await message.answer("<b>❌ This promo code has expired!</b>", parse_mode="html")
        conn.close()
        await state.clear()
        return

    amount = promo[1]
    c.execute("UPDATE promo_codes SET uses_left=uses_left-1 WHERE code=?", (code,))
    c.execute("UPDATE users SET balance=balance+? WHERE user_id=?", (amount, user_id))
    c.execute("INSERT INTO used_promos (user_id, code) VALUES (?, ?)", (user_id, code))
    conn.commit()
    conn.close()

    await state.clear()
    await message.answer(
        f"<b>🎉 Promo Activated!\n\n💰 +{amount} TON added!\n🎟️ Code: {code}</b>",
        parse_mode="html",
        reply_markup=main_keyboard(user_id)
    )

# ============================================================
#  ADMIN PANEL
# ============================================================
@dp.message(F.text == "🛡️ Admin Panel")
async def admin_panel(message: types.Message):
    if message.from_user.id != ADMIN_ID:
        await message.answer("<b>🚫 Access denied.</b>", parse_mode="html")
        return

    total_users, total_withdrawn, total_deposits, active_tasks = get_total_stats()
    withdraw_enabled = get_setting("withdraw_enabled")
    status = "✅ ON" if withdraw_enabled == "1" else "❌ OFF"

    admin_balance = get_user(ADMIN_ID)
    admin_bal = admin_balance[3] if admin_balance else 0

    await message.answer(
        f"""<b>🛡️ ADMIN PANEL

👥 Total Users: {total_users}
💰 Total Withdrawn: {total_withdrawn:.4f} TON
💳 Total Deposits: {total_deposits:.4f} TON
📋 Active Tasks: {active_tasks}
💎 Your Commission: {admin_bal:.4f} TON
📤 Withdraw Status: {status}</b>""",
        parse_mode="html",
        reply_markup=admin_keyboard()
    )

@dp.message(F.text == "📊 Bot Stats")
async def admin_stats(message: types.Message):
    if message.from_user.id != ADMIN_ID:
        return
    total_users, total_withdrawn, total_deposits, active_tasks = get_total_stats()
    ref_bonus = get_setting("ref_bonus")
    daily_bonus = get_setting("daily_bonus")
    min_w = get_setting("min_withdraw")
    max_w = get_setting("max_withdraw")
    withdraw_enabled = get_setting("withdraw_enabled")
    ad_ch = get_setting("ad_price_channel")
    ad_gr = get_setting("ad_price_group")
    status = "✅ ON" if withdraw_enabled == "1" else "❌ OFF"

    await message.answer(
        f"""<b>📊 FULL BOT STATS

👥 Total Users: {total_users}
💰 Total Withdrawn: {total_withdrawn:.4f} TON
💳 Total Deposits: {total_deposits:.4f} TON
📋 Active Tasks: {active_tasks}

⚙️ Settings:
├ 💰 Ref Bonus: {ref_bonus} TON
├ 🎁 Daily Bonus: {daily_bonus} TON
├ 📉 Min Withdraw: {min_w} TON
├ 📈 Max Withdraw: {max_w} TON
├ 📢 Channel Ad: {ad_ch} TON
├ 👥 Group Ad: {ad_gr} TON
└ 📤 Withdraw: {status}</b>""",
        parse_mode="html"
    )

@dp.message(F.text == "⚙️ Settings")
async def admin_settings(message: types.Message):
    if message.from_user.id != ADMIN_ID:
        return
    await message.answer("<b>⚙️ Settings</b>", parse_mode="html", reply_markup=settings_keyboard())

@dp.message(F.text == "🔄 Toggle Withdraw")
async def toggle_withdraw(message: types.Message):
    if message.from_user.id != ADMIN_ID:
        return
    current = get_setting("withdraw_enabled")
    new_val = "0" if current == "1" else "1"
    set_setting("withdraw_enabled", new_val)
    status = "✅ ENABLED" if new_val == "1" else "❌ DISABLED"
    await message.answer(f"<b>Withdrawals are now {status}!</b>", parse_mode="html")

@dp.message(F.text == "💰 Add Balance")
async def admin_add_balance(message: types.Message, state: FSMContext):
    if message.from_user.id != ADMIN_ID:
        return
    await message.answer(
        "<b>Send: USER_ID AMOUNT\n\nExample: <code>123456789 0.05</code></b>",
        parse_mode="html",
        reply_markup=cancel_keyboard()
    )
    await state.set_state(AdminStates.add_balance)

@dp.message(AdminStates.add_balance)
async def process_add_balance(message: types.Message, state: FSMContext):
    if message.text == "❌ Cancel":
        await state.clear()
        await message.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=admin_keyboard())
        return
    try:
        parts = message.text.strip().split()
        target_id = int(parts[0])
        amount = float(parts[1])
        update_balance(target_id, amount)
        await bot.send_message(target_id, f"<b>🎁 Admin added {amount} TON to your balance!</b>", parse_mode="html")
        await message.answer(f"<b>✅ Added {amount} TON to user {target_id}.</b>", parse_mode="html")
    except:
        await message.answer("<b>⚠️ Wrong format. Use: USER_ID AMOUNT</b>", parse_mode="html")
    await state.clear()
    await message.answer("<b>Done.</b>", parse_mode="html", reply_markup=admin_keyboard())

@dp.message(F.text == "📢 Broadcast")
async def admin_broadcast(message: types.Message, state: FSMContext):
    if message.from_user.id != ADMIN_ID:
        return
    await message.answer("<b>📢 Send the message to broadcast:</b>", parse_mode="html", reply_markup=cancel_keyboard())
    await state.set_state(AdminStates.broadcast)

@dp.message(AdminStates.broadcast)
async def process_broadcast(message: types.Message, state: FSMContext):
    if message.text == "❌ Cancel":
        await state.clear()
        await message.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=admin_keyboard())
        return

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT user_id FROM users WHERE is_banned=0")
    users = c.fetchall()
    conn.close()

    sent = 0
    for user in users:
        try:
            await bot.send_message(user[0], f"📢 <b>Announcement</b>\n\n{message.text}", parse_mode="html")
            sent += 1
            await asyncio.sleep(0.05)
        except:
            pass

    await state.clear()
    await message.answer(f"<b>✅ Broadcast sent to {sent} users!</b>", parse_mode="html", reply_markup=admin_keyboard())

@dp.message(F.text == "🚫 Ban User")
async def admin_ban(message: types.Message, state: FSMContext):
    if message.from_user.id != ADMIN_ID:
        return
    await message.answer("<b>Send User ID to ban:</b>", parse_mode="html", reply_markup=cancel_keyboard())
    await state.set_state(AdminStates.ban_user)

@dp.message(AdminStates.ban_user)
async def process_ban(message: types.Message, state: FSMContext):
    if message.text == "❌ Cancel":
        await state.clear()
        await message.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=admin_keyboard())
        return
    try:
        target_id = int(message.text.strip())
        conn = get_db()
        c = conn.cursor()
        c.execute("UPDATE users SET is_banned=1 WHERE user_id=?", (target_id,))
        conn.commit()
        conn.close()
        await bot.send_message(target_id, "<b>🚫 You have been banned from this bot.</b>", parse_mode="html")
        await message.answer(f"<b>✅ User {target_id} banned.</b>", parse_mode="html")
    except:
        await message.answer("<b>⚠️ Error. Send a valid User ID.</b>", parse_mode="html")
    await state.clear()
    await message.answer("<b>Done.</b>", parse_mode="html", reply_markup=admin_keyboard())

@dp.message(F.text == "✅ Unban User")
async def admin_unban(message: types.Message, state: FSMContext):
    if message.from_user.id != ADMIN_ID:
        return
    await message.answer("<b>Send User ID to unban:</b>", parse_mode="html", reply_markup=cancel_keyboard())
    await state.set_state(AdminStates.unban_user)

@dp.message(AdminStates.unban_user)
async def process_unban(message: types.Message, state: FSMContext):
    if message.text == "❌ Cancel":
        await state.clear()
        await message.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=admin_keyboard())
        return
    try:
        target_id = int(message.text.strip())
        conn = get_db()
        c = conn.cursor()
        c.execute("UPDATE users SET is_banned=0 WHERE user_id=?", (target_id,))
        conn.commit()
        conn.close()
        await bot.send_message(target_id, "<b>✅ You have been unbanned!</b>", parse_mode="html")
        await message.answer(f"<b>✅ User {target_id} unbanned.</b>", parse_mode="html")
    except:
        await message.answer("<b>⚠️ Error. Send a valid User ID.</b>", parse_mode="html")
    await state.clear()
    await message.answer("<b>Done.</b>", parse_mode="html", reply_markup=admin_keyboard())

@dp.message(F.text == "🎟️ Create Promo")
async def admin_create_promo(message: types.Message, state: FSMContext):
    if message.from_user.id != ADMIN_ID:
        return
    await message.answer(
        "<b>Format: CODE AMOUNT USES\n\nExample: <code>BONUS2024 0.05 100</code></b>",
        parse_mode="html",
        reply_markup=cancel_keyboard()
    )
    await state.set_state(AdminStates.create_promo)

@dp.message(AdminStates.create_promo)
async def process_create_promo(message: types.Message, state: FSMContext):
    if message.text == "❌ Cancel":
        await state.clear()
        await message.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=admin_keyboard())
        return
    try:
        parts = message.text.strip().split()
        code = parts[0].upper()
        amount = float(parts[1])
        uses = int(parts[2])

        conn = get_db()
        c = conn.cursor()
        c.execute("INSERT OR REPLACE INTO promo_codes (code, amount, uses_left) VALUES (?, ?, ?)",
                  (code, amount, uses))
        conn.commit()
        conn.close()

        await message.answer(
            f"<b>✅ Promo Created!\n\n🎟️ Code: <code>{code}</code>\n💰 Amount: {amount} TON\n🔢 Uses: {uses}</b>",
            parse_mode="html"
        )
    except:
        await message.answer("<b>⚠️ Wrong format. Use: CODE AMOUNT USES</b>", parse_mode="html")
    await state.clear()
    await message.answer("<b>Done.</b>", parse_mode="html", reply_markup=admin_keyboard())

@dp.message(F.text == "📋 Pending Ads")
async def pending_ads(message: types.Message):
    if message.from_user.id != ADMIN_ID:
        return
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM tasks WHERE is_active=0")
    ads = c.fetchall()
    conn.close()

    if not ads:
        await message.answer("<b>✅ No pending ads!</b>", parse_mode="html")
        return

    for ad in ads:
        markup = InlineKeyboardBuilder()
        markup.row(
            InlineKeyboardButton(text="✅ Approve", callback_data=f"approve_ad_{ad[0]}"),
            InlineKeyboardButton(text="❌ Reject", callback_data=f"reject_ad_{ad[0]}_{ad[6]}_0.05")
        )
        icon = "📢" if ad[1] == "channel" else "👥"
        await message.answer(
            f"<b>{icon} PENDING AD #{ad[0]}\n\n📌 Name: {ad[2]}\n🔗 Username: {ad[3]}\n👤 Owner: {ad[6]}</b>",
            parse_mode="html",
            reply_markup=markup.as_markup()
        )

@dp.message(F.text == "💳 Pending Deposits")
async def pending_deposits(message: types.Message):
    if message.from_user.id != ADMIN_ID:
        return
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM deposits WHERE status='pending'")
    deposits = c.fetchall()
    conn.close()

    if not deposits:
        await message.answer("<b>✅ No pending deposits!</b>", parse_mode="html")
        return

    for d in deposits:
        markup = InlineKeyboardBuilder()
        markup.row(
            InlineKeyboardButton(text="✅ Approve", callback_data=f"approve_d_{d[0]}"),
            InlineKeyboardButton(text="❌ Reject", callback_data=f"reject_d_{d[0]}")
        )
        await message.answer(
            f"<b>💳 DEPOSIT #{d[0]}\n\n👤 User: {d[1]}\n💰 Amount: {d[2]} TON</b>",
            parse_mode="html",
            reply_markup=markup.as_markup()
        )

@dp.message(F.text == "🏠 Main Menu")
async def back_to_main(message: types.Message):
    await message.answer(
        "<b>🏡 Main Menu</b>",
        parse_mode="html",
        reply_markup=main_keyboard(message.from_user.id)
    )

@dp.message(F.text == "🔙 Back Admin")
async def back_to_admin(message: types.Message):
    if message.from_user.id != ADMIN_ID:
        return
    await message.answer("<b>🛡️ Admin Panel</b>", parse_mode="html", reply_markup=admin_keyboard())

# ============================================================
#  MAIN
# ============================================================
async def main():
    init_db()
    create_user(ADMIN_ID, "admin", "Admin")
    logger.info("TonCipher Bot started!")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
