"""
TonCipher Bot - Final Complete Version
"""
import logging
import asyncio
import aiohttp
import sqlite3
import os
from datetime import datetime
from aiohttp import web
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.utils.keyboard import ReplyKeyboardBuilder, InlineKeyboardBuilder
from aiogram.types import KeyboardButton, InlineKeyboardButton

# ════════════════════════════════════════════
#  CONFIG
# ════════════════════════════════════════════
BOT_TOKEN         = os.getenv("BOT_TOKEN", "")
ADMIN_ID          = int(os.getenv("ADMIN_ID", "6339278677"))
ADMIN_WALLET      = os.getenv("ADMIN_WALLET", "UQDCLLOiZ8_KzB_lJXPaTuinjyEemjbnzS3-VAZD6fU-Rp2S")
CRYPTO_BOT_TOKEN  = os.getenv("CRYPTO_BOT_TOKEN", "")
PORT              = int(os.getenv("PORT", 8080))
CRYPTO_API        = "https://pay.crypt.bot/api"
REQUIRED_CHANNELS = ["@ApexCryptoHub1", "@TonEarnPayment"]
WITHDRAW_CHANNEL  = "@TonEarnPayment"
COMMISSION        = 0.20

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# ════════════════════════════════════════════
#  DATABASE
# ════════════════════════════════════════════
def get_db():
    conn = sqlite3.connect("tonciper.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    c = get_db()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id         INTEGER PRIMARY KEY,
        username   TEXT    DEFAULT '',
        name       TEXT    DEFAULT 'User',
        balance    REAL    DEFAULT 0.0,
        ad_balance REAL    DEFAULT 0.0,
        refs       INTEGER DEFAULT 0,
        ref_by     INTEGER DEFAULT 0,
        wallet     TEXT    DEFAULT NULL,
        banned     INTEGER DEFAULT 0,
        last_daily TEXT    DEFAULT NULL,
        joined     TEXT    DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tasks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        type       TEXT,
        name       TEXT,
        username   TEXT,
        link       TEXT,
        reward     REAL    DEFAULT 0.001,
        owner      INTEGER DEFAULT 0,
        active     INTEGER DEFAULT 0,
        done_count INTEGER DEFAULT 0,
        min_secs   INTEGER DEFAULT 0,
        created    TEXT    DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS completions (
        user_id INTEGER,
        task_id INTEGER,
        done_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, task_id)
    );
    CREATE TABLE IF NOT EXISTS bot_task_starts (
        user_id    INTEGER,
        task_id    INTEGER,
        started_at TEXT,
        PRIMARY KEY (user_id, task_id)
    );
    CREATE TABLE IF NOT EXISTS withdrawals (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        amount  REAL,
        wallet  TEXT    DEFAULT NULL,
        method  TEXT    DEFAULT 'cryptobot',
        status  TEXT    DEFAULT 'pending',
        created TEXT    DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS deposits (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER,
        amount     REAL,
        method     TEXT DEFAULT 'manual',
        invoice_id TEXT DEFAULT NULL,
        status     TEXT DEFAULT 'pending',
        created    TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS promos (
        code    TEXT PRIMARY KEY,
        amount  REAL,
        uses    INTEGER,
        created TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS used_promos (
        user_id INTEGER,
        code    TEXT,
        PRIMARY KEY (user_id, code)
    );
    CREATE TABLE IF NOT EXISTS settings (
        k TEXT PRIMARY KEY,
        v TEXT
    );
    """)
    defaults = {
        "ref_bonus":    "0.005",
        "daily_bonus":  "0.001",
        "min_withdraw": "0.01",
        "max_withdraw": "10.0",
        "withdrawals":  "1",
        "task_reward":  "0.001",
        "ad_ch_price":  "0.05",
        "ad_gr_price":  "0.03",
        "ad_bot_price": "0.02",
    }
    for k, v in defaults.items():
        c.execute("INSERT OR IGNORE INTO settings (k,v) VALUES (?,?)", (k, v))
    c.commit()
    c.close()

def gs(key: str) -> str:
    c = get_db()
    r = c.execute("SELECT v FROM settings WHERE k=?", (key,)).fetchone()
    c.close()
    return r["v"] if r else "0"

def ss(key: str, val):
    c = get_db()
    c.execute("INSERT OR REPLACE INTO settings (k,v) VALUES (?,?)", (key, str(val)))
    c.commit()
    c.close()

def get_user(uid: int):
    c = get_db()
    r = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    c.close()
    return dict(r) if r else None

def ensure_user(uid: int, username: str, name: str):
    c = get_db()
    c.execute("INSERT OR IGNORE INTO users (id,username,name) VALUES (?,?,?)",
              (uid, username or "", name or "User"))
    c.commit()
    c.close()

def add_balance(uid: int, amount: float):
    c = get_db()
    c.execute("UPDATE users SET balance=ROUND(balance+?,8) WHERE id=?", (amount, uid))
    c.commit()
    c.close()

def get_stats():
    c = get_db()
    users     = c.execute("SELECT COUNT(*) as n FROM users").fetchone()["n"]
    withdrawn = c.execute("SELECT COALESCE(SUM(amount),0) as n FROM withdrawals WHERE status='done'").fetchone()["n"]
    deposited = c.execute("SELECT COALESCE(SUM(amount),0) as n FROM deposits WHERE status='done'").fetchone()["n"]
    tasks     = c.execute("SELECT COUNT(*) as n FROM tasks WHERE active=1").fetchone()["n"]
    c.close()
    return users, withdrawn, deposited, tasks

def user_rank(refs: int) -> str:
    if refs >= 100: return "💎 Diamond"
    if refs >= 50:  return "🥇 Gold"
    if refs >= 20:  return "🥈 Silver"
    if refs >= 5:   return "🥉 Bronze"
    return "🌱 Starter"

def fmt(n) -> str:
    try: return f"{float(n):.4f}"
    except: return "0.0000"

def parse_float(text: str) -> float:
    return float(text.strip().replace(",", "."))

# ════════════════════════════════════════════
#  CRYPTOBOT API
# ════════════════════════════════════════════
async def cb_create_invoice(amount: float, uid: int) -> dict:
    async with aiohttp.ClientSession() as s:
        r = await s.post(f"{CRYPTO_API}/createInvoice",
            json={"asset": "TON", "amount": str(amount),
                  "description": f"TonCipher deposit — {uid}",
                  "payload": str(uid),
                  "allow_comments": False, "allow_anonymous": False},
            headers={"Crypto-Pay-API-Token": CRYPTO_BOT_TOKEN})
        return await r.json()

async def cb_check_invoice(inv_id: str) -> dict:
    async with aiohttp.ClientSession() as s:
        r = await s.get(f"{CRYPTO_API}/getInvoices",
            params={"invoice_ids": inv_id},
            headers={"Crypto-Pay-API-Token": CRYPTO_BOT_TOKEN})
        return await r.json()

async def cb_transfer(uid: int, amount: float, spend_id: str) -> dict:
    async with aiohttp.ClientSession() as s:
        r = await s.post(f"{CRYPTO_API}/transfer",
            json={"user_id": uid, "asset": "TON", "amount": str(amount),
                  "spend_id": spend_id, "comment": "TonCipher withdrawal ✅"},
            headers={"Crypto-Pay-API-Token": CRYPTO_BOT_TOKEN})
        return await r.json()

# ════════════════════════════════════════════
#  FSM
# ════════════════════════════════════════════
class ST(StatesGroup):
    wallet        = State()
    promo         = State()
    withdraw_amt  = State()
    withdraw_meth = State()
    dep_manual    = State()
    ad_info       = State()
    a_balance     = State()
    a_broadcast   = State()
    a_ban         = State()
    a_unban       = State()
    a_promo       = State()
    a_ref         = State()
    a_daily       = State()
    a_min_w       = State()
    a_max_w       = State()
    a_ad_price    = State()

# ════════════════════════════════════════════
#  BOT & DP
# ════════════════════════════════════════════
bot = Bot(token=BOT_TOKEN)
dp  = Dispatcher(storage=MemoryStorage())

# ════════════════════════════════════════════
#  KEYBOARDS
# ════════════════════════════════════════════
def kb(rows):
    b = ReplyKeyboardBuilder()
    for row in rows:
        b.row(*[KeyboardButton(text=t) for t in row])
    return b.as_markup(resize_keyboard=True)

def ikb(rows):
    b = InlineKeyboardBuilder()
    for row in rows:
        b.row(*row)
    return b.as_markup()

def KB_MAIN(uid):
    rows = [
        ["💰 Earnings", "📢 Ads"],
        ["💳 Balance",  "⚙️ Settings"],
        ["👥 Referrals","📊 Stats"],
    ]
    if uid == ADMIN_ID:
        rows.append(["🛡️ Admin"])
    return kb(rows)

KB_EARN   = kb([["📋 Tasks","🎁 Daily"],["🎟️ Promo","🏆 Top"],["🏠 Home"]])
KB_TASKS  = kb([["📢 Ch.Tasks","👥 Gr.Tasks"],["🤖 Bot Tasks"],["🔙 Earn"]])
KB_ADS    = kb([["➕ New Ad","📊 My Ads"],["💳 Deposit","🏠 Home"]])
KB_ADTYPE = kb([["📢 Channel Ad","👥 Group Ad"],["🤖 Bot Ad"],["🔙 Ads"]])
KB_BAL    = kb([["📤 Withdraw","💳 Deposit"],["🏠 Home"]])
KB_SET    = kb([["👛 Wallet","👤 Profile"],["🏠 Home"]])
KB_REF    = kb([["🔗 My Link"],["🏠 Home"]])
KB_CANCEL = kb([["❌ Cancel"]])
KB_ADMIN  = kb([
    ["📊 Stats Admin",   "⚙️ Config"],
    ["💰 Add Balance",   "📢 Broadcast"],
    ["🚫 Ban User",      "✅ Unban User"],
    ["🎟️ Create Promo", "📋 Pending Ads"],
    ["💳 Deposits",      "📤 Withdrawals"],
    ["🏠 Home"]
])
KB_ACONF = kb([
    ["💰 Ref Bonus",   "🎁 Daily Bonus"],
    ["📉 Min Withdraw","📈 Max Withdraw"],
    ["🔄 Toggle W",    "💼 Ad Prices"],
    ["🔙 Admin"]
])

# Withdraw method keyboard - text must be simple and clear
KB_WTYPE = kb([
    ["⚡ Auto CryptoBot"],
    ["💸 Manual Admin"],
    ["❌ Cancel"]
])

def is_cancel(t): return t == "❌ Cancel"

# ════════════════════════════════════════════
#  HELPERS
# ════════════════════════════════════════════
async def check_member(uid: int) -> bool:
    for ch in REQUIRED_CHANNELS:
        try:
            m = await bot.get_chat_member(ch, uid)
            if m.status in ("left", "kicked"): return False
        except: return False
    return True

async def check_task_member(username: str, uid: int) -> bool:
    try:
        m = await bot.get_chat_member(username, uid)
        return m.status not in ("left", "kicked")
    except: return False

# ════════════════════════════════════════════
#  KEEP ALIVE
# ════════════════════════════════════════════
async def handle(request):
    return web.Response(text="✅ TonCipher Bot is running!")

async def start_web():
    app = web.Application()
    app.router.add_get("/", handle)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", PORT)
    await site.start()
    log.info(f"✅ Web server on port {PORT}")

# ════════════════════════════════════════════
#  /START
# ════════════════════════════════════════════
@dp.message(CommandStart())
async def cmd_start(msg: types.Message):
    uid   = msg.from_user.id
    name  = msg.from_user.first_name or "User"
    uname = msg.from_user.username or ""
    ensure_user(uid, uname, name)
    u = get_user(uid)
    if u and u["banned"]:
        await msg.answer("<b>🚫 You are banned.</b>", parse_mode="html")
        return

    args = msg.text.split()
    if len(args) > 1:
        try:
            ref_id = int(args[1])
            if ref_id != uid:
                c = get_db()
                row = c.execute("SELECT ref_by FROM users WHERE id=?", (uid,)).fetchone()
                if row and row["ref_by"] == 0:
                    bonus = float(gs("ref_bonus"))
                    c.execute("UPDATE users SET ref_by=? WHERE id=?", (ref_id, uid))
                    c.execute("UPDATE users SET balance=ROUND(balance+?,8), refs=refs+1 WHERE id=?",
                              (bonus, ref_id))
                    c.commit()
                    try:
                        await bot.send_message(ref_id,
                            f"<b>🎉 New referral!\n💰 +{bonus} TON added!</b>",
                            parse_mode="html")
                    except: pass
                c.close()
        except: pass

    if not await check_member(uid):
        await msg.answer(
            "<b>👋 Welcome to TonCipher!\n\nJoin our channels to start earning:</b>",
            parse_mode="html",
            reply_markup=ikb(
                [[InlineKeyboardButton(text=f"📢 {ch}",
                  url=f"https://t.me/{ch.lstrip('@')}")]
                 for ch in REQUIRED_CHANNELS] +
                [[InlineKeyboardButton(text="✅ I Joined", callback_data="joined")]]
            ))
    else:
        await msg.answer(
            f"<b>🏡 Welcome back, {name}!\n\n💎 Earn TON by completing tasks!</b>",
            parse_mode="html", reply_markup=KB_MAIN(uid))

@dp.callback_query(F.data == "joined")
async def cb_joined(cb: types.CallbackQuery):
    uid = cb.from_user.id
    if await check_member(uid):
        await cb.message.delete()
        await cb.message.answer(
            "<b>✅ Welcome to TonCipher!\n💎 Start earning now!</b>",
            parse_mode="html", reply_markup=KB_MAIN(uid))
    else:
        await cb.answer("❌ Join all channels first!", show_alert=True)

# ════════════════════════════════════════════
#  NAVIGATION
# ════════════════════════════════════════════
@dp.message(F.text == "🏠 Home")
async def go_home(msg: types.Message, state: FSMContext):
    await state.clear()
    await msg.answer("<b>🏡 Home</b>", parse_mode="html",
                     reply_markup=KB_MAIN(msg.from_user.id))

@dp.message(F.text == "🔙 Earn")
async def back_earn(msg: types.Message):
    await msg.answer("<b>💰 Earnings</b>", parse_mode="html", reply_markup=KB_EARN)

@dp.message(F.text == "🔙 Ads")
async def back_ads(msg: types.Message):
    await msg.answer("<b>📢 Ads</b>", parse_mode="html", reply_markup=KB_ADS)

@dp.message(F.text == "🔙 Admin")
async def back_admin(msg: types.Message):
    if msg.from_user.id != ADMIN_ID: return
    await msg.answer("<b>🛡️ Admin</b>", parse_mode="html", reply_markup=KB_ADMIN)

# ════════════════════════════════════════════
#  EARNINGS
# ════════════════════════════════════════════
@dp.message(F.text == "💰 Earnings")
async def earnings(msg: types.Message):
    u = get_user(msg.from_user.id)
    if not u: return
    await msg.answer(
        f"<b>💰 EARNINGS\n\n💳 Balance: {fmt(u['balance'])} TON</b>",
        parse_mode="html", reply_markup=KB_EARN)

@dp.message(F.text == "📋 Tasks")
async def tasks_menu(msg: types.Message):
    uid = msg.from_user.id
    c   = get_db()
    tot  = c.execute("SELECT COUNT(*) as n FROM tasks WHERE active=1").fetchone()["n"]
    done = c.execute("SELECT COUNT(*) as n FROM completions WHERE user_id=?", (uid,)).fetchone()["n"]
    c.close()
    await msg.answer(
        f"<b>📋 TASKS\n\n📊 Available: {tot}\n✅ Completed: {done}\n💰 Reward: {gs('task_reward')} TON each</b>",
        parse_mode="html", reply_markup=KB_TASKS)

@dp.message(F.text == "📢 Ch.Tasks")
async def ch_tasks(msg: types.Message):
    uid  = msg.from_user.id
    c    = get_db()
    rows = c.execute("""SELECT * FROM tasks WHERE type='channel' AND active=1
        AND id NOT IN (SELECT task_id FROM completions WHERE user_id=?)
        ORDER BY id LIMIT 5""", (uid,)).fetchall()
    c.close()
    if not rows:
        await msg.answer("<b>📢 No channel tasks available.\nCheck back later!</b>",
                         parse_mode="html"); return
    for t in rows:
        await msg.answer(
            f"<b>📢 {t['name']}\n💰 Reward: {t['reward']} TON</b>",
            parse_mode="html",
            reply_markup=ikb([
                [InlineKeyboardButton(text=f"📢 Join {t['name']}", url=t["link"])],
                [InlineKeyboardButton(text="✅ Verify & Claim",
                                      callback_data=f"vch_{t['id']}")]
            ]))

@dp.callback_query(F.data.startswith("vch_"))
async def verify_ch(cb: types.CallbackQuery):
    uid = cb.from_user.id
    tid = int(cb.data.split("_")[1])
    c   = get_db()
    if c.execute("SELECT 1 FROM completions WHERE user_id=? AND task_id=?",
                 (uid, tid)).fetchone():
        await cb.answer("✅ Already completed!", show_alert=True)
        c.close(); return
    t = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
    c.close()
    if not t:
        await cb.answer("⚠️ Task not found!", show_alert=True); return
    if await check_task_member(t["username"], uid):
        c = get_db()
        c.execute("INSERT OR IGNORE INTO completions (user_id,task_id) VALUES (?,?)", (uid, tid))
        c.execute("UPDATE users SET balance=ROUND(balance+?,8) WHERE id=?", (t["reward"], uid))
        c.execute("UPDATE tasks SET done_count=done_count+1 WHERE id=?", (tid,))
        if t["owner"]:
            c.execute("UPDATE users SET ad_balance=ROUND(ad_balance-?,8) WHERE id=?",
                      (t["reward"], t["owner"]))
        c.commit(); c.close()
        await cb.answer(f"✅ +{t['reward']} TON added!", show_alert=True)
        try: await cb.message.edit_text(cb.message.text + "\n\n✅ COMPLETED!", reply_markup=None)
        except: pass
    else:
        await cb.answer("❌ You haven't joined yet!", show_alert=True)

@dp.message(F.text == "👥 Gr.Tasks")
async def gr_tasks(msg: types.Message):
    uid  = msg.from_user.id
    c    = get_db()
    rows = c.execute("""SELECT * FROM tasks WHERE type='group' AND active=1
        AND id NOT IN (SELECT task_id FROM completions WHERE user_id=?)
        ORDER BY id LIMIT 5""", (uid,)).fetchall()
    c.close()
    if not rows:
        await msg.answer("<b>👥 No group tasks available.\nCheck back later!</b>",
                         parse_mode="html"); return
    for t in rows:
        await msg.answer(
            f"<b>👥 {t['name']}\n💰 Reward: {t['reward']} TON</b>",
            parse_mode="html",
            reply_markup=ikb([
                [InlineKeyboardButton(text=f"👥 Join {t['name']}", url=t["link"])],
                [InlineKeyboardButton(text="✅ Verify & Claim",
                                      callback_data=f"vgr_{t['id']}")]
            ]))

@dp.callback_query(F.data.startswith("vgr_"))
async def verify_gr(cb: types.CallbackQuery):
    uid = cb.from_user.id
    tid = int(cb.data.split("_")[1])
    c   = get_db()
    if c.execute("SELECT 1 FROM completions WHERE user_id=? AND task_id=?",
                 (uid, tid)).fetchone():
        await cb.answer("✅ Already completed!", show_alert=True)
        c.close(); return
    t = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
    c.close()
    if not t:
        await cb.answer("⚠️ Task not found!", show_alert=True); return
    if await check_task_member(t["username"], uid):
        c = get_db()
        c.execute("INSERT OR IGNORE INTO completions (user_id,task_id) VALUES (?,?)", (uid, tid))
        c.execute("UPDATE users SET balance=ROUND(balance+?,8) WHERE id=?", (t["reward"], uid))
        c.execute("UPDATE tasks SET done_count=done_count+1 WHERE id=?", (tid,))
        if t["owner"]:
            c.execute("UPDATE users SET ad_balance=ROUND(ad_balance-?,8) WHERE id=?",
                      (t["reward"], t["owner"]))
        c.commit(); c.close()
        await cb.answer(f"✅ +{t['reward']} TON added!", show_alert=True)
        try: await cb.message.edit_text(cb.message.text + "\n\n✅ COMPLETED!", reply_markup=None)
        except: pass
    else:
        await cb.answer("❌ You haven't joined yet!", show_alert=True)

@dp.message(F.text == "🤖 Bot Tasks")
async def bot_tasks(msg: types.Message):
    uid  = msg.from_user.id
    c    = get_db()
    rows = c.execute("""SELECT * FROM tasks WHERE type='bot' AND active=1
        AND id NOT IN (SELECT task_id FROM completions WHERE user_id=?)
        ORDER BY id LIMIT 5""", (uid,)).fetchall()
    c.close()
    if not rows:
        await msg.answer("<b>🤖 No bot tasks available.\nCheck back later!</b>",
                         parse_mode="html"); return
    for t in rows:
        await msg.answer(
            f"<b>🤖 {t['name']}\n💰 Reward: {t['reward']} TON\n⏱ Stay: {t['min_secs']}s</b>",
            parse_mode="html",
            reply_markup=ikb([
                [InlineKeyboardButton(text=f"🤖 Start {t['name']}", url=t["link"])],
                [InlineKeyboardButton(text="▶️ Started — Begin Timer",
                                      callback_data=f"bstart_{t['id']}")]
            ]))

@dp.callback_query(F.data.startswith("bstart_"))
async def bot_task_start(cb: types.CallbackQuery):
    uid = cb.from_user.id
    tid = int(cb.data.split("_")[1])
    c   = get_db()
    if c.execute("SELECT 1 FROM completions WHERE user_id=? AND task_id=?",
                 (uid, tid)).fetchone():
        await cb.answer("✅ Already done!", show_alert=True)
        c.close(); return
    t = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
    c.close()
    if not t:
        await cb.answer("⚠️ Not found!", show_alert=True); return
    now = datetime.now().isoformat()
    c   = get_db()
    c.execute("INSERT OR REPLACE INTO bot_task_starts (user_id,task_id,started_at) VALUES (?,?,?)",
              (uid, tid, now))
    c.commit(); c.close()
    await cb.answer(f"⏱ Timer started! Wait {t['min_secs']}s.", show_alert=True)
    try:
        await cb.message.edit_text(
            cb.message.text + f"\n\n⏱ Timer started! Come back in {t['min_secs']}s.",
            reply_markup=ikb([[
                InlineKeyboardButton(text=f"✅ Verify after {t['min_secs']}s",
                                     callback_data=f"vbot_{tid}")
            ]]))
    except: pass

@dp.callback_query(F.data.startswith("vbot_"))
async def verify_bot(cb: types.CallbackQuery):
    uid = cb.from_user.id
    tid = int(cb.data.split("_")[1])
    c   = get_db()
    if c.execute("SELECT 1 FROM completions WHERE user_id=? AND task_id=?",
                 (uid, tid)).fetchone():
        await cb.answer("✅ Already done!", show_alert=True)
        c.close(); return
    t     = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
    start = c.execute("SELECT started_at FROM bot_task_starts WHERE user_id=? AND task_id=?",
                      (uid, tid)).fetchone()
    c.close()
    if not t:
        await cb.answer("⚠️ Not found!", show_alert=True); return
    if not start:
        await cb.answer("⚠️ Click Started first!", show_alert=True); return
    elapsed = (datetime.now() - datetime.fromisoformat(start["started_at"])).total_seconds()
    if elapsed < t["min_secs"]:
        rem = int(t["min_secs"] - elapsed)
        await cb.answer(f"⏳ Wait {rem}s more!", show_alert=True); return
    c = get_db()
    c.execute("INSERT OR IGNORE INTO completions (user_id,task_id) VALUES (?,?)", (uid, tid))
    c.execute("UPDATE users SET balance=ROUND(balance+?,8) WHERE id=?", (t["reward"], uid))
    c.execute("UPDATE tasks SET done_count=done_count+1 WHERE id=?", (tid,))
    if t["owner"]:
        c.execute("UPDATE users SET ad_balance=ROUND(ad_balance-?,8) WHERE id=?",
                  (t["reward"], t["owner"]))
    c.execute("DELETE FROM bot_task_starts WHERE user_id=? AND task_id=?", (uid, tid))
    c.commit(); c.close()
    await cb.answer(f"✅ +{t['reward']} TON!", show_alert=True)
    try: await cb.message.edit_text(cb.message.text + "\n\n✅ COMPLETED!", reply_markup=None)
    except: pass

@dp.message(F.text == "🎁 Daily")
async def daily(msg: types.Message):
    uid = msg.from_user.id
    u   = get_user(uid)
    if not u: return
    amt = float(gs("daily_bonus"))
    now = datetime.now()
    if u["last_daily"]:
        diff = (now - datetime.fromisoformat(u["last_daily"])).total_seconds()
        if diff < 86400:
            rem = int(86400 - diff)
            h, m = rem // 3600, (rem % 3600) // 60
            await msg.answer(
                f"<b>⏰ Already claimed!\nNext in: {h}h {m}m\n💰 Amount: {amt} TON</b>",
                parse_mode="html"); return
    c = get_db()
    c.execute("UPDATE users SET balance=ROUND(balance+?,8), last_daily=? WHERE id=?",
              (amt, now.isoformat(), uid))
    c.commit(); c.close()
    await msg.answer(f"<b>🎁 Claimed!\n💰 +{amt} TON!\n⏰ Come back in 24h!</b>",
                     parse_mode="html")

@dp.message(F.text == "🎟️ Promo")
async def promo_start(msg: types.Message, state: FSMContext):
    await state.clear()
    await msg.answer("<b>🎟️ Enter your promo code:</b>",
                     parse_mode="html", reply_markup=KB_CANCEL)
    await state.set_state(ST.promo)

@dp.message(ST.promo)
async def promo_check(msg: types.Message, state: FSMContext):
    uid = msg.from_user.id
    if is_cancel(msg.text):
        await state.clear()
        await msg.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=KB_EARN)
        return
    code = msg.text.strip().upper()
    c    = get_db()
    p    = c.execute("SELECT * FROM promos WHERE code=?", (code,)).fetchone()
    used = c.execute("SELECT 1 FROM used_promos WHERE user_id=? AND code=?",
                     (uid, code)).fetchone()
    if not p:
        await msg.answer("<b>❌ Invalid code.</b>", parse_mode="html")
    elif used:
        await msg.answer("<b>⚠️ Already used!</b>", parse_mode="html")
    elif p["uses"] <= 0:
        await msg.answer("<b>❌ Expired!</b>", parse_mode="html")
    else:
        c.execute("UPDATE promos SET uses=uses-1 WHERE code=?", (code,))
        c.execute("UPDATE users SET balance=ROUND(balance+?,8) WHERE id=?",
                  (p["amount"], uid))
        c.execute("INSERT INTO used_promos VALUES (?,?)", (uid, code))
        c.commit()
        await msg.answer(
            f"<b>🎉 +{p['amount']} TON!\n🎟️ Code: {code}</b>",
            parse_mode="html", reply_markup=KB_EARN)
    c.close()
    await state.clear()

@dp.message(F.text == "🏆 Top")
async def leaderboard(msg: types.Message):
    c    = get_db()
    rows = c.execute("SELECT name, refs FROM users ORDER BY refs DESC LIMIT 10").fetchall()
    c.close()
    medals = {0: "🥇", 1: "🥈", 2: "🥉"}
    lines  = [f"{medals.get(i, f'{i+1}.')} {r['name']} — {r['refs']} refs"
              for i, r in enumerate(rows)]
    await msg.answer(
        f"<b>🏆 LEADERBOARD\n\n" +
        ("\n".join(lines) if lines else "No referrals yet!") + "</b>",
        parse_mode="html")

# ════════════════════════════════════════════
#  ADS
# ════════════════════════════════════════════
@dp.message(F.text == "📢 Ads")
async def ads_menu(msg: types.Message):
    u = get_user(msg.from_user.id)
    if not u: return
    await msg.answer(
        f"<b>📢 ADVERTISE\n\n"
        f"💳 Ad Balance: {fmt(u['ad_balance'])} TON\n\n"
        f"📢 Channel: {gs('ad_ch_price')} TON\n"
        f"👥 Group:   {gs('ad_gr_price')} TON\n"
        f"🤖 Bot:     {gs('ad_bot_price')} TON\n\n"
        f"⚠️ 20% platform fee.\n"
        f"⚠️ Ad balance for ads only.</b>",
        parse_mode="html", reply_markup=KB_ADS)

@dp.message(F.text == "➕ New Ad")
async def new_ad(msg: types.Message):
    await msg.answer("<b>➕ Choose ad type:</b>",
                     parse_mode="html", reply_markup=KB_ADTYPE)

@dp.message(F.text.in_({"📢 Channel Ad", "👥 Group Ad", "🤖 Bot Ad"}))
async def start_ad(msg: types.Message, state: FSMContext):
    uid  = msg.from_user.id
    u    = get_user(uid)
    if not u: return
    text = msg.text
    if "Channel" in text:   atype, pkey, icon = "channel", "ad_ch_price",  "📢"
    elif "Group" in text:   atype, pkey, icon = "group",   "ad_gr_price",  "👥"
    else:                   atype, pkey, icon = "bot",     "ad_bot_price", "🤖"
    price = float(gs(pkey))
    if u["ad_balance"] < price:
        await msg.answer(
            f"<b>❌ Not enough ad balance!\n"
            f"💳 Yours: {fmt(u['ad_balance'])} TON\n"
            f"💰 Need: {price} TON</b>",
            parse_mode="html",
            reply_markup=ikb([[
                InlineKeyboardButton(text="💳 Deposit Now", callback_data="go_dep")
            ]])); return
    hint = "<code>NAME | @username | https://t.me/username</code>"
    if atype == "bot":
        hint = "<code>NAME | @username | https://t.me/username | SECONDS</code>"
    await msg.answer(
        f"<b>{icon} {atype.upper()} AD — {price} TON\n\nSend:\n{hint}</b>",
        parse_mode="html", reply_markup=KB_CANCEL)
    await state.clear()
    await state.set_state(ST.ad_info)
    await state.update_data(atype=atype, price=price, icon=icon)

@dp.callback_query(F.data == "go_dep")
async def go_dep_cb(cb: types.CallbackQuery, state: FSMContext):
    await cb.answer()
    await deposit_start(cb.message, state)

@dp.message(ST.ad_info)
async def process_ad(msg: types.Message, state: FSMContext):
    uid = msg.from_user.id
    if is_cancel(msg.text):
        await state.clear()
        await msg.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=KB_ADS)
        return
    d     = await state.get_data()
    atype = d["atype"]
    price = d["price"]
    icon  = d["icon"]
    try:
        parts   = [p.strip() for p in msg.text.strip().split("|")]
        name    = parts[0]
        uname   = parts[1]
        link    = parts[2]
        min_sec = int(parts[3]) if atype == "bot" and len(parts) > 3 else 30
        if not uname.startswith("@") or not link.startswith("https://t.me/"):
            raise ValueError
    except:
        hint = "<code>NAME | @username | https://t.me/username</code>"
        if atype == "bot": hint = "<code>NAME | @username | https://t.me/username | 30</code>"
        await msg.answer(f"<b>⚠️ Wrong format!\nUse:\n{hint}</b>", parse_mode="html")
        return
    commission = round(price * COMMISSION, 8)
    reward     = float(gs("task_reward"))
    c = get_db()
    c.execute("UPDATE users SET ad_balance=ROUND(ad_balance-?,8) WHERE id=?", (price, uid))
    c.execute("INSERT INTO tasks (type,name,username,link,reward,owner,active,min_secs) VALUES (?,?,?,?,?,?,0,?)",
              (atype, name, uname, link, reward, uid, min_sec))
    task_id = c.lastrowid
    c.commit(); c.close()
    add_balance(ADMIN_ID, commission)
    await state.clear()
    await msg.answer(
        f"<b>⏳ Ad Submitted!\n{icon} {name}\n🔗 {uname}\n💰 Paid: {price} TON\n\nPending admin review.</b>",
        parse_mode="html", reply_markup=KB_ADS)
    await bot.send_message(ADMIN_ID,
        f"<b>{icon} NEW AD #{task_id}\n👤 {uid}\n📌 {name}\n🔗 {uname}\n💰 {price} TON\n💎 Fee: {commission} TON</b>",
        parse_mode="html",
        reply_markup=ikb([[
            InlineKeyboardButton(text="✅ Approve", callback_data=f"aad_{task_id}"),
            InlineKeyboardButton(text="❌ Reject",  callback_data=f"rad_{task_id}_{uid}_{price}")
        ]]))

@dp.callback_query(F.data.startswith("aad_"))
async def approve_ad(cb: types.CallbackQuery):
    if cb.from_user.id != ADMIN_ID:
        await cb.answer("🚫 Denied!", show_alert=True); return
    tid = int(cb.data.split("_")[1])
    c   = get_db()
    c.execute("UPDATE tasks SET active=1 WHERE id=?", (tid,))
    t = c.execute("SELECT owner, name FROM tasks WHERE id=?", (tid,)).fetchone()
    c.commit(); c.close()
    if t:
        try: await bot.send_message(t["owner"],
            f"<b>✅ Ad '{t['name']}' is now live!</b>", parse_mode="html")
        except: pass
    try: await cb.message.edit_text(cb.message.text + "\n\n✅ APPROVED")
    except: pass
    await cb.answer("✅ Approved!")

@dp.callback_query(F.data.startswith("rad_"))
async def reject_ad(cb: types.CallbackQuery):
    if cb.from_user.id != ADMIN_ID:
        await cb.answer("🚫 Denied!", show_alert=True); return
    parts = cb.data.split("_")
    tid   = int(parts[1])
    owner = int(parts[2])
    price = float(parts[3])
    c = get_db()
    c.execute("DELETE FROM tasks WHERE id=?", (tid,))
    c.execute("UPDATE users SET ad_balance=ROUND(ad_balance+?,8) WHERE id=?", (price, owner))
    c.commit(); c.close()
    add_balance(ADMIN_ID, -(price * COMMISSION))
    try: await bot.send_message(owner,
        f"<b>❌ Ad rejected.\n💰 {price} TON refunded.</b>", parse_mode="html")
    except: pass
    try: await cb.message.edit_text(cb.message.text + "\n\n❌ REJECTED")
    except: pass
    await cb.answer("❌ Rejected!")

@dp.message(F.text == "📊 My Ads")
async def my_ads(msg: types.Message):
    uid = msg.from_user.id
    u   = get_user(uid)
    c   = get_db()
    ads = c.execute("SELECT * FROM tasks WHERE owner=? ORDER BY created DESC", (uid,)).fetchall()
    c.close()
    text = f"<b>📊 MY ADS\n\n💳 Ad Balance: {fmt(u['ad_balance'])} TON\n\n"
    if ads:
        icons = {"channel": "📢", "group": "👥", "bot": "🤖"}
        for a in ads:
            st = "✅ Live" if a["active"] else "⏳ Pending"
            text += f"{icons.get(a['type'],'📌')} {a['name']} — {st} ({a['done_count']} done)\n"
    else:
        text += "No ads yet. Create your first!"
    text += "</b>"
    await msg.answer(text, parse_mode="html")

# ════════════════════════════════════════════
#  BALANCE
# ════════════════════════════════════════════
@dp.message(F.text == "💳 Balance")
async def balance_menu(msg: types.Message):
    u = get_user(msg.from_user.id)
    if not u: return
    await msg.answer(
        f"<b>💳 MY BALANCE\n\n"
        f"💰 Main: {fmt(u['balance'])} TON\n"
        f"💼 Ads:  {fmt(u['ad_balance'])} TON</b>",
        parse_mode="html", reply_markup=KB_BAL)

# ════════════════════════════════════════════
#  DEPOSIT
# ════════════════════════════════════════════
@dp.message(F.text == "💳 Deposit")
async def deposit_start(msg: types.Message, state: FSMContext):
    await state.clear()
    await msg.answer(
        "<b>💳 DEPOSIT TON\n\n"
        "⚡ Auto via CryptoBot — Instant\n"
        "💸 Manual — Transfer then confirm</b>",
        parse_mode="html",
        reply_markup=ikb([
            [InlineKeyboardButton(text="0.05 TON", callback_data="dcp_0.05"),
             InlineKeyboardButton(text="0.10 TON", callback_data="dcp_0.10"),
             InlineKeyboardButton(text="0.50 TON", callback_data="dcp_0.50")],
            [InlineKeyboardButton(text="1.00 TON", callback_data="dcp_1.0"),
             InlineKeyboardButton(text="5.00 TON", callback_data="dcp_5.0"),
             InlineKeyboardButton(text="10.00 TON",callback_data="dcp_10.0")],
            [InlineKeyboardButton(text="💸 Manual TON Transfer", callback_data="dep_manual")]
        ]))

@dp.callback_query(F.data.startswith("dcp_"))
async def dep_cryptobot(cb: types.CallbackQuery):
    uid    = cb.from_user.id
    amount = float(cb.data.split("_")[1])
    await cb.answer()
    await cb.message.answer("<b>⏳ Creating invoice...</b>", parse_mode="html")
    try:
        res = await cb_create_invoice(amount, uid)
        if res.get("ok"):
            inv    = res["result"]
            inv_id = str(inv["invoice_id"])
            url    = inv["pay_url"]
            c = get_db()
            c.execute("INSERT INTO deposits (user_id,amount,method,invoice_id,status) VALUES (?,?,'cryptobot',?,'pending')",
                      (uid, amount, inv_id))
            c.commit(); c.close()
            await cb.message.answer(
                f"<b>⚡ INVOICE\n💰 {amount} TON\n🆔 #{inv_id}\n\n1. Pay\n2. Click Verify</b>",
                parse_mode="html",
                reply_markup=ikb([
                    [InlineKeyboardButton(text="⚡ Pay Now", url=url)],
                    [InlineKeyboardButton(text="✅ I Paid — Verify",
                                          callback_data=f"vdep_{inv_id}")]
                ]))
        else:
            await cb.message.answer("<b>⚠️ Error. Try manual deposit.</b>", parse_mode="html")
    except Exception as e:
        log.error(f"Invoice error: {e}")
        await cb.message.answer("<b>⚠️ Service error. Try manual.</b>", parse_mode="html")

@dp.callback_query(F.data.startswith("vdep_"))
async def verify_dep(cb: types.CallbackQuery):
    uid    = cb.from_user.id
    inv_id = cb.data.split("_")[1]
    await cb.answer()
    try:
        res = await cb_check_invoice(inv_id)
        if res.get("ok"):
            items = res["result"].get("items", [])
            if items and items[0]["status"] == "paid":
                c   = get_db()
                dep = c.execute("SELECT * FROM deposits WHERE invoice_id=? AND user_id=?",
                                (inv_id, uid)).fetchone()
                if dep and dep["status"] == "pending":
                    amount = dep["amount"]
                    c.execute("UPDATE deposits SET status='done' WHERE invoice_id=?", (inv_id,))
                    c.execute("UPDATE users SET ad_balance=ROUND(ad_balance+?,8) WHERE id=?",
                              (amount, uid))
                    c.commit(); c.close()
                    try: await cb.message.edit_text(
                        cb.message.text + "\n\n✅ CONFIRMED!", reply_markup=None)
                    except: pass
                    await cb.message.answer(
                        f"<b>✅ Deposit Confirmed!\n💰 {amount} TON added to Ad Balance!</b>",
                        parse_mode="html")
                else:
                    c.close()
                    await cb.message.answer("<b>ℹ️ Already processed.</b>", parse_mode="html")
            elif items and items[0]["status"] == "active":
                await cb.message.answer("<b>⏳ Not paid yet. Pay first.</b>", parse_mode="html")
            else:
                await cb.message.answer("<b>❌ Invoice expired. Create new.</b>", parse_mode="html")
    except Exception as e:
        log.error(f"Verify dep error: {e}")
        await cb.message.answer("<b>⚠️ Error. Try again.</b>", parse_mode="html")

@dp.callback_query(F.data == "dep_manual")
async def dep_manual_start(cb: types.CallbackQuery, state: FSMContext):
    uid = cb.from_user.id
    await cb.answer()
    await state.clear()
    await cb.message.answer(
        f"<b>💸 MANUAL DEPOSIT\n\n"
        f"1️⃣ Send TON to:\n<code>{ADMIN_WALLET}</code>\n\n"
        f"2️⃣ Include your ID in memo:\n<code>{uid}</code>\n\n"
        f"3️⃣ Enter amount sent here:</b>",
        parse_mode="html", reply_markup=KB_CANCEL)
    await state.set_state(ST.dep_manual)

@dp.message(ST.dep_manual)
async def dep_manual_amount(msg: types.Message, state: FSMContext):
    uid = msg.from_user.id
    if is_cancel(msg.text):
        await state.clear()
        await msg.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=KB_BAL)
        return
    try:
        amount = parse_float(msg.text)
        if amount < 0.01: raise ValueError
    except:
        await msg.answer("<b>⚠️ Invalid. Min 0.01 TON\nExample: 0.5</b>",
                         parse_mode="html"); return
    c = get_db()
    c.execute("INSERT INTO deposits (user_id,amount,method,status) VALUES (?,?,'manual','pending')",
              (uid, amount))
    dep_id = c.lastrowid
    c.commit(); c.close()
    await state.clear()
    await msg.answer(
        f"<b>⏳ Request sent!\n💰 {amount} TON\n🆔 #{dep_id}\nAdmin will verify soon.</b>",
        parse_mode="html", reply_markup=KB_BAL)
    await bot.send_message(ADMIN_ID,
        f"<b>💸 MANUAL DEPOSIT #{dep_id}\n👤 {uid} ({msg.from_user.first_name})\n💰 {amount} TON\n⚠️ Check memo: {uid}</b>",
        parse_mode="html",
        reply_markup=ikb([[
            InlineKeyboardButton(text="✅ Approve", callback_data=f"adep_{dep_id}"),
            InlineKeyboardButton(text="❌ Reject",  callback_data=f"rdep_{dep_id}")
        ]]))

@dp.callback_query(F.data.startswith("adep_"))
async def approve_dep(cb: types.CallbackQuery):
    if cb.from_user.id != ADMIN_ID:
        await cb.answer("🚫 Denied!", show_alert=True); return
    dep_id = int(cb.data.split("_")[1])
    c = get_db()
    d = c.execute("SELECT * FROM deposits WHERE id=?", (dep_id,)).fetchone()
    if not d or d["status"] != "pending":
        await cb.answer("⚠️ Already done!", show_alert=True); c.close(); return
    c.execute("UPDATE deposits SET status='done' WHERE id=?", (dep_id,))
    c.execute("UPDATE users SET ad_balance=ROUND(ad_balance+?,8) WHERE id=?",
              (d["amount"], d["user_id"]))
    c.commit(); c.close()
    try: await bot.send_message(d["user_id"],
        f"<b>✅ Deposit approved!\n💰 {d['amount']} TON added!</b>", parse_mode="html")
    except: pass
    try: await cb.message.edit_text(cb.message.text + "\n\n✅ APPROVED")
    except: pass
    await cb.answer("✅ Approved!")

@dp.callback_query(F.data.startswith("rdep_"))
async def reject_dep(cb: types.CallbackQuery):
    if cb.from_user.id != ADMIN_ID:
        await cb.answer("🚫 Denied!", show_alert=True); return
    dep_id = int(cb.data.split("_")[1])
    c = get_db()
    d = c.execute("SELECT * FROM deposits WHERE id=?", (dep_id,)).fetchone()
    if not d or d["status"] != "pending":
        await cb.answer("⚠️ Already done!", show_alert=True); c.close(); return
    c.execute("UPDATE deposits SET status='rejected' WHERE id=?", (dep_id,))
    c.commit(); c.close()
    try: await bot.send_message(d["user_id"],
        "<b>❌ Deposit rejected.</b>", parse_mode="html")
    except: pass
    try: await cb.message.edit_text(cb.message.text + "\n\n❌ REJECTED")
    except: pass
    await cb.answer("❌ Rejected!")

# ════════════════════════════════════════════
#  WITHDRAW
# ════════════════════════════════════════════
@dp.message(F.text == "📤 Withdraw")
async def withdraw_start(msg: types.Message, state: FSMContext):
    uid = msg.from_user.id
    u   = get_user(uid)
    if not u: return
    if u["banned"]:
        await msg.answer("<b>🚫 You are banned.</b>", parse_mode="html"); return
    if gs("withdrawals") != "1":
        await msg.answer("<b>⚠️ Withdrawals disabled.</b>", parse_mode="html"); return
    min_w = float(gs("min_withdraw"))
    max_w = float(gs("max_withdraw"))
    if u["balance"] < min_w:
        await msg.answer(
            f"<b>❌ Insufficient balance.\n💳 Yours: {fmt(u['balance'])} TON\n📌 Min: {min_w} TON</b>",
            parse_mode="html"); return
    await state.clear()
    await msg.answer(
        f"<b>📤 WITHDRAW TON\n\n💳 Balance: {fmt(u['balance'])} TON\n📌 Min: {min_w} | Max: {max_w} TON\n\nEnter amount:</b>",
        parse_mode="html", reply_markup=KB_CANCEL)
    await state.set_state(ST.withdraw_amt)

@dp.message(ST.withdraw_amt)
async def withdraw_amount(msg: types.Message, state: FSMContext):
    uid = msg.from_user.id
    if is_cancel(msg.text):
        await state.clear()
        await msg.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=KB_BAL)
        return
    try:
        amount = parse_float(msg.text)
    except:
        await msg.answer("<b>⚠️ Invalid amount. Example: 0.05</b>", parse_mode="html")
        return
    u     = get_user(uid)
    min_w = float(gs("min_withdraw"))
    max_w = float(gs("max_withdraw"))
    if amount < min_w:
        await msg.answer(f"<b>⚠️ Min: {min_w} TON</b>", parse_mode="html"); return
    if amount > max_w:
        await msg.answer(f"<b>⚠️ Max: {max_w} TON</b>", parse_mode="html"); return
    if amount > u["balance"]:
        await msg.answer("<b>⚠️ Insufficient balance.</b>", parse_mode="html"); return
    await state.update_data(w_amount=amount)
    await msg.answer(
        f"<b>💵 Amount: {amount} TON\n\nChoose method:</b>",
        parse_mode="html", reply_markup=KB_WTYPE)
    await state.set_state(ST.withdraw_meth)

@dp.message(ST.withdraw_meth)
async def withdraw_method(msg: types.Message, state: FSMContext):
    uid  = msg.from_user.id
    text = msg.text.strip()

    if is_cancel(text):
        await state.clear()
        await msg.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=KB_BAL)
        return

    # Check valid method
    is_crypto = "Auto" in text or "CryptoBot" in text
    is_manual = "Manual" in text or "Admin" in text

    if not is_crypto and not is_manual:
        await msg.answer("<b>⚠️ Please choose a method from the buttons.</b>",
                         parse_mode="html", reply_markup=KB_WTYPE)
        return

    d      = await state.get_data()
    amount = d.get("w_amount", 0)
    u      = get_user(uid)

    if not amount or amount > u["balance"]:
        await state.clear()
        await msg.answer("<b>⚠️ Balance changed. Try again.</b>",
                         parse_mode="html", reply_markup=KB_BAL)
        return

    # Deduct balance
    c = get_db()
    c.execute("UPDATE users SET balance=ROUND(balance-?,8) WHERE id=?", (amount, uid))
    method = "cryptobot" if is_crypto else "manual"
    c.execute("INSERT INTO withdrawals (user_id,amount,method,status) VALUES (?,?,?,?)",
              (uid, amount, method, "processing"))
    w_id = c.lastrowid
    c.commit(); c.close()
    await state.clear()

    if is_crypto:
        await msg.answer("<b>⏳ Processing via CryptoBot...</b>",
                         parse_mode="html", reply_markup=KB_BAL)
        try:
            res = await cb_transfer(uid, amount, f"w_{w_id}_{uid}")
            if res.get("ok"):
                c = get_db()
                c.execute("UPDATE withdrawals SET status='done' WHERE id=?", (w_id,))
                c.commit(); c.close()
                await msg.answer(
                    f"<b>✅ Withdrawal Successful!\n💵 {amount} TON sent!\n📲 Check @CryptoBot! 🎉</b>",
                    parse_mode="html")
                try:
                    await bot.send_message(WITHDRAW_CHANNEL,
                        f"<b>✅ Withdrawal\n👤 {uid}\n💵 {amount} TON via CryptoBot</b>",
                        parse_mode="html")
                except: pass
            else:
                err = res.get("error", {}).get("name", "Unknown")
                c = get_db()
                c.execute("UPDATE users SET balance=ROUND(balance+?,8) WHERE id=?", (amount, uid))
                c.execute("UPDATE withdrawals SET status='failed' WHERE id=?", (w_id,))
                c.commit(); c.close()
                await msg.answer(
                    f"<b>❌ CryptoBot failed: {err}\n💰 {amount} TON returned.\nTry Manual method.</b>",
                    parse_mode="html")
        except Exception as e:
            log.error(f"Withdraw error: {e}")
            c = get_db()
            c.execute("UPDATE users SET balance=ROUND(balance+?,8) WHERE id=?", (amount, uid))
            c.execute("UPDATE withdrawals SET status='failed' WHERE id=?", (w_id,))
            c.commit(); c.close()
            await msg.answer("<b>❌ Error. Amount returned.</b>", parse_mode="html")
    else:
        u2     = get_user(uid)
        wallet = u2["wallet"] or "Not set"
        await msg.answer(
            f"<b>⏳ Manual Withdrawal Requested!\n💵 {amount} TON\n👛 {wallet}\nAdmin will send soon.</b>",
            parse_mode="html", reply_markup=KB_BAL)
        await bot.send_message(ADMIN_ID,
            f"<b>📤 MANUAL WITHDRAWAL #{w_id}\n👤 {uid} ({msg.from_user.first_name})\n💵 {amount} TON\n👛 <code>{wallet}</code></b>",
            parse_mode="html",
            reply_markup=ikb([[
                InlineKeyboardButton(text="✅ Sent",
                                     callback_data=f"wsent_{w_id}_{uid}_{amount}"),
                InlineKeyboardButton(text="❌ Reject",
                                     callback_data=f"wreject_{w_id}_{uid}_{amount}")
            ]]))

@dp.callback_query(F.data.startswith("wsent_"))
async def withdraw_sent(cb: types.CallbackQuery):
    if cb.from_user.id != ADMIN_ID:
        await cb.answer("🚫 Denied!", show_alert=True); return
    parts  = cb.data.split("_")
    w_id   = int(parts[1])
    uid    = int(parts[2])
    amount = float(parts[3])
    c = get_db()
    c.execute("UPDATE withdrawals SET status='done' WHERE id=?", (w_id,))
    c.commit(); c.close()
    try: await bot.send_message(uid,
        f"<b>✅ Withdrawal sent!\n💵 {amount} TON to your wallet! 🎉</b>",
        parse_mode="html")
    except: pass
    try: await bot.send_message(WITHDRAW_CHANNEL,
        f"<b>✅ Manual Withdrawal\n👤 {uid}\n💵 {amount} TON\n✅ Sent by Admin</b>",
        parse_mode="html")
    except: pass
    try: await cb.message.edit_text(cb.message.text + "\n\n✅ SENT")
    except: pass
    await cb.answer("✅ Marked sent!")

@dp.callback_query(F.data.startswith("wreject_"))
async def withdraw_reject(cb: types.CallbackQuery):
    if cb.from_user.id != ADMIN_ID:
        await cb.answer("🚫 Denied!", show_alert=True); return
    parts  = cb.data.split("_")
    w_id   = int(parts[1])
    uid    = int(parts[2])
    amount = float(parts[3])
    c = get_db()
    c.execute("UPDATE withdrawals SET status='rejected' WHERE id=?", (w_id,))
    c.execute("UPDATE users SET balance=ROUND(balance+?,8) WHERE id=?", (amount, uid))
    c.commit(); c.close()
    try: await bot.send_message(uid,
        f"<b>❌ Withdrawal rejected.\n💰 {amount} TON returned.</b>",
        parse_mode="html")
    except: pass
    try: await cb.message.edit_text(cb.message.text + "\n\n❌ REJECTED & REFUNDED")
    except: pass
    await cb.answer("❌ Rejected!")

# ════════════════════════════════════════════
#  SETTINGS / PROFILE
# ════════════════════════════════════════════
@dp.message(F.text == "⚙️ Settings")
async def settings_menu(msg: types.Message):
    u = get_user(msg.from_user.id)
    w = u["wallet"] or "Not set"
    await msg.answer(f"<b>⚙️ SETTINGS\n\n👛 Wallet: <code>{w}</code></b>",
                     parse_mode="html", reply_markup=KB_SET)

@dp.message(F.text == "👛 Wallet")
async def wallet_menu(msg: types.Message, state: FSMContext):
    await state.clear()
    await msg.answer("<b>👛 Send your TON wallet address:</b>",
                     parse_mode="html", reply_markup=KB_CANCEL)
    await state.set_state(ST.wallet)

@dp.message(ST.wallet)
async def save_wallet(msg: types.Message, state: FSMContext):
    if is_cancel(msg.text):
        await state.clear()
        await msg.answer("<b>❌ Cancelled.</b>", parse_mode="html", reply_markup=KB_SET)
        return
    addr = msg.text.strip()
    if len(addr) < 10:
        await msg.answer("<b>⚠️ Invalid address.</b>", parse_mode="html"); return
    c = get_db()
    c.execute("UPDATE users SET wallet=? WHERE id=?", (addr, msg.from_user.id))
    c.commit(); c.close()
    await state.clear()
    await msg.answer(f"<b>✅ Wallet saved!\n<code>{addr}</code></b>",
                     parse_mode="html", reply_markup=KB_SET)

@dp.message(F.text == "👤 Profile")
async def profile(msg: types.Message):
    uid = msg.from_user.id
    u   = get_user(uid)
    c   = get_db()
    done = c.execute("SELECT COUNT(*) as n FROM completions WHERE user_id=?", (uid,)).fetchone()["n"]
    c.close()
    w = u["wallet"] or "Not set"
    await msg.answer(
        f"<b>╔══════════════════╗\n       👤 PROFILE\n╚══════════════════╝\n\n"
        f"🆔 <a href='tg://user?id={uid}'>{msg.from_user.first_name}</a>\n"
        f"🏅 Rank: {user_rank(u['refs'])}\n\n"
        f"💰 Balance:    {fmt(u['balance'])} TON\n"
        f"💼 Ad Balance: {fmt(u['ad_balance'])} TON\n"
        f"👥 Referrals:  {u['refs']}\n"
        f"✅ Tasks Done: {done}\n\n"
        f"👛 <code>{w}</code></b>",
        parse_mode="html")

# ════════════════════════════════════════════
#  REFERRALS
# ════════════════════════════════════════════
@dp.message(F.text == "👥 Referrals")
async def refs_menu(msg: types.Message):
    u = get_user(msg.from_user.id)
    if not u: return
    await msg.answer(
        f"<b>👥 REFERRALS\n\n💰 Per Ref: {gs('ref_bonus')} TON\n"
        f"👥 Your refs: {u['refs']}\n💳 Balance: {fmt(u['balance'])} TON</b>",
        parse_mode="html", reply_markup=KB_REF)

@dp.message(F.text == "🔗 My Link")
async def my_link(msg: types.Message):
    uid  = msg.from_user.id
    info = await bot.get_me()
    link = f"https://t.me/{info.username}?start={uid}"
    await msg.answer(
        f"<b>🔗 YOUR REFERRAL LINK\n\n<code>{link}</code>\n\n"
        f"💰 Earn {gs('ref_bonus')} TON per referral!</b>",
        parse_mode="html")

# ════════════════════════════════════════════
#  STATS
# ════════════════════════════════════════════
@dp.message(F.text == "📊 Stats")
async def show_stats(msg: types.Message):
    uid = msg.from_user.id
    u, w, d, t = get_stats()
    if uid == ADMIN_ID:
        me = get_user(ADMIN_ID)
        sw = "✅ ON" if gs("withdrawals") == "1" else "❌ OFF"
        await msg.answer(
            f"<b>📊 ADMIN STATS\n\n👥 Users: {u}\n"
            f"📤 Withdrawn: {fmt(w)} TON\n"
            f"💳 Deposited: {fmt(d)} TON\n"
            f"📋 Tasks: {t}\n"
            f"💎 Commission: {fmt(me['balance'])} TON\n"
            f"📤 Withdrawals: {sw}</b>",
            parse_mode="html")
    else:
        await msg.answer(
            f"<b>📊 BOT STATS\n\n👥 Users: {u}\n"
            f"📤 Withdrawn: {fmt(w)} TON\n"
            f"💳 Deposited: {fmt(d)} TON\n"
            f"📋 Active Tasks: {t}\n"
            f"💰 Per Ref: {gs('ref_bonus')} TON\n"
            f"📌 Min Withdraw: {gs('min_withdraw')} TON</b>",
            parse_mode="html")

# ════════════════════════════════════════════
#  ADMIN
# ════════════════════════════════════════════
@dp.message(F.text == "🛡️ Admin")
async def admin_panel(msg: types.Message):
    if msg.from_user.id != ADMIN_ID: return
    u, w, d, t = get_stats()
    me = get_user(ADMIN_ID)
    sw = "✅ ON" if gs("withdrawals") == "1" else "❌ OFF"
    await msg.answer(
        f"<b>🛡️ ADMIN PANEL\n\n👥 Users: {u}\n"
        f"💰 Withdrawn: {fmt(w)} TON\n"
        f"💳 Deposited: {fmt(d)} TON\n"
        f"📋 Tasks: {t}\n"
        f"💎 Commission: {fmt(me['balance'])} TON\n"
        f"📤 Withdrawals: {sw}</b>",
        parse_mode="html", reply_markup=KB_ADMIN)

@dp.message(F.text == "⚙️ Config")
async def admin_config(msg: types.Message):
    if msg.from_user.id != ADMIN_ID: return
    await msg.answer(
        f"<b>⚙️ SETTINGS\n\n"
        f"💰 Ref: {gs('ref_bonus')} TON\n"
        f"🎁 Daily: {gs('daily_bonus')} TON\n"
        f"📉 MinW: {gs('min_withdraw')} TON\n"
        f"📈 MaxW: {gs('max_withdraw')} TON\n"
        f"📢 Ch Ad: {gs('ad_ch_price')} TON\n"
        f"👥 Gr Ad: {gs('ad_gr_price')} TON\n"
        f"🤖 Bot Ad: {gs('ad_bot_price')} TON\n"
        f"📤 Withdrawals: {'ON' if gs('withdrawals')=='1' else 'OFF'}</b>",
        parse_mode="html", reply_markup=KB_ACONF)

async def ask_val(msg, state, st, label, current):
    await state.clear()
    await msg.answer(f"<b>Current {label}: {current}\n\nSend new value:</b>",
                     parse_mode="html", reply_markup=KB_CANCEL)
    await state.set_state(st)

@dp.message(F.text == "💰 Ref Bonus")
async def a_ref(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await ask_val(msg, state, ST.a_ref, "Ref Bonus (TON)", gs("ref_bonus"))

@dp.message(ST.a_ref)
async def pr_ref(msg: types.Message, state: FSMContext):
    if is_cancel(msg.text):
        await state.clear(); await msg.answer("❌", reply_markup=KB_ACONF); return
    try:
        val = parse_float(msg.text)
        if val <= 0: raise ValueError
        ss("ref_bonus", val)
        await msg.answer(f"<b>✅ Ref bonus: {val} TON</b>", parse_mode="html", reply_markup=KB_ACONF)
    except: await msg.answer("<b>⚠️ Invalid. Example: 0.01</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "🎁 Daily Bonus")
async def a_daily(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await ask_val(msg, state, ST.a_daily, "Daily Bonus (TON)", gs("daily_bonus"))

@dp.message(ST.a_daily)
async def pr_daily(msg: types.Message, state: FSMContext):
    if is_cancel(msg.text):
        await state.clear(); await msg.answer("❌", reply_markup=KB_ACONF); return
    try:
        val = parse_float(msg.text)
        if val <= 0: raise ValueError
        ss("daily_bonus", val)
        await msg.answer(f"<b>✅ Daily: {val} TON</b>", parse_mode="html", reply_markup=KB_ACONF)
    except: await msg.answer("<b>⚠️ Invalid. Example: 0.001</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "📉 Min Withdraw")
async def a_min(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await ask_val(msg, state, ST.a_min_w, "Min Withdraw (TON)", gs("min_withdraw"))

@dp.message(ST.a_min_w)
async def pr_min(msg: types.Message, state: FSMContext):
    if is_cancel(msg.text):
        await state.clear(); await msg.answer("❌", reply_markup=KB_ACONF); return
    try:
        val = parse_float(msg.text)
        if val <= 0: raise ValueError
        ss("min_withdraw", val)
        await msg.answer(f"<b>✅ Min withdraw: {val} TON</b>", parse_mode="html", reply_markup=KB_ACONF)
    except: await msg.answer("<b>⚠️ Invalid. Example: 0.01</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "📈 Max Withdraw")
async def a_max(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await ask_val(msg, state, ST.a_max_w, "Max Withdraw (TON)", gs("max_withdraw"))

@dp.message(ST.a_max_w)
async def pr_max(msg: types.Message, state: FSMContext):
    if is_cancel(msg.text):
        await state.clear(); await msg.answer("❌", reply_markup=KB_ACONF); return
    try:
        val = parse_float(msg.text)
        if val <= 0: raise ValueError
        ss("max_withdraw", val)
        await msg.answer(f"<b>✅ Max withdraw: {val} TON</b>", parse_mode="html", reply_markup=KB_ACONF)
    except: await msg.answer("<b>⚠️ Invalid. Example: 10.0</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "🔄 Toggle W")
async def a_toggle(msg: types.Message):
    if msg.from_user.id != ADMIN_ID: return
    nw = "0" if gs("withdrawals") == "1" else "1"
    ss("withdrawals", nw)
    await msg.answer(f"<b>Withdrawals: {'✅ ON' if nw=='1' else '❌ OFF'}</b>",
                     parse_mode="html")

@dp.message(F.text == "💼 Ad Prices")
async def a_adprices(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await state.clear()
    await msg.answer(
        f"<b>Current: Ch={gs('ad_ch_price')} Gr={gs('ad_gr_price')} Bot={gs('ad_bot_price')}\n\n"
        f"Send: <code>CH GR BOT</code>\nExample: <code>0.05 0.03 0.02</code></b>",
        parse_mode="html", reply_markup=KB_CANCEL)
    await state.set_state(ST.a_ad_price)

@dp.message(ST.a_ad_price)
async def pr_adprices(msg: types.Message, state: FSMContext):
    if is_cancel(msg.text):
        await state.clear(); await msg.answer("❌", reply_markup=KB_ACONF); return
    try:
        p = msg.text.strip().split()
        ss("ad_ch_price",  parse_float(p[0]))
        ss("ad_gr_price",  parse_float(p[1]))
        ss("ad_bot_price", parse_float(p[2]))
        await msg.answer(f"<b>✅ Ad prices: Ch={p[0]} Gr={p[1]} Bot={p[2]} TON</b>",
                         parse_mode="html", reply_markup=KB_ACONF)
    except: await msg.answer("<b>⚠️ Use: CH GR BOT</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "💰 Add Balance")
async def a_addbal(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await state.clear()
    await msg.answer("<b>Send: <code>USER_ID AMOUNT</code></b>",
                     parse_mode="html", reply_markup=KB_CANCEL)
    await state.set_state(ST.a_balance)

@dp.message(ST.a_balance)
async def pr_addbal(msg: types.Message, state: FSMContext):
    if is_cancel(msg.text):
        await state.clear(); await msg.answer("❌", reply_markup=KB_ADMIN); return
    try:
        p   = msg.text.strip().split()
        tid = int(p[0])
        amt = parse_float(p[1])
        add_balance(tid, amt)
        try: await bot.send_message(tid, f"<b>🎁 Admin added {amt} TON!</b>", parse_mode="html")
        except: pass
        await msg.answer(f"<b>✅ Added {amt} TON to {tid}.</b>",
                         parse_mode="html", reply_markup=KB_ADMIN)
    except: await msg.answer("<b>⚠️ Use: USER_ID AMOUNT</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "📢 Broadcast")
async def a_broadcast(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await state.clear()
    await msg.answer("<b>📢 Send broadcast message:</b>",
                     parse_mode="html", reply_markup=KB_CANCEL)
    await state.set_state(ST.a_broadcast)

@dp.message(ST.a_broadcast)
async def pr_broadcast(msg: types.Message, state: FSMContext):
    if is_cancel(msg.text):
        await state.clear(); await msg.answer("❌", reply_markup=KB_ADMIN); return
    c    = get_db()
    uids = c.execute("SELECT id FROM users WHERE banned=0").fetchall()
    c.close()
    sent = 0
    for row in uids:
        try:
            await bot.send_message(row["id"],
                f"📢 <b>Announcement</b>\n\n{msg.text}", parse_mode="html")
            sent += 1
            await asyncio.sleep(0.05)
        except: pass
    await state.clear()
    await msg.answer(f"<b>✅ Sent to {sent} users.</b>",
                     parse_mode="html", reply_markup=KB_ADMIN)

@dp.message(F.text == "🚫 Ban User")
async def a_ban(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await state.clear()
    await msg.answer("<b>Send User ID to ban:</b>",
                     parse_mode="html", reply_markup=KB_CANCEL)
    await state.set_state(ST.a_ban)

@dp.message(ST.a_ban)
async def pr_ban(msg: types.Message, state: FSMContext):
    if is_cancel(msg.text):
        await state.clear(); await msg.answer("❌", reply_markup=KB_ADMIN); return
    try:
        tid = int(msg.text.strip())
        c = get_db()
        c.execute("UPDATE users SET banned=1 WHERE id=?", (tid,))
        c.commit(); c.close()
        try: await bot.send_message(tid, "<b>🚫 You are banned.</b>", parse_mode="html")
        except: pass
        await msg.answer(f"<b>✅ {tid} banned.</b>", parse_mode="html", reply_markup=KB_ADMIN)
    except: await msg.answer("<b>⚠️ Error.</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "✅ Unban User")
async def a_unban(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await state.clear()
    await msg.answer("<b>Send User ID to unban:</b>",
                     parse_mode="html", reply_markup=KB_CANCEL)
    await state.set_state(ST.a_unban)

@dp.message(ST.a_unban)
async def pr_unban(msg: types.Message, state: FSMContext):
    if is_cancel(msg.text):
        await state.clear(); await msg.answer("❌", reply_markup=KB_ADMIN); return
    try:
        tid = int(msg.text.strip())
        c = get_db()
        c.execute("UPDATE users SET banned=0 WHERE id=?", (tid,))
        c.commit(); c.close()
        try: await bot.send_message(tid, "<b>✅ You are unbanned!</b>", parse_mode="html")
        except: pass
        await msg.answer(f"<b>✅ {tid} unbanned.</b>", parse_mode="html", reply_markup=KB_ADMIN)
    except: await msg.answer("<b>⚠️ Error.</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "🎟️ Create Promo")
async def a_promo(msg: types.Message, state: FSMContext):
    if msg.from_user.id != ADMIN_ID: return
    await state.clear()
    await msg.answer(
        "<b>Format: <code>CODE AMOUNT USES</code>\nExample: <code>BONUS2024 0.05 100</code></b>",
        parse_mode="html", reply_markup=KB_CANCEL)
    await state.set_state(ST.a_promo)

@dp.message(ST.a_promo)
async def pr_promo(msg: types.Message, state: FSMContext):
    if is_cancel(msg.text):
        await state.clear(); await msg.answer("❌", reply_markup=KB_ADMIN); return
    try:
        p    = msg.text.strip().split()
        code = p[0].upper()
        amt  = parse_float(p[1])
        uses = int(p[2])
        if amt <= 0 or uses <= 0: raise ValueError
        c = get_db()
        c.execute("INSERT OR REPLACE INTO promos (code,amount,uses) VALUES (?,?,?)",
                  (code, amt, uses))
        c.commit(); c.close()
        await msg.answer(f"<b>✅ Promo <code>{code}</code> — {amt} TON × {uses}</b>",
                         parse_mode="html", reply_markup=KB_ADMIN)
    except: await msg.answer("<b>⚠️ Use: CODE AMOUNT USES</b>", parse_mode="html")
    await state.clear()

@dp.message(F.text == "📋 Pending Ads")
async def a_ads(msg: types.Message):
    if msg.from_user.id != ADMIN_ID: return
    c   = get_db()
    ads = c.execute("SELECT * FROM tasks WHERE active=0").fetchall()
    c.close()
    if not ads:
        await msg.answer("<b>✅ No pending ads!</b>", parse_mode="html"); return
    icons = {"channel": "📢", "group": "👥", "bot": "🤖"}
    for a in ads:
        await msg.answer(
            f"<b>{icons.get(a['type'],'📌')} #{a['id']} — {a['name']}\n🔗 {a['username']}\n👤 {a['owner']}</b>",
            parse_mode="html",
            reply_markup=ikb([[
                InlineKeyboardButton(text="✅ Approve", callback_data=f"aad_{a['id']}"),
                InlineKeyboardButton(text="❌ Reject",
                                     callback_data=f"rad_{a['id']}_{a['owner']}_{gs('ad_ch_price')}")
            ]]))

@dp.message(F.text == "💳 Deposits")
async def a_deposits(msg: types.Message):
    if msg.from_user.id != ADMIN_ID: return
    c    = get_db()
    deps = c.execute("SELECT * FROM deposits WHERE status='pending' ORDER BY created DESC").fetchall()
    c.close()
    if not deps:
        await msg.answer("<b>✅ No pending deposits!</b>", parse_mode="html"); return
    for d in deps:
        method = "⚡ CryptoBot" if d["method"] == "cryptobot" else "💸 Manual"
        await msg.answer(
            f"<b>💳 #{d['id']} {method}\n👤 {d['user_id']}\n💰 {d['amount']} TON</b>",
            parse_mode="html",
            reply_markup=ikb([[
                InlineKeyboardButton(text="✅ Approve", callback_data=f"adep_{d['id']}"),
                InlineKeyboardButton(text="❌ Reject",  callback_data=f"rdep_{d['id']}")
            ]]))

@dp.message(F.text == "📤 Withdrawals")
async def a_withdrawals(msg: types.Message):
    if msg.from_user.id != ADMIN_ID: return
    c    = get_db()
    rows = c.execute("SELECT * FROM withdrawals WHERE status='processing' ORDER BY created DESC").fetchall()
    c.close()
    if not rows:
        await msg.answer("<b>✅ No pending withdrawals!</b>", parse_mode="html"); return
    for w in rows:
        u2     = get_user(w["user_id"])
        wallet = u2["wallet"] if u2 else "Not set"
        await msg.answer(
            f"<b>📤 #{w['id']}\n👤 {w['user_id']}\n💵 {w['amount']} TON\n👛 <code>{wallet}</code></b>",
            parse_mode="html",
            reply_markup=ikb([[
                InlineKeyboardButton(text="✅ Sent",
                                     callback_data=f"wsent_{w['id']}_{w['user_id']}_{w['amount']}"),
                InlineKeyboardButton(text="❌ Reject",
                                     callback_data=f"wreject_{w['id']}_{w['user_id']}_{w['amount']}")
            ]]))

# ════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════
async def main():
    init_db()
    ensure_user(ADMIN_ID, "admin", "Admin")
    log.info("✅ TonCipher Bot started!")
    await asyncio.gather(
        start_web(),
        dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    )

if __name__ == "__main__":
    asyncio.run(main())
