"""
TonCipher Bot — Complete Version
Features:
- Dual deposit system (Manual TON + CryptoBot automatic)
- Automatic withdrawal via CryptoBot
- Restructured menu (Earnings / Ads / Balance / Settings / Referrals)
- Full admin panel with dynamic settings
- Task system with verification
- Promo codes, daily bonus, leaderboard
- Commission system (20% on each ad)
- Ban/unban system
"""

import logging
import asyncio
import aiohttp
import sqlite3
import os
from datetime import datetime
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import ReplyKeyboardBuilder, InlineKeyboardBuilder

# ─────────────────────────────────────────────
#  CONFIG
# ─────────────────────────────────────────────
BOT_TOKEN        = os.getenv("BOT_TOKEN", "")
ADMIN_ID         = int(os.getenv("ADMIN_ID", "6339278677"))
ADMIN_WALLET     = os.getenv("ADMIN_WALLET", "UQDCLLOiZ8_KzB_lJXPaTuinjyEemjbnzS3-VAZD6fU-Rp2S")
CRYPTO_BOT_TOKEN = os.getenv("CRYPTO_BOT_TOKEN", "")

COMMISSION       = 0.20   # 20% on every ad
CRYPTO_API       = "https://pay.crypt.bot/api"
REQUIRED_CHANNELS = ["@ApexCryptoHub1", "@TonEarnPayment"]
WITHDRAW_CHANNEL  = "@TonEarnPayment"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
#  DATABASE
# ─────────────────────────────────────────────
DB = "tonciper.db"

def db():
    return sqlite3.connect(DB)

def init_db():
    c = db()
    cur = c.cursor()

    cur.execute("""CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY,
        username    TEXT    DEFAULT '',
        name        TEXT    DEFAULT 'User',
        balance     REAL    DEFAULT 0,
        ad_balance  REAL    DEFAULT 0,
        refs        INTEGER DEFAULT 0,
        ref_by      INTEGER DEFAULT 0,
        wallet      TEXT    DEFAULT NULL,
        banned      INTEGER DEFAULT 0,
        last_daily  TEXT    DEFAULT NULL,
        joined      TEXT    DEFAULT CURRENT_TIMESTAMP
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS tasks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        type        TEXT,
        name        TEXT,
        username    TEXT,
        link        TEXT,
        reward      REAL    DEFAULT 0.001,
        owner       INTEGER DEFAULT 0,
        active      INTEGER DEFAULT 0,
        done_count  INTEGER DEFAULT 0,
        created     TEXT    DEFAULT CURRENT_TIMESTAMP
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS completions (
        user_id  INTEGER,
        task_id  INTEGER,
        done_at  TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, task_id)
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS withdrawals (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER,
        amount     REAL,
        method     TEXT DEFAULT 'cryptobot',
        status     TEXT DEFAULT 'pending',
        created    TEXT DEFAULT CURRENT_TIMESTAMP
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS deposits (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER,
        amount      REAL,
        method      TEXT DEFAULT 'manual',
        invoice_id  TEXT DEFAULT NULL,
        status      TEXT DEFAULT 'pending',
        created     TEXT DEFAULT CURRENT_TIMESTAMP
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS promos (
        code   TEXT PRIMARY KEY,
        amount REAL,
        uses   INTEGER,
        created TEXT DEFAULT CURRENT_TIMESTAMP
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS used_promos (
        user_id INTEGER,
        code    TEXT,
        PRIMARY KEY (user_id, code)
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS settings (
        k TEXT PRIMARY KEY,
        v TEXT
    )""")

    defaults = {
        "ref_bonus":     "0.005",
        "daily_bonus":   "0.001",
        "min_withdraw":  "0.01",
        "max_withdraw":  "10.0",
        "withdrawals":   "1",
        "task_reward":   "0.001",
        "ad_ch_price":   "0.05",
        "ad_gr_price":   "0.03",
    }
    for k, v in defaults.items():
        cur.execute("INSERT OR IGNORE INTO settings (k,v) VALUES (?,?)", (k, v))

    c.commit()
    c.close()

def setting(key: str) -> str:
    c = db()
    r = c.execute("SELECT v FROM settings WHERE k=?", (key,)).fetchone()
    c.close()
    return r[0] if r else ""

def set_setting(key: str, val):
    c = db()
    c.execute("INSERT OR REPLACE INTO settings (k,v) VALUES (?,?)", (key, str(val)))
    c.commit()
    c.close()

def get_user(uid: int):
    c = db()
    r = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    c.close()
    return r

def ensure_user(uid: int, username: str, name: str):
    c = db()
    c.execute("INSERT OR IGNORE INTO users (id, username, name) VALUES (?,?,?)",
              (uid, username or "", name or "User"))
    c.commit()
    c.close()

def add_balance(uid: int, amount: float):
    c = db()
    c.execute("UPDATE users SET balance=balance+? WHERE id=?", (amount, uid))
    c.commit()
    c.close()

def add_ad_balance(uid: int, amount: float):
    c = db()
    c.execute("UPDATE users SET ad_balance=ad_balance+? WHERE id=?", (amount, uid))
    c.commit()
    c.close()

def stats():
    c = db()
    users     = c.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    withdrawn = c.execute("SELECT COALESCE(SUM(amount),0) FROM withdrawals WHERE status='done'").fetchone()[0]
    deposited = c.execute("SELECT COALESCE(SUM(amount),0) FROM deposits WHERE status='done'").fetchone()[0]
    tasks     = c.execute("SELECT COUNT(*) FROM tasks WHERE active=1").fetchone()[0]
    c.close()
    return users, withdrawn, deposited, tasks

def rank(refs: int) -> str:
    if refs >= 100: return "💎 Diamond"
    if refs >= 50:  return "🥇 Gold"
    if refs >= 20:  return "🥈 Silver"
    if refs >= 5:   return "🥉 Bronze"
    return "🌱 Starter"

# ─────────────────────────────────────────────
#  CRYPTOBOT API
# ─────────────────────────────────────────────
async def cb_create_invoice(amount: float, uid: int) -> dict:
    async with aiohttp.ClientSession() as s:
        r = await s.post(f"{CRYPTO_API}/createInvoice", json={
            "asset": "TON",
            "amount": str(amount),
            "description": f"TonCipher — User {uid}",
            "payload": str(uid),
            "allow_comments": False,
            "allow_anonymous": False,
        }, headers={"Crypto-Pay-API-Token": CRYPTO_BOT_TOKEN})
        return await r.json()

async def cb_check_invoice(invoice_id: str) -> dict:
    async with aiohttp.ClientSession() as s:
        r = await s.get(f"{CRYPTO_API}/getInvoices",
                        params={"invoice_ids": invoice_id},
                        headers={"Crypto-Pay-API-Token": CRYPTO_BOT_TOKEN})
        return await r.json()

async def cb_transfer(uid: int, amount: float, spend_id: str) -> dict:
    async with aiohttp.ClientSession() as s:
        r = await s.post(f"{CRYPTO_API}/transfer", json={
            "user_id": uid,
            "asset": "TON",
            "amount": str(amount),
            "spend_id": spend_id,
            "comment": "TonCipher withdrawal ✅",
        }, headers={"Crypto-Pay-API-Token": CRYPTO_BOT_TOKEN})
        return await r.json()

# ─────────────────────────────────────────────
#  FSM
# ─────────────────────────────────────────────
class S(StatesGroup):
    # user
    wallet       = State()
    withdraw     = State()
    promo        = State()
    # ads
    ad_channel   = State()
    ad_group     = State()
    # admin
    a_balance    = State()
    a_broadcast  = State()
    a_ban        = State()
    a_unban      = State()
    a_promo      = State()
    a_ref        = State()
    a_daily      = State()
    a_min_w      = State()
    a_max_w      = State()
    a_ad_price   = State()
    a_deposit_id = State()

# ─────────────────────────────────────────────
#  BOT & DP
# ─────────────────────────────────────────────
bot = Bot(token=BOT_TOKEN)
dp  = Dispatcher(storage=MemoryStorage())

# ─────────────────────────────────────────────
#  KEYBOARDS
# ─────────────────────────────────────────────
def kb_main(uid: int):
    b = ReplyKeyboardBuilder()
    b.row(KeyboardButton(text="💰 Earnings"), KeyboardButton(text="📢 Ads"))
    b.row(KeyboardButton(text="💳 Balance"),  KeyboardButton(text="⚙️ Settings"))
    b.row(KeyboardButton(text="👥 Referrals"),KeyboardButton(text="📊 Stats"))
    if uid == ADMIN_ID:
        b.row(KeyboardButton(text="🛡️ Admin"))
    return b.as_markup(resize_keyboard=True)

def kb_earnings():
    b = ReplyKeyboardBuilder()
    b.row(KeyboardButton(text="📋 Tasks"),    KeyboardButton(text="🎁 Daily Bonus"))
    b.row(KeyboardButton(text="🎟️ Promo"),   KeyboardButton(text="🏆 Leaderboard"))
    b.row(KeyboardButton(text="🏠 Home"))
    return b.as_markup(resize_keyboard=True)

def kb_tasks():
    b = ReplyKeyboardBuilder()
    b.row(KeyboardButton(text="📢 Channel Tasks"), KeyboardButton(text="👥 Group Tasks"))
    b.row(KeyboardButton(text="🔙 Earnings"))
    return b.as_markup(resize_keyboard=True)

def kb_ads():
    b = ReplyKeyboardBuilder()
    b.row(KeyboardButton(text="➕ New Ad"),  KeyboardButton(text="📊 My Ads"))
    b.row(KeyboardButton(text="💳 Deposit"),KeyboardButton(text="🏠 Home"))
    return b.as_markup(resize_keyboard=True)

def kb_ad_type():
    b = ReplyKeyboardBuilder()
    b.row(KeyboardButton(text="📢 Channel Ad"), KeyboardButton(text="👥 Group Ad"))
    b.row(KeyboardButton(text="🔙 Ads"))
    return b.as_markup(resize_keyboard=True)

def kb_balance():
    b = ReplyKeyboardBuilder()
    b.row(KeyboardButton(text="📤 Withdraw"), KeyboardButton(text="💳 Deposit"))
    b.row(KeyboardButton(text="🏠 Home"))
    return b.as_markup(resize_keyboard=True)

def kb_settings():
    b = ReplyKeyboardBuilder()
    b.row(KeyboardButton(text="👛 Wallet"),  KeyboardButton(text="👤 Profile"))
    b.row(KeyboardButton(text="🏠 Home"))
    return b.as_markup(resize_keyboard=True)

def kb_refs():
    b = ReplyKeyboardBuilder()
    b.row(KeyboardButton(text="🔗 My Link"))
    b.row(KeyboardButton(text="🏠 Home"))
    return b.as_markup(resize_keyboard=True)

def kb_admin():
    b = ReplyKeyboardBuilder()
    b.row(KeyboardButton(text="📊 A.Stats"),  KeyboardButton(text="⚙️ A.Settings"))
    b.row(KeyboardButton(text="💰 A.Balance"),KeyboardButton(text="📢 A.Broadcast"))
    b.row(KeyboardButton(text="🚫 A.Ban"),    KeyboardButton(text="✅ A.Unban"))
    b.row(KeyboardButton(text="🎟️ A.Promo"), KeyboardButton(text="📋 A.Ads"))
    b.row(KeyboardButton(text="💳 A.Deposits"))
    b.row(KeyboardButton(text="🏠 Home"))
    return b.as_markup(resize_keyboard=True)

def kb_admin_settings():
    b = ReplyKeyboardBuilder()
    b.row(KeyboardButton(text="💰 A.RefBonus"),  KeyboardButton(text="🎁 A.DailyBonus"))
    b.row(KeyboardButton(text="📉 A.MinW"),      KeyboardButton(text="📈 A.MaxW"))
    b.row(KeyboardButton(text="🔄 A.ToggleW"),   KeyboardButton(text="💼 A.AdPrices"))
    b.row(KeyboardButton(text="🔙 A.Back"))
    return b.as_markup(resize_keyboard=True)

def kb_cancel():
    b = ReplyKeyboardBuilder()
    b.row(KeyboardButton(text="❌ Cancel"))
    return b.as_markup(resize_keyboard=True)

def kb_join():
    b = InlineKeyboardBuilder()
    for ch in REQUIRED_CHANNELS:
        b.row(InlineKeyboardButton(text=f"📢 Join {ch}",
              url=f"https://t.me/{ch.lstrip('@')}"))
    b.row(InlineKeyboardButton(text="✅ I Joined", callback_data="joined"))
    return b.as_markup()

# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────
async def is_member(uid: int) -> bool:
    for ch in REQUIRED_CHANNELS:
        try:
            m = await bot.get_chat_member(ch, uid)
            if m.status in ("left", "kicked"):
                return False
        except:
            return False
    return True

def cancel_check(text: str) -> bool:
    return text in ("❌ Cancel",)

# ─────────────────────────────────────────────
#  /START
# ─────────────────────────────────────────────
@dp.message(CommandStart())
async def start(msg: types.Message):
    uid  = msg.from_user.id
    name = msg.from_user.first_name or "User"
    uname = msg.from_user.username or ""
    ensure_user(uid, uname, name)

    u = get_user(uid)
    if u and u[8]:
        await msg.answer("<b>🚫 You are banned from this bot.</b>", parse_mode="html")
        return

    # Referral handling
    args = msg.text.split()
    if len(args) > 1:
        try:
            ref_id = int(args[1])
            if ref_id != uid:
                c = db()
                ref_by = c.execute("SELECT ref_by FROM users WHERE id=?", (uid,)).fetchone()
                if ref_by and ref_by[0] == 0:
                    bonus = float(setting("ref_bonus"))
                    c.execute("UPDATE users SET ref_by=? WHERE id=?", (ref_id, uid))
                    c.execute("UPDATE users SET balance=balance+?, refs=refs+1 WHERE id=?",
                              (bonus, ref_id))
                    c.commit()
                    try:
                        await bot.send_message(ref_id,
                            f"<b>🎉 New referral!\n💰 +{bonus} TON added to your balance!</b>",
                            parse_mode="html")
                    except:
                        pass
                c.close()
        except:
            pass

    if not await is_member(uid):
        await msg.answer(
            "<b>👋 Welcome to TonCipher!\n\nJoin our channels to start earning:</b>",
            parse_mode="html", reply_markup=kb_join())
    else:
        await msg.answer(
            f"<b>🏡 Welcome back, {name}!\n\n💎 Earn TON by completing tasks and referring friends!</b>",
            parse_mode="html", reply_markup=kb_main(uid))

@dp.callback_query(F.data == "joined")
async def cb_joined(cb: types.CallbackQuery):
    uid = cb.from_user.id
    if await is_member(uid):
        await cb.message.delete()
        await cb.message.answer(
            f"<b>✅ Welcome to TonCipher!\n\n💎 Start earning TON now!</b>",
            parse_mode="html", reply_markup=kb_main(uid))
    else:
        await cb.answer("❌ Please join all channels first!", show_alert=True)

# ─────────────────────────────────────────────
#  NAVIGATION
# ─────────────────────────────────────────────
@dp.message(F.text == "🏠 Home")
async def home(msg: types.Message, state: FSMContext):
    await state.clear()
    await msg.answer("<b>🏡 Home</b>", parse_mode="html",
                     reply_markup=kb_main(msg.from_user.id))

@dp.message(F.text == "🔙 Earnings")
async def back_earnings(msg: types.Message):
    await msg.answer("<b>💰 Earnings</b>", parse_mode="html", reply_markup=kb_earnings())

@dp.message(F.text == "🔙 Ads")
async def back_ads(msg: types.Message):
    await msg.answer("<b>📢 Ads</b>", parse_mode="html", reply_markup=kb_ads())

@dp.message(F.text == "🔙 A.Back")
async def back_admin(msg: types.Message):
    if msg.from_user.id != ADMIN_ID: return
    await msg.answer("<b>🛡️ Admin</b>", parse_mode="html", reply_markup=kb_admin())

# ─────────────────────────────────────────────
#  EARNINGS
# ─────────────────────────────────────────────
@dp.message(F.text == "💰 Earnings")
async def earnings(msg: types.Message):
    u = get_user(msg.from_user.id)
    if not u: return
    await msg.answer(
        f"<b>💰 EARNINGS\n\n💳 Balance: {u[3]:.4f} TON\n\nChoose an option:</b>",
        parse_mode="html", reply_markup=kb_earnings())

@dp.message(F.text == "📋 Tasks")
async def tasks_menu(msg: types.Message):
    uid = msg.from_user.id
    c = db()
    total = c.execute("SELECT COUNT(*) FROM tasks WHERE active=1").fetchone()[0]
    done  = c.execute("SELECT COUNT(*) FROM completions WHERE user_id=?", (uid,)).fetchone()[0]
    c.close()
    await msg.answer(
        f"<b>📋 TASKS\n\n📊 Available: {total}\n✅ Completed: {done}\n💰 Reward: {setting('task_reward')} TON each</b>",
        parse_mode="html", reply_markup=kb_tasks())

@dp.message(F.text.in_({"📢 Channel Tasks", "👥 Group Tasks"}))
async def show_tasks(msg: types.Message):
    uid  = msg.from_user.id
    ttype = "channel" if "Channel" in msg.text else "group"
    icon  = "📢" if ttype == "channel" else "👥"

    c = db()
    rows = c.execute("""SELECT * FROM tasks WHERE type=? AND active=1
        AND id NOT IN (SELECT task_id FROM completions WHERE user_id=?)
        ORDER BY id LIMIT 5""", (ttype, uid)).fetchall()
    c.close()

    if not rows:
        await msg.answer(f"<b>{icon} No {ttype} tasks available right now.\n\nCheck back later!</b>",
                         parse_mode="html")
        return

    for t in rows:
        b = InlineKeyboardBuilder()
        b.row(InlineKeyboardButton(text=f"{icon} Join {t[2]}", url=t[4]))
        b.row(InlineKeyboardButton(text="✅ Verify & Claim", callback_data=f"vtask_{t[0]}"))
        await msg.answer(
            f"<b>{icon} {t[2]}\n💰 Reward: {t[5]} TON</b>",
            parse_mode="html", reply_markup=b.as_markup())

@dp.callback_query(F.data.startswith("vtask_"))
async def verify_task(cb: types.CallbackQuery):
    uid     = cb.from_user.id
    task_id = int(cb.data.split("_")[1])

    c = db()
    if c.execute("SELECT 1 FROM completions WHERE user_id=? AND task_id=?",
                 (uid, task_id)).fetchone():
        await cb.answer("✅ Already completed!", show_alert=True)
        c.close()
        return

    t = c.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    c.close()

    if not t:
        await cb.answer("⚠️ Task not found!", show_alert=True)
        return

    try:
        m = await bot.get_chat_member(t[3], uid)
        joined = m.status not in ("left", "kicked")
    except:
        joined = False

    if joined:
        c = db()
        c.execute("INSERT INTO completions (user_id, task_id) VALUES (?,?)", (uid, task_id))
        c.execute("UPDATE users SET balance=balance+? WHERE id=?", (t[5], uid))
        c.execute("UPDATE tasks SET done_count=done_count+1 WHERE id=?", (task_id,))
        if t[6]:
            c.execute("UPDATE users SET ad_balance=ad_balance-? WHERE id=?", (t[5], t[6]))
        c.commit()
        c.close()
        await cb.answer(f"✅ +{t[5]} TON added!", show_alert=True)
        try:
            await cb.message.edit_text(cb.message.text + "\n\n✅ COMPLETED!", reply_markup=None)
        except:
            pass
    else:
        await cb.answer("❌ You haven't joined yet! Join first then verify.", show_alert=True)

@dp.message(F.text == "🎁 Daily Bonus")
async def daily(msg: types.Message):
    uid  = msg.from_user.id
    u    = get_user(uid)
    amt  = float(setting("daily_bonus"))
    now  = datetime.now()

    if u[9]:
        last = datetime.fromisoformat(u[9])
        diff = (now - last).total_seconds()
        if diff < 86400:
            rem  = int(86400 - diff)
            h, m = rem // 3600, (rem % 3600) // 60
            await msg.answer(
                f"<b>⏰ Already claimed!\n\nNext bonus in: {h}h {m}m\n💰 Amount: {amt} TON</b>",
                parse_mode="html")
            return

    c = db()
    c.execute("UPDATE users SET balance=balance+?, last_daily=? WHERE id=?",
              (amt, now.isoformat(), uid))
    c.commit()
    c.close()
    await msg.answer(
        f"<b>🎁 Daily Bonus Claimed!\n\n💰 +{amt} TON added!\n⏰ Come back in 24h!</b>",
        parse_mode="html")

@dp.message(F.text == "🎟️ Promo")
async def promo_menu(msg: types.Message, state: FSMContext):
    await msg.answer("<b>🎟️ Enter your promo code:</b>",
                     parse_mode="html", reply_markup=kb_cancel())
    await state.set_state(S.promo)

@dp.message(S.promo)
async def check_promo(msg: types.Message, state: FSMContext):
    uid = msg.from_user.id
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=kb_earnings())
        return

    code = msg.text.strip().upper()
    c = db()
    p = c.execute("SELECT * FROM promos WHERE code=?", (code,)).fetchone()
    u = c.execute("SELECT 1 FROM used_promos WHERE user_id=? AND code=?", (uid, code)).fetchone()

    if not p:
        await msg.answer("<b>❌ Invalid code.</b>", parse_mode="html")
    elif u:
        await msg.answer("<b>⚠️ Already used!</b>", parse_mode="html")
    elif p[2] <= 0:
        await msg.answer("<b>❌ Code expired!</b>", parse_mode="html")
    else:
        c.execute("UPDATE promos SET uses=uses-1 WHERE code=?", (code,))
        c.execute("UPDATE users SET balance=balance+? WHERE id=?", (p[1], uid))
        c.execute("INSERT INTO used_promos VALUES (?,?)", (uid, code))
        c.commit()
        await msg.answer(
            f"<b>🎉 Promo activated!\n💰 +{p[1]} TON added!\n🎟️ Code: {code}</b>",
            parse_mode="html", reply_markup=kb_earnings())

    c.close()
    await state.clear()

@dp.message(F.text == "🏆 Leaderboard")
async def leaderboard(msg: types.Message):
    c = db()
    rows = c.execute("SELECT name, refs FROM users ORDER BY refs DESC LIMIT 10").fetchall()
    c.close()
    medals = {0: "🥇", 1: "🥈", 2: "🥉"}
    lines  = [f"{medals.get(i, f'{i+1}.')} {r[0]} — {r[1]} refs"
              for i, r in enumerate(rows)] if rows else ["No data yet!"]
    await msg.answer(f"<b>🏆 LEADERBOARD\n\n" + "\n".join(lines) + "</b>", parse_mode="html")

# ─────────────────────────────────────────────
#  ADS
# ─────────────────────────────────────────────
@dp.message(F.text == "📢 Ads")
async def ads_menu(msg: types.Message):
    u = get_user(msg.from_user.id)
    await msg.answer(
        f"""<b>📢 ADVERTISE

💳 Ad Balance: {u[4]:.4f} TON

📢 Channel Ad: {setting('ad_ch_price')} TON
👥 Group Ad:   {setting('ad_gr_price')} TON

⚠️ 20% platform commission.
⚠️ Ad balance is for ads only.</b>""",
        parse_mode="html", reply_markup=kb_ads())

@dp.message(F.text == "➕ New Ad")
async def new_ad(msg: types.Message):
    await msg.answer("<b>➕ Choose ad type:</b>", parse_mode="html", reply_markup=kb_ad_type())

@dp.message(F.text.in_({"📢 Channel Ad", "👥 Group Ad"}))
async def start_ad(msg: types.Message, state: FSMContext):
    uid   = msg.from_user.id
    u     = get_user(uid)
    is_ch = "Channel" in msg.text
    price = float(setting("ad_ch_price" if is_ch else "ad_gr_price"))
    icon  = "📢" if is_ch else "👥"

    if u[4] < price:
        b = InlineKeyboardBuilder()
        b.row(InlineKeyboardButton(text="💳 Deposit Now", callback_data="to_deposit"))
        await msg.answer(
            f"<b>❌ Insufficient ad balance!\n\n💳 Yours: {u[4]:.4f} TON\n💰 Needed: {price} TON</b>",
            parse_mode="html", reply_markup=b.as_markup())
        return

    await msg.answer(
        f"<b>{icon} {'CHANNEL' if is_ch else 'GROUP'} AD — {price} TON\n\n"
        f"Send info:\n<code>NAME | @username | https://t.me/username</code></b>",
        parse_mode="html", reply_markup=kb_cancel())

    await state.set_state(S.ad_channel if is_ch else S.ad_group)
    await state.update_data(ad_type="channel" if is_ch else "group", price=price)

@dp.callback_query(F.data == "to_deposit")
async def to_deposit_cb(cb: types.CallbackQuery, state: FSMContext):
    await cb.answer()
    await deposit_handler(cb.message, state)

@dp.message(S.ad_channel)
@dp.message(S.ad_group)
async def process_ad(msg: types.Message, state: FSMContext):
    uid = msg.from_user.id
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=kb_ads())
        return

    d     = await state.get_data()
    atype = d["ad_type"]
    price = d["price"]

    try:
        parts = msg.text.strip().split("|")
        name  = parts[0].strip()
        uname = parts[1].strip()
        link  = parts[2].strip()
        if not uname.startswith("@") or not link.startswith("https://t.me/"):
            raise ValueError
    except:
        await msg.answer(
            "<b>⚠️ Wrong format!\n<code>NAME | @username | https://t.me/username</code></b>",
            parse_mode="html")
        return

    commission = price * COMMISSION
    reward     = float(setting("task_reward"))

    c = db()
    c.execute("UPDATE users SET ad_balance=ad_balance-? WHERE id=?", (price, uid))
    c.execute("INSERT INTO tasks (type,name,username,link,reward,owner,active) VALUES (?,?,?,?,?,?,0)",
              (atype, name, uname, link, reward, uid))
    task_id = c.lastrowid
    c.commit()
    c.close()

    add_balance(ADMIN_ID, commission)

    await state.clear()
    await msg.answer(
        f"<b>⏳ Ad submitted!\n\n📌 {name}\n🔗 {uname}\n💰 Paid: {price} TON\n💎 Commission: {commission} TON\n\nAdmin will review shortly.</b>",
        parse_mode="html", reply_markup=kb_ads())

    b = InlineKeyboardBuilder()
    b.row(
        InlineKeyboardButton(text="✅ Approve", callback_data=f"aad_{task_id}"),
        InlineKeyboardButton(text="❌ Reject",  callback_data=f"rad_{task_id}_{uid}_{price}")
    )
    icon = "📢" if atype == "channel" else "👥"
    await bot.send_message(ADMIN_ID,
        f"<b>{icon} NEW AD #{task_id}\n\n👤 {uid}\n📌 {name}\n🔗 {uname}\n💰 {price} TON</b>",
        parse_mode="html", reply_markup=b.as_markup())

@dp.callback_query(F.data.startswith("aad_"))
async def approve_ad(cb: types.CallbackQuery):
    if cb.from_user.id != ADMIN_ID:
        await cb.answer("🚫 Denied!", show_alert=True); return
    task_id = int(cb.data.split("_")[1])
    c = db()
    c.execute("UPDATE tasks SET active=1 WHERE id=?", (task_id,))
    t = c.execute("SELECT owner, name FROM tasks WHERE id=?", (task_id,)).fetchone()
    c.commit(); c.close()
    if t:
        try: await bot.send_message(t[0], f"<b>✅ Your ad '{t[1]}' is now live!</b>", parse_mode="html")
        except: pass
    try: await cb.message.edit_text(cb.message.text + "\n\n✅ APPROVED")
    except: pass
    await cb.answer("✅ Approved!")

@dp.callback_query(F.data.startswith("rad_"))
async def reject_ad(cb: types.CallbackQuery):
    if cb.from_user.id != ADMIN_ID:
        await cb.answer("🚫 Denied!", show_alert=True); return
    parts   = cb.data.split("_")
    task_id = int(parts[1])
    owner   = int(parts[2])
    price   = float(parts[3])
    c = db()
    c.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    c.execute("UPDATE users SET ad_balance=ad_balance+? WHERE id=?", (price, owner))
    c.commit(); c.close()
    add_balance(ADMIN_ID, -(price * COMMISSION))
    try: await bot.send_message(owner, f"<b>❌ Ad rejected.\n💰 {price} TON refunded.</b>", parse_mode="html")
    except: pass
    try: await cb.message.edit_text(cb.message.text + "\n\n❌ REJECTED")
    except: pass
    await cb.answer("❌ Rejected!")

@dp.message(F.text == "📊 My Ads")
async def my_ads(msg: types.Message):
    uid = msg.from_user.id
    u   = get_user(uid)
    c   = db()
    ads = c.execute("SELECT * FROM tasks WHERE owner=? ORDER BY created DESC", (uid,)).fetchall()
    c.close()

    text = f"<b>📊 MY ADS\n\n💳 Ad Balance: {u[4]:.4f} TON\n\n"
    if ads:
        for a in ads:
            st   = "✅ Live" if a[7] else "⏳ Pending"
            icon = "📢" if a[1] == "channel" else "👥"
            text += f"{icon} {a[2]} — {st} ({a[8]} completions)\n"
    else:
        text += "No ads yet. Create your first one!"
    text += "</b>"
    await msg.answer(text, parse_mode="html")

# ─────────────────────────────────────────────
#  BALANCE / DEPOSIT / WITHDRAW
# ─────────────────────────────────────────────
@dp.message(F.text == "💳 Balance")
async def balance_menu(msg: types.Message):
    u = get_user(msg.from_user.id)
    await msg.answer(
        f"<b>💳 MY BALANCE\n\n💰 Main: {u[3]:.4f} TON\n💼 Ads:  {u[4]:.4f} TON</b>",
        parse_mode="html", reply_markup=kb_balance())

@dp.message(F.text == "💳 Deposit")
async def deposit_handler(msg: types.Message, state: FSMContext):
    uid = msg.from_user.id

    b = InlineKeyboardBuilder()
    # CryptoBot (automatic)
    b.row(
        InlineKeyboardButton(text="0.05 TON", callback_data="dep_cb_0.05"),
        InlineKeyboardButton(text="0.10 TON", callback_data="dep_cb_0.10"),
        InlineKeyboardButton(text="0.50 TON", callback_data="dep_cb_0.50"),
    )
    b.row(
        InlineKeyboardButton(text="1.00 TON", callback_data="dep_cb_1.0"),
        InlineKeyboardButton(text="5.00 TON", callback_data="dep_cb_5.0"),
        InlineKeyboardButton(text="10.00 TON",callback_data="dep_cb_10.0"),
    )
    b.row(InlineKeyboardButton(text="💸 Manual TON transfer", callback_data="dep_manual"))

    await msg.answer(
        f"""<b>💳 DEPOSIT TON

Choose method:

⚡ Auto (CryptoBot) — Instant confirmation
💸 Manual — Transfer to our wallet, then confirm

Your ad balance receives the deposit.</b>""",
        parse_mode="html", reply_markup=b.as_markup())

# --- CryptoBot deposit ---
@dp.callback_query(F.data.startswith("dep_cb_"))
async def dep_cryptobot(cb: types.CallbackQuery):
    uid    = cb.from_user.id
    amount = float(cb.data.split("_")[2])
    await cb.answer()
    await cb.message.answer("<b>⏳ Creating invoice...</b>", parse_mode="html")

    try:
        res = await cb_create_invoice(amount, uid)
        if res.get("ok"):
            inv    = res["result"]
            inv_id = str(inv["invoice_id"])
            url    = inv["pay_url"]

            c = db()
            c.execute("INSERT INTO deposits (user_id,amount,method,invoice_id,status) VALUES (?,?,?,?,?)",
                      (uid, amount, "cryptobot", inv_id, "pending"))
            c.commit(); c.close()

            b = InlineKeyboardBuilder()
            b.row(InlineKeyboardButton(text="⚡ Pay via CryptoBot", url=url))
            b.row(InlineKeyboardButton(text="✅ I Paid — Verify",
                                       callback_data=f"vdep_{inv_id}"))
            await cb.message.answer(
                f"<b>⚡ CRYPTOBOT INVOICE\n\n💰 Amount: {amount} TON\n🆔 Invoice: #{inv_id}\n\n1. Click Pay\n2. Click Verify after payment</b>",
                parse_mode="html", reply_markup=b.as_markup())
        else:
            await cb.message.answer("<b>⚠️ Error creating invoice. Try again.</b>", parse_mode="html")
    except Exception as e:
        logger.error(f"CryptoBot error: {e}")
        await cb.message.answer("<b>⚠️ Payment service unavailable.</b>", parse_mode="html")

@dp.callback_query(F.data.startswith("vdep_"))
async def verify_deposit(cb: types.CallbackQuery):
    uid    = cb.from_user.id
    inv_id = cb.data.split("_")[1]
    await cb.answer()

    try:
        res = await cb_check_invoice(inv_id)
        if res.get("ok"):
            items = res["result"].get("items", [])
            if items and items[0]["status"] == "paid":
                c = db()
                dep = c.execute("SELECT * FROM deposits WHERE invoice_id=? AND user_id=?",
                                (inv_id, uid)).fetchone()
                if dep and dep[5] == "pending":
                    amount = dep[2]
                    c.execute("UPDATE deposits SET status='done' WHERE invoice_id=?", (inv_id,))
                    c.execute("UPDATE users SET ad_balance=ad_balance+? WHERE id=?", (amount, uid))
                    c.commit(); c.close()
                    try: await cb.message.edit_text(cb.message.text + "\n\n✅ PAID!", reply_markup=None)
                    except: pass
                    await cb.message.answer(
                        f"<b>✅ Deposit Confirmed!\n💰 {amount} TON added to your Ad Balance!</b>",
                        parse_mode="html")
                else:
                    c.close()
                    await cb.message.answer("<b>ℹ️ Already processed.</b>", parse_mode="html")
            elif items and items[0]["status"] == "active":
                await cb.message.answer("<b>⏳ Not paid yet. Pay first then verify.</b>", parse_mode="html")
            else:
                await cb.message.answer("<b>❌ Invoice expired. Create a new one.</b>", parse_mode="html")
        else:
            await cb.message.answer("<b>⚠️ Error checking payment.</b>", parse_mode="html")
    except Exception as e:
        logger.error(f"Verify deposit error: {e}")
        await cb.message.answer("<b>⚠️ Error. Try again.</b>", parse_mode="html")

# --- Manual deposit ---
@dp.callback_query(F.data == "dep_manual")
async def dep_manual(cb: types.CallbackQuery, state: FSMContext):
    uid = cb.from_user.id
    await cb.answer()
    await cb.message.answer(
        f"""<b>💸 MANUAL DEPOSIT

1️⃣ Send TON to this wallet:
<code>{ADMIN_WALLET}</code>

2️⃣ Include your ID in memo/comment:
<code>{uid}</code>

3️⃣ Come back and send the amount here:</b>""",
        parse_mode="html", reply_markup=kb_cancel())
    await state.set_state(S.a_deposit_id)

@dp.message(S.a_deposit_id)
async def manual_deposit_amount(msg: types.Message, state: FSMContext):
    uid = msg.from_user.id
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=kb_balance())
        return
    try:
        amount = float(msg.text.strip())
        if amount < 0.01: raise ValueError
    except:
        await msg.answer("<b>⚠️ Invalid amount. Minimum: 0.01 TON</b>", parse_mode="html")
        return

    c = db()
    c.execute("INSERT INTO deposits (user_id,amount,method,status) VALUES (?,?,?,?)",
              (uid, amount, "manual", "pending"))
    dep_id = c.lastrowid
    c.commit(); c.close()

    await state.clear()
    await msg.answer(
        f"<b>⏳ Deposit request sent!\n💰 Amount: {amount} TON\n🆔 Request: #{dep_id}\n\nAdmin will verify your transfer.</b>",
        parse_mode="html", reply_markup=kb_balance())

    b = InlineKeyboardBuilder()
    b.row(
        InlineKeyboardButton(text="✅ Approve", callback_data=f"adep_{dep_id}"),
        InlineKeyboardButton(text="❌ Reject",  callback_data=f"rdep_{dep_id}")
    )
    await bot.send_message(ADMIN_ID,
        f"<b>💸 MANUAL DEPOSIT #{dep_id}\n\n👤 User: {uid} ({msg.from_user.first_name})\n💰 {amount} TON\n⚠️ Check memo: {uid}</b>",
        parse_mode="html", reply_markup=b.as_markup())

@dp.callback_query(F.data.startswith("adep_"))
async def approve_dep(cb: types.CallbackQuery):
    if cb.from_user.id != ADMIN_ID:
        await cb.answer("🚫 Denied!", show_alert=True); return
    dep_id = int(cb.data.split("_")[1])
    c = db()
    d = c.execute("SELECT * FROM deposits WHERE id=?", (dep_id,)).fetchone()
    if not d or d[5] != "pending":
        await cb.answer("⚠️ Already done!", show_alert=True); c.close(); return
    c.execute("UPDATE deposits SET status='done' WHERE id=?", (dep_id,))
    c.execute("UPDATE users SET ad_balance=ad_balance+? WHERE id=?", (d[2], d[1]))
    c.commit(); c.close()
    try: await bot.send_message(d[1], f"<b>✅ Deposit approved!\n💰 {d[2]} TON added to Ad Balance!</b>", parse_mode="html")
    except: pass
    try: await cb.message.edit_text(cb.message.text + "\n\n✅ APPROVED")
    except: pass
    await cb.answer("✅ Approved!")

@dp.callback_query(F.data.startswith("rdep_"))
async def reject_dep(cb: types.CallbackQuery):
    if cb.from_user.id != ADMIN_ID:
        await cb.answer("🚫 Denied!", show_alert=True); return
    dep_id = int(cb.data.split("_")[1])
    c = db()
    d = c.execute("SELECT * FROM deposits WHERE id=?", (dep_id,)).fetchone()
    if not d or d[5] != "pending":
        await cb.answer("⚠️ Already done!", show_alert=True); c.close(); return
    c.execute("UPDATE deposits SET status='rejected' WHERE id=?", (dep_id,))
    c.commit(); c.close()
    try: await bot.send_message(d[1], "<b>❌ Deposit rejected. Contact support.</b>", parse_mode="html")
    except: pass
    try: await cb.message.edit_text(cb.message.text + "\n\n❌ REJECTED")
    except: pass
    await cb.answer("❌ Rejected!")

# --- Withdraw ---
@dp.message(F.text == "📤 Withdraw")
async def withdraw_menu(msg: types.Message, state: FSMContext):
    uid = msg.from_user.id
    u   = get_user(uid)
    if u[8]:
        await msg.answer("<b>🚫 You are banned.</b>", parse_mode="html"); return
    if setting("withdrawals") != "1":
        await msg.answer("<b>⚠️ Withdrawals are currently disabled.</b>", parse_mode="html"); return

    min_w = float(setting("min_withdraw"))
    max_w = float(setting("max_withdraw"))

    if u[3] < min_w:
        await msg.answer(
            f"<b>❌ Insufficient balance.\n\n💳 Yours: {u[3]:.4f} TON\n📌 Min: {min_w} TON</b>",
            parse_mode="html"); return

    await msg.answer(
        f"""<b>📤 WITHDRAW TON

💳 Balance: {u[3]:.4f} TON
📌 Min: {min_w} TON
📌 Max: {max_w} TON

⚡ Sent automatically via CryptoBot to your Telegram.

Enter amount:</b>""",
        parse_mode="html", reply_markup=kb_cancel())
    await state.set_state(S.withdraw)

@dp.message(S.withdraw)
async def process_withdraw(msg: types.Message, state: FSMContext):
    uid = msg.from_user.id
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=kb_balance())
        return
    try:
        amount = float(msg.text.strip())
    except:
        await msg.answer("<b>⚠️ Invalid amount.</b>", parse_mode="html"); return

    u     = get_user(uid)
    min_w = float(setting("min_withdraw"))
    max_w = float(setting("max_withdraw"))

    if amount < min_w:
        await msg.answer(f"<b>⚠️ Minimum: {min_w} TON</b>", parse_mode="html"); return
    if amount > max_w:
        await msg.answer(f"<b>⚠️ Maximum: {max_w} TON</b>", parse_mode="html"); return
    if amount > u[3]:
        await msg.answer("<b>⚠️ Insufficient balance.</b>", parse_mode="html"); return

    b = InlineKeyboardBuilder()
    b.row(
        InlineKeyboardButton(text="✅ Confirm", callback_data=f"cw_{amount}"),
        InlineKeyboardButton(text="❌ Cancel",  callback_data="xw")
    )
    await state.clear()
    await msg.answer(
        f"<b>⚠️ Confirm?\n\n💵 {amount} TON\n📲 Sent to your Telegram via CryptoBot</b>",
        parse_mode="html", reply_markup=b.as_markup())

@dp.callback_query(F.data.startswith("cw_"))
async def confirm_withdraw(cb: types.CallbackQuery):
    uid    = cb.from_user.id
    amount = float(cb.data.split("_")[1])
    u      = get_user(uid)

    if amount > u[3]:
        await cb.answer("⚠️ Insufficient balance!", show_alert=True); return

    await cb.answer()
    try: await cb.message.edit_text(cb.message.text + "\n\n⏳ Processing...", reply_markup=None)
    except: pass

    c = db()
    c.execute("UPDATE users SET balance=balance-? WHERE id=?", (amount, uid))
    c.execute("INSERT INTO withdrawals (user_id,amount,method,status) VALUES (?,?,?,?)",
              (uid, amount, "cryptobot", "processing"))
    w_id = c.lastrowid
    c.commit(); c.close()

    try:
        res = await cb_transfer(uid, amount, f"w_{w_id}_{uid}")
        if res.get("ok"):
            c = db()
            c.execute("UPDATE withdrawals SET status='done' WHERE id=?", (w_id,))
            c.commit(); c.close()
            await cb.message.answer(
                f"<b>✅ Withdrawal Successful!\n\n💵 {amount} TON sent!\n📲 Check @CryptoBot to receive it. 🎉</b>",
                parse_mode="html", reply_markup=kb_balance())
            try:
                await bot.send_message(WITHDRAW_CHANNEL,
                    f"<b>✅ Withdrawal\n👤 {uid}\n💵 {amount} TON\n✅ Paid via CryptoBot</b>",
                    parse_mode="html")
            except: pass
        else:
            err = res.get("error", {}).get("name", "Unknown")
            c = db()
            c.execute("UPDATE users SET balance=balance+? WHERE id=?", (amount, uid))
            c.execute("UPDATE withdrawals SET status='failed' WHERE id=?", (w_id,))
            c.commit(); c.close()
            await cb.message.answer(
                f"<b>❌ Withdrawal failed.\n💰 {amount} TON returned.\nError: {err}</b>",
                parse_mode="html", reply_markup=kb_balance())
    except Exception as e:
        logger.error(f"Withdraw error: {e}")
        c = db()
        c.execute("UPDATE users SET balance=balance+? WHERE id=?", (amount, uid))
        c.execute("UPDATE withdrawals SET status='failed' WHERE id=?", (w_id,))
        c.commit(); c.close()
        await cb.message.answer(
            "<b>❌ Error. Amount returned to balance.</b>",
            parse_mode="html", reply_markup=kb_balance())

@dp.callback_query(F.data == "xw")
async def cancel_withdraw(cb: types.CallbackQuery):
    try: await cb.message.edit_text("<b>❌ Cancelled.</b>", parse_mode="html")
    except: pass
    await cb.answer()

# ─────────────────────────────────────────────
#  SETTINGS / PROFILE
# ─────────────────────────────────────────────
@dp.message(F.text == "⚙️ Settings")
async def settings_menu(msg: types.Message):
    u = get_user(msg.from_user.id)
    w = u[7] or "Not set"
    await msg.answer(
        f"<b>⚙️ SETTINGS\n\n👛 Wallet: <code>{w}</code></b>",
        parse_mode="html", reply_markup=kb_settings())

@dp.message(F.text == "👛 Wallet")
async def wallet_menu(msg: types.Message, state: FSMContext):
    await msg.answer("<b>👛 Send your TON wallet address:</b>",
                     parse_mode="html", reply_markup=kb_cancel())
    await state.set_state(S.wallet)

@dp.message(S.wallet)
async def save_wallet(msg: types.Message, state: FSMContext):
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=kb_settings())
        return
    addr = msg.text.strip()
    if len(addr) < 10:
        await msg.answer("<b>⚠️ Invalid address.</b>", parse_mode="html"); return
    c = db()
    c.execute("UPDATE users SET wallet=? WHERE id=?", (addr, msg.from_user.id))
    c.commit(); c.close()
    await state.clear()
    await msg.answer(f"<b>✅ Wallet saved!\n<code>{addr}</code></b>",
                     parse_mode="html", reply_markup=kb_settings())

@dp.message(F.text == "👤 Profile")
async def profile(msg: types.Message):
    uid = msg.from_user.id
    u   = get_user(uid)
    c   = db()
    done = c.execute("SELECT COUNT(*) FROM completions WHERE user_id=?", (uid,)).fetchone()[0]
    c.close()
    w = u[7] or "Not set"
    await msg.answer(
        f"""<b>╔══════════════════╗
       👤 PROFILE
╚══════════════════╝

🆔 <a href='tg://user?id={uid}'>{msg.from_user.first_name}</a>
🏅 Rank: {rank(u[5])}

💰 Balance:   {u[3]:.4f} TON
💼 Ad Balance:{u[4]:.4f} TON
👥 Referrals: {u[5]}
✅ Tasks Done:{done}

👛 <code>{w}</code></b>""",
        parse_mode="html")

# ─────────────────────────────────────────────
#  REFERRALS
# ─────────────────────────────────────────────
@dp.message(F.text == "👥 Referrals")
async def refs_menu(msg: types.Message):
    u = get_user(msg.from_user.id)
    await msg.answer(
        f"<b>👥 REFERRALS\n\n💰 Per Ref: {setting('ref_bonus')} TON\n👥 Your refs: {u[5]}\n💳 Balance: {u[3]:.4f} TON</b>",
        parse_mode="html", reply_markup=kb_refs())

@dp.message(F.text == "🔗 My Link")
async def my_link(msg: types.Message):
    uid  = msg.from_user.id
    info = await bot.get_me()
    link = f"https://t.me/{info.username}?start={uid}"
    await msg.answer(
        f"<b>🔗 Your Referral Link:\n\n<code>{link}</code>\n\n💰 Earn {setting('ref_bonus')} TON per referral!</b>",
        parse_mode="html")

# ─────────────────────────────────────────────
#  STATS
# ─────────────────────────────────────────────
@dp.message(F.text == "📊 Stats")
async def show_stats(msg: types.Message):
    u, w, d, t = stats()
    await msg.answer(
        f"""<b>📊 BOT STATS

👥 Users:       {u}
📤 Withdrawn:   {w:.4f} TON
💳 Deposited:   {d:.4f} TON
📋 Active Tasks:{t}

💰 Per Referral:{setting('ref_bonus')} TON
📌 Min Withdraw:{setting('min_withdraw')} TON</b>""",
        parse_mode="html")

# ─────────────────────────────────────────────
#  ADMIN
# ─────────────────────────────────────────────
@dp.message(F.text == "🛡️ Admin")
async def admin(msg: types.Message):
    if msg.from_user.id != ADMIN_ID: return
    u, w, d, t = stats()
    me = get_user(ADMIN_ID)
    sw = "✅ ON" if setting("withdrawals") == "1" else "❌ OFF"
    await msg.answer(
        f"""<b>🛡️ ADMIN PANEL

👥 Users:     {u}
💰 Withdrawn: {w:.4f} TON
💳 Deposited: {d:.4f} TON
📋 Tasks:     {t}
💎 Commission:{me[3]:.4f} TON
📤 Withdrawals:{sw}</b>""",
        parse_mode="html", reply_markup=kb_admin())

@dp.message(F.text == "⚙️ A.Settings")
async def admin_settings(msg: types.Message):
    if msg.from_user.id != ADMIN_ID: return
    await msg.answer("<b>⚙️ Bot Settings</b>", parse_mode="html",
                     reply_markup=kb_admin_settings())

@dp.message(F.text == "📊 A.Stats")
async def admin_stats(msg: types.Message):
    if msg.from_user.id != ADMIN_ID: return
    u, w, d, t = stats()
    sw = "✅ ON" if setting("withdrawals") == "1" else "❌ OFF"
    await msg.answer(
        f"""<b>📊 FULL STATS

👥 Users:       {u}
💰 Withdrawn:   {w:.4f} TON
💳 Deposited:   {d:.4f} TON
📋 Active Tasks:{t}

⚙️ Settings:
├ 💰 Ref Bonus:   {setting('ref_bonus')} TON
├ 🎁 Daily Bonus: {setting('daily_bonus')} TON
├ 📉 Min Withdraw:{setting('min_withdraw')} TON
├ 📈 Max Withdraw:{setting('max_withdraw')} TON
├ 📢 Channel Ad:  {setting('ad_ch_price')} TON
├ 👥 Group Ad:    {setting('ad_gr_price')} TON
└ 📤 Withdrawals: {sw}</b>""",
        parse_mode="html")

# Admin setting helpers
async def ask_setting(msg, state, st, current, label):
    await msg.answer(f"<b>Current {label}: {current}\n\nSend new value:</b>",
                     parse_mode="html", reply_markup=kb_cancel())
    await state.set_state(st)

@dp.message(F.text == "💰 A.RefBonus")
async def a_ref(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await ask_setting(msg, state, S.a_ref, setting("ref_bonus"), "Ref Bonus (TON)")

@dp.message(S.a_ref)
async def process_a_ref(msg: types.Message, state: FSMContext):
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("❌", reply_markup=kb_admin_settings()); return
    try:
        set_setting("ref_bonus", float(msg.text.strip()))
        await msg.answer(f"<b>✅ Ref bonus: {msg.text.strip()} TON</b>",
                         parse_mode="html", reply_markup=kb_admin_settings())
    except:
        await msg.answer("<b>⚠️ Invalid.</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "🎁 A.DailyBonus")
async def a_daily(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await ask_setting(msg, state, S.a_daily, setting("daily_bonus"), "Daily Bonus (TON)")

@dp.message(S.a_daily)
async def process_a_daily(msg: types.Message, state: FSMContext):
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("❌", reply_markup=kb_admin_settings()); return
    try:
        set_setting("daily_bonus", float(msg.text.strip()))
        await msg.answer(f"<b>✅ Daily bonus: {msg.text.strip()} TON</b>",
                         parse_mode="html", reply_markup=kb_admin_settings())
    except:
        await msg.answer("<b>⚠️ Invalid.</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "📉 A.MinW")
async def a_min(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await ask_setting(msg, state, S.a_min_w, setting("min_withdraw"), "Min Withdraw (TON)")

@dp.message(S.a_min_w)
async def process_a_min(msg: types.Message, state: FSMContext):
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("❌", reply_markup=kb_admin_settings()); return
    try:
        set_setting("min_withdraw", float(msg.text.strip()))
        await msg.answer(f"<b>✅ Min withdraw: {msg.text.strip()} TON</b>",
                         parse_mode="html", reply_markup=kb_admin_settings())
    except:
        await msg.answer("<b>⚠️ Invalid.</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "📈 A.MaxW")
async def a_max(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await ask_setting(msg, state, S.a_max_w, setting("max_withdraw"), "Max Withdraw (TON)")

@dp.message(S.a_max_w)
async def process_a_max(msg: types.Message, state: FSMContext):
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("❌", reply_markup=kb_admin_settings()); return
    try:
        set_setting("max_withdraw", float(msg.text.strip()))
        await msg.answer(f"<b>✅ Max withdraw: {msg.text.strip()} TON</b>",
                         parse_mode="html", reply_markup=kb_admin_settings())
    except:
        await msg.answer("<b>⚠️ Invalid.</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "🔄 A.ToggleW")
async def a_toggle(msg: types.Message):
    if msg.from_user.id != ADMIN_ID: return
    cur = setting("withdrawals")
    nw  = "0" if cur == "1" else "1"
    set_setting("withdrawals", nw)
    st = "✅ ENABLED" if nw == "1" else "❌ DISABLED"
    await msg.answer(f"<b>Withdrawals: {st}</b>", parse_mode="html")

@dp.message(F.text == "💼 A.AdPrices")
async def a_ad_prices(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await msg.answer(
        f"<b>Current: Channel={setting('ad_ch_price')} Group={setting('ad_gr_price')}\n\nSend: <code>CH_PRICE GR_PRICE</code></b>",
        parse_mode="html", reply_markup=kb_cancel())
    await state.set_state(S.a_ad_price)

@dp.message(S.a_ad_price)
async def process_a_ad(msg: types.Message, state: FSMContext):
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("❌", reply_markup=kb_admin_settings()); return
    try:
        p = msg.text.strip().split()
        set_setting("ad_ch_price", float(p[0]))
        set_setting("ad_gr_price", float(p[1]))
        await msg.answer(f"<b>✅ Channel: {p[0]} TON | Group: {p[1]} TON</b>",
                         parse_mode="html", reply_markup=kb_admin_settings())
    except:
        await msg.answer("<b>⚠️ Use: CH_PRICE GR_PRICE</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "💰 A.Balance")
async def a_balance(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await msg.answer("<b>Send: <code>USER_ID AMOUNT</code></b>",
                     parse_mode="html", reply_markup=kb_cancel())
    await state.set_state(S.a_balance)

@dp.message(S.a_balance)
async def process_a_balance(msg: types.Message, state: FSMContext):
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("❌", reply_markup=kb_admin()); return
    try:
        p  = msg.text.strip().split()
        tid = int(p[0])
        amt = float(p[1])
        add_balance(tid, amt)
        try: await bot.send_message(tid, f"<b>🎁 Admin added {amt} TON!</b>", parse_mode="html")
        except: pass
        await msg.answer(f"<b>✅ Added {amt} TON to {tid}.</b>",
                         parse_mode="html", reply_markup=kb_admin())
    except:
        await msg.answer("<b>⚠️ Use: USER_ID AMOUNT</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "📢 A.Broadcast")
async def a_broadcast(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await msg.answer("<b>📢 Send broadcast message:</b>",
                     parse_mode="html", reply_markup=kb_cancel())
    await state.set_state(S.a_broadcast)

@dp.message(S.a_broadcast)
async def process_a_broadcast(msg: types.Message, state: FSMContext):
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("❌", reply_markup=kb_admin()); return
    c    = db()
    uids = c.execute("SELECT id FROM users WHERE banned=0").fetchall()
    c.close()
    sent = 0
    for row in uids:
        try:
            await bot.send_message(row[0], f"📢 <b>Announcement</b>\n\n{msg.text}", parse_mode="html")
            sent += 1
            await asyncio.sleep(0.05)
        except: pass
    await state.clear()
    await msg.answer(f"<b>✅ Sent to {sent} users.</b>", parse_mode="html", reply_markup=kb_admin())

@dp.message(F.text == "🚫 A.Ban")
async def a_ban(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await msg.answer("<b>Send User ID to ban:</b>", parse_mode="html", reply_markup=kb_cancel())
    await state.set_state(S.a_ban)

@dp.message(S.a_ban)
async def process_a_ban(msg: types.Message, state: FSMContext):
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("❌", reply_markup=kb_admin()); return
    try:
        tid = int(msg.text.strip())
        c = db()
        c.execute("UPDATE users SET banned=1 WHERE id=?", (tid,))
        c.commit(); c.close()
        try: await bot.send_message(tid, "<b>🚫 You are banned.</b>", parse_mode="html")
        except: pass
        await msg.answer(f"<b>✅ User {tid} banned.</b>", parse_mode="html", reply_markup=kb_admin())
    except:
        await msg.answer("<b>⚠️ Error.</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "✅ A.Unban")
async def a_unban(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await msg.answer("<b>Send User ID to unban:</b>", parse_mode="html", reply_markup=kb_cancel())
    await state.set_state(S.a_unban)

@dp.message(S.a_unban)
async def process_a_unban(msg: types.Message, state: FSMContext):
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("❌", reply_markup=kb_admin()); return
    try:
        tid = int(msg.text.strip())
        c = db()
        c.execute("UPDATE users SET banned=0 WHERE id=?", (tid,))
        c.commit(); c.close()
        try: await bot.send_message(tid, "<b>✅ You are unbanned!</b>", parse_mode="html")
        except: pass
        await msg.answer(f"<b>✅ User {tid} unbanned.</b>", parse_mode="html", reply_markup=kb_admin())
    except:
        await msg.answer("<b>⚠️ Error.</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "🎟️ A.Promo")
async def a_promo(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await msg.answer("<b>Format: <code>CODE AMOUNT USES</code></b>",
                     parse_mode="html", reply_markup=kb_cancel())
    await state.set_state(S.a_promo)

@dp.message(S.a_promo)
async def process_a_promo(msg: types.Message, state: FSMContext):
    if cancel_check(msg.text):
        await state.clear()
        await msg.answer("❌", reply_markup=kb_admin()); return
    try:
        p    = msg.text.strip().split()
        code = p[0].upper()
        amt  = float(p[1])
        uses = int(p[2])
        c = db()
        c.execute("INSERT OR REPLACE INTO promos (code,amount,uses) VALUES (?,?,?)",
                  (code, amt, uses))
        c.commit(); c.close()
        await msg.answer(f"<b>✅ Promo <code>{code}</code> — {amt} TON × {uses}</b>",
                         parse_mode="html", reply_markup=kb_admin())
    except:
        await msg.answer("<b>⚠️ Use: CODE AMOUNT USES</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "📋 A.Ads")
async def a_ads(msg: types.Message):
    if msg.from_user.id != ADMIN_ID: return
    c    = db()
    ads  = c.execute("SELECT * FROM tasks WHERE active=0").fetchall()
    c.close()
    if not ads:
        await msg.answer("<b>✅ No pending ads!</b>", parse_mode="html"); return
    for a in ads:
        b = InlineKeyboardBuilder()
        b.row(
            InlineKeyboardButton(text="✅ Approve", callback_data=f"aad_{a[0]}"),
            InlineKeyboardButton(text="❌ Reject",  callback_data=f"rad_{a[0]}_{a[6]}_{setting('ad_ch_price')}")
        )
        icon = "📢" if a[1] == "channel" else "👥"
        await msg.answer(
            f"<b>{icon} AD #{a[0]}\n📌 {a[2]}\n🔗 {a[3]}\n👤 Owner: {a[6]}</b>",
            parse_mode="html", reply_markup=b.as_markup())

@dp.message(F.text == "💳 A.Deposits")
async def a_deposits(msg: types.Message):
    if msg.from_user.id != ADMIN_ID: return
    c    = db()
    deps = c.execute("SELECT * FROM deposits WHERE status='pending' ORDER BY created DESC").fetchall()
    c.close()
    if not deps:
        await msg.answer("<b>✅ No pending deposits!</b>", parse_mode="html"); return
    for d in deps:
        b = InlineKeyboardBuilder()
        b.row(
            InlineKeyboardButton(text="✅ Approve", callback_data=f"adep_{d[0]}"),
            InlineKeyboardButton(text="❌ Reject",  callback_data=f"rdep_{d[0]}")
        )
        method = "⚡ CryptoBot" if d[3] == "cryptobot" else "💸 Manual"
        await msg.answer(
            f"<b>💳 DEPOSIT #{d[0]}\n{method}\n👤 {d[1]}\n💰 {d[2]} TON</b>",
            parse_mode="html", reply_markup=b.as_markup())

# ─────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────
async def main():
    init_db()
    ensure_user(ADMIN_ID, "admin", "Admin")
    logger.info("✅ TonCipher Bot started!")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
