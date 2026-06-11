"""
TonCipher — Telegram Mini App Bot + Web Server

Anti-fraud: Telegram initData HMAC validation, IP multi-account detection,
self-referral detection, rate limiting, fraud alert logging.
Transactions: deposit/withdrawal persistence with admin approve/reject flow.
"""
import asyncio
import hashlib
import hmac as hmac_lib
import logging
import os
import time
import uuid
from collections import defaultdict
from urllib.parse import parse_qsl

import aiosqlite
from aiohttp import web
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

BOT_TOKEN         = os.getenv("BOT_TOKEN", "")
WEBAPP_URL        = os.getenv("WEBAPP_URL", "https://toncipherbot.onrender.com")
PORT              = int(os.getenv("PORT", 8080))
DB_PATH           = os.path.join(os.path.dirname(__file__), "toncipherbot.db")
ADMIN_SECRET      = os.getenv("ADMIN_SECRET", "")
ADMIN_TELEGRAM_ID = int(os.getenv("ADMIN_TELEGRAM_ID", "0"))
# Canal Telegram obligatoire (ex: @TonCipher_official ou -100xxxxxxxxxx)
OFFICIAL_CHANNEL  = os.getenv("OFFICIAL_CHANNEL", "")
# Canal Telegram où poster les retraits (ex: @TonCipher_withdrawals ou -100xxxxxxxxxx)
WITHDRAWAL_CHANNEL = os.getenv("WITHDRAWAL_CHANNEL", "")

REFERRAL_BONUS_TON  = float(os.getenv("REFERRAL_BONUS_TON", "1.0"))
MAX_ACCOUNTS_PER_IP = int(os.getenv("MAX_ACCOUNTS_PER_IP", "3"))
RATE_LIMIT_MAX      = int(os.getenv("RATE_LIMIT_MAX", "30"))  # requests / minute / IP
RATE_LIMIT_WINDOW   = 60  # seconds

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN) if BOT_TOKEN else None
dp  = Dispatcher()

_CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
}

# In-memory rate-limit buckets  {ip: [timestamps]}
_rate_buckets: dict[str, list[float]] = defaultdict(list)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _client_ip(request: web.Request) -> str:
    fwd = request.headers.get("X-Forwarded-For", "")
    return fwd.split(",")[0].strip() if fwd else (request.remote or "")


def _is_rate_limited(ip: str) -> bool:
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW
    _rate_buckets[ip] = bucket = [t for t in _rate_buckets[ip] if t > cutoff]
    if len(bucket) >= RATE_LIMIT_MAX:
        return True
    bucket.append(now)
    return False


def _validate_init_data(init_data: str, bot_token: str) -> bool:
    if not init_data or not bot_token:
        return False
    try:
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))
        check_hash = parsed.pop("hash", "")
        if not check_hash:
            return False
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
        secret_key = hmac_lib.new(b"WebAppData", msg=bot_token.encode(), digestmod=hashlib.sha256).digest()
        expected = hmac_lib.new(secret_key, msg=data_check_string.encode(), digestmod=hashlib.sha256).hexdigest()
        return hmac_lib.compare_digest(expected, check_hash)
    except Exception:
        return False


def _check_admin_auth(request: web.Request) -> bool:
    if not ADMIN_SECRET:
        return True
    return request.headers.get("X-Admin-Key", "") == ADMIN_SECRET


def _risk_score(reasons: list[str]) -> int:
    weights = {
        "invalid_init_data": 60,
        "self_referral_ip":  70,
        "multi_account_ip":  40,
        "rate_limit":        20,
    }
    return min(sum(weights.get(r, 10) for r in reasons), 100)


def _severity(score: int) -> str:
    if score >= 70: return "critical"
    if score >= 50: return "high"
    if score >= 25: return "medium"
    return "low"


def _short_id() -> str:
    return str(uuid.uuid4())[:9]


# ── Database ───────────────────────────────────────────────────────────────────

async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                telegram_id       INTEGER PRIMARY KEY,
                username          TEXT    NOT NULL DEFAULT '',
                first_name        TEXT    NOT NULL DEFAULT '',
                last_name         TEXT    NOT NULL DEFAULT '',
                referral_count    INTEGER NOT NULL DEFAULT 0,
                referral_balance  REAL    NOT NULL DEFAULT 0,
                referred_by       INTEGER,
                ip_address        TEXT,
                flagged           INTEGER NOT NULL DEFAULT 0,
                banned            INTEGER NOT NULL DEFAULT 0,
                withdrawal_blocked INTEGER NOT NULL DEFAULT 0,
                created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS referrals (
                referrer_id INTEGER NOT NULL,
                referee_id  INTEGER NOT NULL PRIMARY KEY,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS fraud_alerts (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER NOT NULL,
                username    TEXT    NOT NULL DEFAULT '',
                alert_type  TEXT    NOT NULL,
                details     TEXT    NOT NULL DEFAULT '',
                severity    TEXT    NOT NULL DEFAULT 'medium',
                risk_score  INTEGER NOT NULL DEFAULT 0,
                resolved    INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id          TEXT    PRIMARY KEY,
                telegram_id INTEGER NOT NULL,
                type        TEXT    NOT NULL,
                amount      REAL    NOT NULL,
                currency    TEXT    NOT NULL DEFAULT 'TON',
                network     TEXT    NOT NULL DEFAULT 'TON',
                address     TEXT    NOT NULL DEFAULT '',
                status      TEXT    NOT NULL,
                tx_hash     TEXT    NOT NULL DEFAULT '',
                fee         REAL    NOT NULL DEFAULT 0,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                processed_at TEXT,
                admin_note  TEXT    NOT NULL DEFAULT ''
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_tasks (
                id              TEXT    PRIMARY KEY,
                creator_id      INTEGER NOT NULL,
                type            TEXT    NOT NULL,
                title           TEXT    NOT NULL,
                description     TEXT    NOT NULL DEFAULT '',
                target_url      TEXT    NOT NULL,
                reward          REAL    NOT NULL,
                total_budget    REAL    NOT NULL,
                spent           REAL    NOT NULL DEFAULT 0,
                status          TEXT    NOT NULL DEFAULT 'pending_approval',
                completions     INTEGER NOT NULL DEFAULT 0,
                max_completions INTEGER NOT NULL,
                admin_note      TEXT    NOT NULL DEFAULT '',
                created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
                approved_at     TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_task_completions (
                task_id         TEXT    NOT NULL,
                telegram_id     INTEGER NOT NULL,
                completed_at    TEXT    NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (task_id, telegram_id)
            )
        """)
        # Backward-compat migrations — safe to run on existing DB
        for tbl, col, defn in [
            ("users", "referral_balance",   "REAL    NOT NULL DEFAULT 0"),
            ("users", "ip_address",         "TEXT"),
            ("users", "flagged",            "INTEGER NOT NULL DEFAULT 0"),
            ("users", "banned",             "INTEGER NOT NULL DEFAULT 0"),
            ("users", "withdrawal_blocked", "INTEGER NOT NULL DEFAULT 0"),
            ("users", "bot_started",        "INTEGER NOT NULL DEFAULT 0"),
        ]:
            try:
                await db.execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {defn}")
            except Exception:
                pass
        await db.commit()
    log.info("Database ready at %s", DB_PATH)


async def _notify_admin(text: str) -> None:
    """Send a Telegram message to the admin if ADMIN_TELEGRAM_ID is configured."""
    if bot and ADMIN_TELEGRAM_ID:
        try:
            await bot.send_message(ADMIN_TELEGRAM_ID, text, parse_mode="HTML")
        except Exception as e:
            log.warning("Admin notify failed: %s", e)


async def _notify_channel(channel: str, text: str) -> None:
    """Post a message to a Telegram channel (WITHDRAWAL_CHANNEL or OFFICIAL_CHANNEL)."""
    if bot and channel:
        try:
            await bot.send_message(channel, text, parse_mode="HTML")
        except Exception as e:
            log.warning("Channel notify failed (%s): %s", channel, e)


async def _log_fraud_alert(
    db: aiosqlite.Connection,
    telegram_id: int,
    username: str,
    alert_type: str,
    details: str,
    score: int,
) -> None:
    sev = _severity(score)
    await db.execute(
        "INSERT INTO fraud_alerts (telegram_id, username, alert_type, details, severity, risk_score)"
        " VALUES (?, ?, ?, ?, ?, ?)",
        (telegram_id, username, alert_type, details, sev, score),
    )
    log.warning("FRAUD [%s] user=%d @%s score=%d — %s", sev.upper(), telegram_id, username, score, details)


# ── Bot Handlers ───────────────────────────────────────────────────────────────

@dp.message(CommandStart())
async def cmd_start(msg: types.Message):
    # Mark that this user has started the bot (used for task verification)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET bot_started = 1 WHERE telegram_id = ?",
            (msg.from_user.id,)
        )
        await db.commit()

    if not WEBAPP_URL:
        await msg.answer("⚙️ <b>TonCipher</b> — configuration en cours.", parse_mode="HTML")
        return
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🚀 Ouvrir TonCipher", web_app=WebAppInfo(url=WEBAPP_URL))
    ]])
    await msg.answer(
        "👋 Bienvenue sur <b>TonCipher</b> !\n\n"
        "💎 Gagnez des <b>TON</b> en complétant des tâches simples.\n"
        "👥 Invitez vos amis et montez dans le classement.\n\n"
        "⬇️ Appuyez sur le bouton pour démarrer :",
        parse_mode="HTML", reply_markup=kb,
    )


# ── API — User init ────────────────────────────────────────────────────────────

async def api_user_init(request: web.Request) -> web.Response:
    ip = _client_ip(request)

    if _is_rate_limited(ip):
        return web.json_response({"error": "Rate limit exceeded"}, status=429, headers=_CORS)

    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    telegram_id = data.get("telegramId")
    username    = str(data.get("username",  ""))
    first_name  = str(data.get("firstName", ""))
    last_name   = str(data.get("lastName",  ""))
    init_data   = str(data.get("initData",  ""))

    if not telegram_id or not isinstance(telegram_id, int):
        return web.json_response({"error": "Invalid telegramId"}, status=400, headers=_CORS)

    violations: list[str] = []
    ip_count = 0

    if BOT_TOKEN and init_data:
        if not _validate_init_data(init_data, BOT_TOKEN):
            violations.append("invalid_init_data")

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT banned FROM users WHERE telegram_id = ?", (telegram_id,)) as cur:
            existing = await cur.fetchone()
        if existing and existing[0]:
            return web.json_response({"error": "Account banned"}, status=403, headers=_CORS)

        await db.execute("""
            INSERT INTO users (telegram_id, username, first_name, last_name, ip_address)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(telegram_id) DO UPDATE SET
                username   = excluded.username,
                first_name = excluded.first_name,
                last_name  = excluded.last_name,
                ip_address = excluded.ip_address
        """, (telegram_id, username, first_name, last_name, ip))

        if ip:
            async with db.execute(
                "SELECT COUNT(*) FROM users WHERE ip_address = ? AND telegram_id != ?",
                (ip, telegram_id),
            ) as cur:
                (ip_count,) = await cur.fetchone()
            if ip_count >= MAX_ACCOUNTS_PER_IP:
                violations.append("multi_account_ip")

        if violations:
            score = _risk_score(violations)
            await _log_fraud_alert(
                db, telegram_id, username,
                alert_type=", ".join(violations),
                details=f"IP={ip} violations={violations} other_accounts_on_ip={ip_count}",
                score=score,
            )
            await db.execute("UPDATE users SET flagged = 1 WHERE telegram_id = ?", (telegram_id,))
            sev_label = _severity(score).upper()
            await _notify_admin(
                f"⚠️ <b>Activité suspecte [{sev_label}]</b>\n"
                f"👤 @{username or 'inconnu'} (ID: <code>{telegram_id}</code>)\n"
                f"🚨 Raisons: {', '.join(violations)}\n"
                f"📊 Score risque: {score}/100\n"
                f"ℹ️ Ce compte est <b>signalé</b> — aucun ban automatique.\n"
                f"👉 Vérifie l'admin panel pour décider."
            )

        await db.commit()

        async with db.execute(
            "SELECT referral_count, referral_balance, flagged, banned, withdrawal_blocked FROM users WHERE telegram_id = ?",
            (telegram_id,),
        ) as cur:
            row = await cur.fetchone()

    return web.json_response({
        "referralCount":      row[0] if row else 0,
        "referralBalance":    row[1] if row else 0.0,
        "flagged":            bool(row[2]) if row else False,
        "banned":             bool(row[3]) if row else False,
        "withdrawalBlocked":  bool(row[4]) if row else False,
    }, headers=_CORS)


# ── API — Process referral ─────────────────────────────────────────────────────

async def api_user_referral(request: web.Request) -> web.Response:
    ip = _client_ip(request)

    if _is_rate_limited(ip):
        return web.json_response({"error": "Rate limit exceeded"}, status=429, headers=_CORS)

    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    try:
        referrer_id = int(data.get("referrerId", 0))
        referee_id  = int(data.get("refereeId",  0))
    except (ValueError, TypeError):
        return web.json_response({"error": "Invalid IDs"}, status=400, headers=_CORS)

    referee_username = str(data.get("refereeUsername", "inconnu"))
    init_data        = str(data.get("initData", ""))

    if not referrer_id or not referee_id or referrer_id == referee_id:
        return web.json_response({"success": False, "error": "Invalid IDs"}, headers=_CORS)

    if BOT_TOKEN:
        if not init_data or not _validate_init_data(init_data, BOT_TOKEN):
            async with aiosqlite.connect(DB_PATH) as db:
                score = _risk_score(["invalid_init_data"])
                await _log_fraud_alert(
                    db, referee_id, referee_username,
                    "invalid_init_data",
                    f"Referral attempt with invalid/missing initData from IP={ip}",
                    score,
                )
                await db.commit()
            return web.json_response({"success": False, "error": "Unauthorized"}, status=401, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT referrer_id FROM referrals WHERE referee_id = ?", (referee_id,)) as cur:
            if await cur.fetchone():
                return web.json_response({"success": False, "error": "Already referred"}, headers=_CORS)

        async with db.execute("SELECT ip_address, flagged, banned FROM users WHERE telegram_id = ?", (referee_id,)) as cur:
            ref_row = await cur.fetchone()
        if ref_row and ref_row[2]:
            return web.json_response({"success": False, "error": "Referee banned"}, headers=_CORS)

        async with db.execute("SELECT ip_address FROM users WHERE telegram_id = ?", (referrer_id,)) as cur:
            rr_row = await cur.fetchone()

        referrer_ip = rr_row[0] if rr_row else None
        referee_ip  = ref_row[0] if ref_row else ip

        violations: list[str] = []

        if referrer_ip and referee_ip and referrer_ip == referee_ip:
            violations.append("self_referral_ip")

        if ref_row and ref_row[1]:
            violations.append("multi_account_ip")

        if violations:
            score = _risk_score(violations)
            await _log_fraud_alert(
                db, referee_id, referee_username,
                alert_type=", ".join(violations),
                details=f"Referral referrer={referrer_id}({referrer_ip}) referee={referee_id}({referee_ip})",
                score=score,
            )
            await db.commit()
            return web.json_response({"success": False, "error": "Fraud detected"}, headers=_CORS)

        await db.execute(
            "INSERT OR IGNORE INTO referrals (referrer_id, referee_id) VALUES (?, ?)",
            (referrer_id, referee_id),
        )
        await db.execute("""
            UPDATE users
            SET referral_count   = referral_count + 1,
                referral_balance = referral_balance + ?
            WHERE telegram_id = ?
        """, (REFERRAL_BONUS_TON, referrer_id))
        await db.commit()

        async with db.execute(
            "SELECT referral_count, referral_balance FROM users WHERE telegram_id = ?", (referrer_id,)
        ) as cur:
            row = await cur.fetchone()

    new_count   = row[0] if row else 1
    new_balance = row[1] if row else REFERRAL_BONUS_TON

    if bot:
        try:
            await bot.send_message(
                referrer_id,
                f"🎉 <b>Nouveau filleul !</b>\n\n"
                f"@{referee_username} vient de rejoindre TonCipher via votre lien.\n"
                f"💰 Bonus crédité : <b>+{REFERRAL_BONUS_TON:.2f} TON</b>\n"
                f"💎 Filleuls : <b>{new_count}</b>  ·  Solde parrainage : <b>{new_balance:.2f} TON</b>",
                parse_mode="HTML",
            )
        except Exception as e:
            log.warning("Bot notify failed for %d: %s", referrer_id, e)

    return web.json_response({
        "success":         True,
        "referrerCount":   new_count,
        "referrerBalance": new_balance,
    }, headers=_CORS)


# ── API — Leaderboard ──────────────────────────────────────────────────────────

async def api_leaderboard(request: web.Request) -> web.Response:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("""
            SELECT telegram_id, username, first_name, referral_count
            FROM users
            WHERE flagged = 0 AND banned = 0 AND referral_count > 0
            ORDER BY referral_count DESC
            LIMIT 50
        """) as cur:
            rows = await cur.fetchall()
    return web.json_response([
        {"telegramId": r[0], "username": r[1], "firstName": r[2], "referralCount": r[3]}
        for r in rows
    ], headers=_CORS)


# ── API — Record deposit (called by frontend deposit monitor) ──────────────────

async def api_deposit_record(request: web.Request) -> web.Response:
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    tx_id       = str(data.get("id", "")).strip() or _short_id()
    telegram_id = data.get("telegramId")
    amount      = float(data.get("amount", 0))
    currency    = str(data.get("currency", "TON"))
    network     = str(data.get("network",  "TON"))
    tx_hash     = str(data.get("txHash",   "")).strip()

    if not telegram_id or amount <= 0:
        return web.json_response({"error": "Invalid data"}, status=400, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT OR IGNORE INTO transactions
                (id, telegram_id, type, amount, currency, network, status, tx_hash, processed_at)
            VALUES (?, ?, 'deposit', ?, ?, ?, 'completed', ?, datetime('now'))
        """, (tx_id, telegram_id, amount, currency, network, tx_hash))
        await db.commit()

    return web.json_response({"success": True}, headers=_CORS)


# ── API — Create withdrawal request (called by frontend on submit) ─────────────

async def api_withdrawal_create(request: web.Request) -> web.Response:
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    tx_id       = str(data.get("id", "")).strip() or _short_id()
    telegram_id = data.get("telegramId")
    amount      = float(data.get("amount", 0))
    currency    = str(data.get("currency", "TON"))
    network     = str(data.get("network",  "TON"))
    address     = str(data.get("address",  "")).strip()
    fee         = float(data.get("fee", 0))

    if not telegram_id or amount <= 0 or len(address) < 10:
        return web.json_response({"error": "Invalid data"}, status=400, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT banned, withdrawal_blocked FROM users WHERE telegram_id = ?", (telegram_id,)
        ) as cur:
            row = await cur.fetchone()
        if row:
            if row[0]:
                return web.json_response({"error": "Account banned"}, status=403, headers=_CORS)
            if row[1]:
                return web.json_response({"error": "Withdrawals blocked"}, status=403, headers=_CORS)

        await db.execute("""
            INSERT OR IGNORE INTO transactions
                (id, telegram_id, type, amount, currency, network, address, status, fee)
            VALUES (?, ?, 'withdrawal', ?, ?, ?, ?, 'pending', ?)
        """, (tx_id, telegram_id, amount, currency, network, address, fee))
        await db.commit()

        # Fetch user info for the notification
        async with db.execute(
            "SELECT username, first_name, flagged FROM users WHERE telegram_id = ?", (telegram_id,)
        ) as cur:
            urow = await cur.fetchone()

    uname    = urow[0] if urow else ""
    fname    = urow[1] if urow else ""
    is_flagged = bool(urow[2]) if urow else False

    flag_warn = "\n⚠️ <b>Compte signalé (anti-fraude)</b> — vérification recommandée." if is_flagged else ""
    withdrawal_msg = (
        f"💸 <b>Nouvelle demande de retrait</b>{flag_warn}\n"
        f"👤 {fname} @{uname or 'inconnu'} (ID: <code>{telegram_id}</code>)\n"
        f"💰 <b>{amount:.2f} {currency}</b> ({network}) — frais: {fee}\n"
        f"📬 Adresse: <code>{address}</code>\n"
        f"🆔 TX ID: <code>{tx_id}</code>"
    )
    await _notify_admin(withdrawal_msg + "\n👉 Ouvre l'admin pour approuver ou refuser.")
    await _notify_channel(WITHDRAWAL_CHANNEL, withdrawal_msg + "\n⏳ En attente d'approbation.")

    log.info("Withdrawal request: id=%s telegram_id=%d amount=%.2f %s → %s",
             tx_id, telegram_id, amount, currency, address[:12])
    return web.json_response({"success": True, "id": tx_id}, headers=_CORS)


# ── API — Check channel membership ────────────────────────────────────────────

async def api_check_membership(request: web.Request) -> web.Response:
    """Return {member: bool} — whether user is in a given Telegram channel/group.
    Query params:
      telegram_id : user's Telegram ID
      chat_id     : channel/group @username or numeric ID (defaults to OFFICIAL_CHANNEL)
    """
    try:
        telegram_id = int(request.rel_url.query.get("telegram_id", 0))
    except (ValueError, TypeError):
        return web.json_response({"member": True}, headers=_CORS)

    chat_id = request.rel_url.query.get("chat_id", "").strip() or OFFICIAL_CHANNEL

    if not bot or not chat_id or not telegram_id:
        return web.json_response({"member": True}, headers=_CORS)

    try:
        from aiogram.enums import ChatMemberStatus
        member = await bot.get_chat_member(chat_id, telegram_id)
        is_member = member.status in (
            ChatMemberStatus.MEMBER,
            ChatMemberStatus.ADMINISTRATOR,
            ChatMemberStatus.CREATOR,
        )
    except Exception as e:
        log.warning("Membership check failed for %d in %s: %s", telegram_id, chat_id, e)
        is_member = True  # On error, allow through (don't block users)

    return web.json_response({"member": is_member}, headers=_CORS)


# ── API — Check bot start ──────────────────────────────────────────────────────

async def api_check_bot_start(request: web.Request) -> web.Response:
    """Return {started: bool} — whether the user has sent /start to the bot."""
    try:
        telegram_id = int(request.rel_url.query.get("telegram_id", 0))
    except (ValueError, TypeError):
        return web.json_response({"started": False}, headers=_CORS)
    if not telegram_id:
        return web.json_response({"started": False}, headers=_CORS)
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT bot_started FROM users WHERE telegram_id = ?", (telegram_id,)
        ) as cur:
            row = await cur.fetchone()
    started = bool(row and row[0]) if row else False
    return web.json_response({"started": started}, headers=_CORS)


# ── API — Admin: stats ─────────────────────────────────────────────────────────

async def api_admin_stats(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT COUNT(*) FROM users") as cur:
            (total_users,) = await cur.fetchone()
        async with db.execute("SELECT COUNT(*) FROM users WHERE flagged = 1") as cur:
            (flagged_users,) = await cur.fetchone()
        async with db.execute("SELECT COUNT(*) FROM users WHERE banned = 1") as cur:
            (banned_users,) = await cur.fetchone()
        async with db.execute("SELECT COUNT(*), COALESCE(SUM(referral_balance), 0) FROM users") as cur:
            r = await cur.fetchone()
            total_referral_bonus = float(r[1])
        async with db.execute("SELECT COUNT(*) FROM referrals") as cur:
            (total_referrals,) = await cur.fetchone()
        async with db.execute("SELECT COUNT(*) FROM fraud_alerts WHERE resolved = 0") as cur:
            (open_alerts,) = await cur.fetchone()
        async with db.execute("SELECT COUNT(*) FROM fraud_alerts WHERE resolved = 0 AND severity = 'critical'") as cur:
            (critical_alerts,) = await cur.fetchone()
        async with db.execute("SELECT COUNT(*) FROM fraud_alerts WHERE resolved = 0 AND severity = 'high'") as cur:
            (high_alerts,) = await cur.fetchone()
        async with db.execute("SELECT COUNT(*) FROM fraud_alerts WHERE resolved = 0 AND severity = 'medium'") as cur:
            (medium_alerts,) = await cur.fetchone()
        async with db.execute("SELECT COUNT(*) FROM fraud_alerts WHERE resolved = 0 AND severity = 'low'") as cur:
            (low_alerts,) = await cur.fetchone()
        # Transaction totals
        async with db.execute(
            "SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'deposit' AND status = 'completed'"
        ) as cur:
            r = await cur.fetchone()
            total_deposits_count, total_deposits_amount = r[0], float(r[1])
        async with db.execute(
            "SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'withdrawal' AND status = 'completed'"
        ) as cur:
            r = await cur.fetchone()
            total_withdrawals_count, total_withdrawals_amount = r[0], float(r[1])
        async with db.execute(
            "SELECT COUNT(*) FROM transactions WHERE type = 'withdrawal' AND status = 'pending'"
        ) as cur:
            (pending_withdrawals,) = await cur.fetchone()

    return web.json_response({
        "total_users":              total_users,
        "flagged_users":            flagged_users,
        "banned_users":             banned_users,
        "total_referrals":          total_referrals,
        "total_referral_bonus":     total_referral_bonus,
        "open_alerts":              open_alerts,
        "critical_alerts":          critical_alerts,
        "high_alerts":              high_alerts,
        "medium_alerts":            medium_alerts,
        "low_alerts":               low_alerts,
        "total_deposits_count":     total_deposits_count,
        "total_deposits_amount":    total_deposits_amount,
        "total_withdrawals_count":  total_withdrawals_count,
        "total_withdrawals_amount": total_withdrawals_amount,
        "pending_withdrawals":      pending_withdrawals,
    }, headers=_CORS)


# ── API — Admin: users list ────────────────────────────────────────────────────

async def api_admin_users(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)

    search = request.rel_url.query.get("search", "").strip()
    status = request.rel_url.query.get("status", "all")

    query = """
        SELECT
            u.telegram_id, u.username, u.first_name, u.last_name,
            u.referral_count, u.referral_balance,
            u.flagged, u.banned, u.withdrawal_blocked,
            u.ip_address, u.created_at,
            COALESCE(d.cnt, 0),   COALESCE(d.total, 0.0),
            COALESCE(w.cnt, 0),   COALESCE(w.total, 0.0),
            COALESCE(pw.cnt, 0)
        FROM users u
        LEFT JOIN (
            SELECT telegram_id, COUNT(*) AS cnt, SUM(amount) AS total
            FROM transactions WHERE type = 'deposit' AND status = 'completed'
            GROUP BY telegram_id
        ) d  ON u.telegram_id = d.telegram_id
        LEFT JOIN (
            SELECT telegram_id, COUNT(*) AS cnt, SUM(amount) AS total
            FROM transactions WHERE type = 'withdrawal'
            GROUP BY telegram_id
        ) w  ON u.telegram_id = w.telegram_id
        LEFT JOIN (
            SELECT telegram_id, COUNT(*) AS cnt
            FROM transactions WHERE type = 'withdrawal' AND status = 'pending'
            GROUP BY telegram_id
        ) pw ON u.telegram_id = pw.telegram_id
    """
    params: list = []
    conditions: list[str] = []

    if search:
        conditions.append("(u.username LIKE ? OR u.first_name LIKE ? OR CAST(u.telegram_id AS TEXT) LIKE ?)")
        like = f"%{search}%"
        params.extend([like, like, like])

    if status == "banned":
        conditions.append("u.banned = 1")
    elif status == "flagged":
        conditions.append("u.flagged = 1 AND u.banned = 0")
    elif status == "active":
        conditions.append("u.flagged = 0 AND u.banned = 0")
    elif status == "blocked":
        conditions.append("u.withdrawal_blocked = 1")

    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY u.created_at DESC LIMIT 200"

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(query, params) as cur:
            rows = await cur.fetchall()

    return web.json_response([{
        "telegram_id":        r[0],
        "username":           r[1],
        "first_name":         r[2],
        "last_name":          r[3],
        "referral_count":     r[4],
        "referral_balance":   float(r[5]),
        "flagged":            bool(r[6]),
        "banned":             bool(r[7]),
        "withdrawal_blocked": bool(r[8]),
        "ip_address":         r[9],
        "created_at":         r[10],
        "deposit_count":      r[11],
        "deposit_total":      float(r[12]),
        "withdrawal_count":   r[13],
        "withdrawal_total":   float(r[14]),
        "pending_withdrawals": r[15],
    } for r in rows], headers=_CORS)


# ── API — Admin: ban/unban/unflag/block-withdrawals ────────────────────────────

async def api_admin_ban_user(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)
    telegram_id = request.match_info.get("telegram_id")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET banned = 1, flagged = 1 WHERE telegram_id = ?", (telegram_id,))
        await db.commit()
    return web.json_response({"success": True}, headers=_CORS)


async def api_admin_unban_user(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)
    telegram_id = request.match_info.get("telegram_id")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET banned = 0, flagged = 0 WHERE telegram_id = ?", (telegram_id,))
        await db.commit()
    return web.json_response({"success": True}, headers=_CORS)


async def api_admin_unflag_user(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)
    telegram_id = request.match_info.get("telegram_id")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET flagged = 0 WHERE telegram_id = ? AND banned = 0", (telegram_id,))
        await db.commit()
    return web.json_response({"success": True}, headers=_CORS)


async def api_admin_block_withdrawals(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)
    telegram_id = request.match_info.get("telegram_id")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET withdrawal_blocked = 1 WHERE telegram_id = ?", (telegram_id,))
        await db.commit()
    return web.json_response({"success": True}, headers=_CORS)


async def api_admin_unblock_withdrawals(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)
    telegram_id = request.match_info.get("telegram_id")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET withdrawal_blocked = 0 WHERE telegram_id = ?", (telegram_id,))
        await db.commit()
    return web.json_response({"success": True}, headers=_CORS)


# ── API — Admin: withdrawals list + approve/reject ─────────────────────────────

async def api_admin_withdrawals(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)

    status_filter = request.rel_url.query.get("status", "all")

    query = """
        SELECT
            t.id, t.telegram_id, t.amount, t.currency, t.network, t.address,
            t.status, t.tx_hash, t.fee, t.created_at, t.processed_at, t.admin_note,
            u.username, u.first_name, u.last_name, u.flagged, u.banned, u.withdrawal_blocked,
            COALESCE(d.total, 0.0) AS total_deposited
        FROM transactions t
        LEFT JOIN users u ON t.telegram_id = u.telegram_id
        LEFT JOIN (
            SELECT telegram_id, SUM(amount) AS total
            FROM transactions WHERE type = 'deposit' AND status = 'completed'
            GROUP BY telegram_id
        ) d ON t.telegram_id = d.telegram_id
        WHERE t.type = 'withdrawal'
    """
    params: list = []
    if status_filter != "all":
        query += " AND t.status = ?"
        params.append(status_filter)
    query += " ORDER BY t.created_at DESC LIMIT 200"

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(query, params) as cur:
            rows = await cur.fetchall()

    return web.json_response([{
        "id":                 r[0],
        "telegram_id":        r[1],
        "amount":             float(r[2]),
        "currency":           r[3],
        "network":            r[4],
        "address":            r[5],
        "status":             r[6],
        "tx_hash":            r[7],
        "fee":                float(r[8]),
        "created_at":         r[9],
        "processed_at":       r[10],
        "admin_note":         r[11],
        "username":           r[12] or "",
        "first_name":         r[13] or "",
        "last_name":          r[14] or "",
        "flagged":            bool(r[15]),
        "banned":             bool(r[16]),
        "withdrawal_blocked": bool(r[17]),
        "total_deposited":    float(r[18]),
    } for r in rows], headers=_CORS)


# ── API — Transactions list (admin: deposits/withdrawals feed) ─────────────────

async def api_transactions(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)

    type_filter = request.rel_url.query.get("type", "all")
    try:
        limit = min(200, max(1, int(request.rel_url.query.get("limit", "50"))))
    except ValueError:
        limit = 50

    query = """
        SELECT t.id, t.telegram_id, t.amount, t.currency, t.network,
               t.status, t.tx_hash, t.created_at, u.username
        FROM transactions t
        LEFT JOIN users u ON t.telegram_id = u.telegram_id
    """
    params: list = []
    if type_filter != "all":
        query += " WHERE t.type = ?"
        params.append(type_filter)
    query += " ORDER BY t.created_at DESC LIMIT ?"
    params.append(limit)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(query, params) as cur:
            rows = await cur.fetchall()

    return web.json_response([{
        "id":         r[0],
        "telegramId": r[1],
        "userId":     r[8] or str(r[1]),
        "amount":     float(r[2]),
        "currency":   r[3],
        "network":    r[4],
        "status":     r[5],
        "txHash":     r[6],
        "createdAt":  r[7],
    } for r in rows], headers=_CORS)


async def api_admin_approve_withdrawal(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)

    tx_id = request.match_info.get("id")
    try:
        data = await request.json()
    except Exception:
        data = {}
    tx_hash = str(data.get("txHash", "")).strip()

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE transactions
            SET status = 'completed', tx_hash = ?, processed_at = datetime('now')
            WHERE id = ? AND type = 'withdrawal' AND status = 'pending'
        """, (tx_hash, tx_id))
        # Notify user via bot if available
        async with db.execute("SELECT telegram_id, amount, currency FROM transactions WHERE id = ?", (tx_id,)) as cur:
            tx_row = await cur.fetchone()
        await db.commit()

    tx_link = f"https://tonscan.org/tx/{tx_hash}" if tx_hash else ""
    if bot and tx_row:
        try:
            await bot.send_message(
                tx_row[0],
                f"✅ <b>Retrait approuvé !</b>\n\n"
                f"💰 Montant : <b>{tx_row[1]:.2f} {tx_row[2]}</b>\n"
                + (f'🔗 <a href="{tx_link}">Voir la transaction</a>' if tx_link else ""),
                parse_mode="HTML",
                disable_web_page_preview=True,
            )
        except Exception:
            pass

    await _notify_channel(
        WITHDRAWAL_CHANNEL,
        f"✅ <b>Retrait approuvé</b>\n"
        f"🆔 TX ID: <code>{tx_id}</code>\n"
        f"💰 {tx_row[1]:.2f} {tx_row[2] if tx_row else ''}\n"
        + (f'🔗 <a href="{tx_link}">Voir sur TonScan</a>' if tx_link else ""),
    )

    return web.json_response({"success": True}, headers=_CORS)


async def api_admin_reject_withdrawal(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)

    tx_id = request.match_info.get("id")
    try:
        data = await request.json()
    except Exception:
        data = {}
    note = str(data.get("note", "")).strip()

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE transactions
            SET status = 'rejected', admin_note = ?, processed_at = datetime('now')
            WHERE id = ? AND type = 'withdrawal' AND status = 'pending'
        """, (note, tx_id))
        async with db.execute("SELECT telegram_id, amount, currency FROM transactions WHERE id = ?", (tx_id,)) as cur:
            tx_row = await cur.fetchone()
        await db.commit()

    if bot and tx_row:
        try:
            await bot.send_message(
                tx_row[0],
                f"❌ <b>Retrait refusé</b>\n\n"
                f"💰 Montant : {tx_row[1]:.2f} {tx_row[2]}\n"
                f"{'📝 Motif : ' + note if note else 'Aucun motif précisé.'}\n\n"
                f"Votre solde a été recrédité.",
                parse_mode="HTML",
            )
        except Exception:
            pass

    await _notify_channel(
        WITHDRAWAL_CHANNEL,
        f"❌ <b>Retrait refusé</b>\n"
        f"🆔 TX ID: <code>{tx_id}</code>\n"
        f"💰 {tx_row[1]:.2f} {tx_row[2] if tx_row else ''}\n"
        + (f"📝 Motif : {note}" if note else ""),
    )

    return web.json_response({"success": True}, headers=_CORS)


# ── API — Admin: fraud alerts ──────────────────────────────────────────────────

async def api_admin_fraud_alerts(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("""
            SELECT f.id, f.telegram_id, f.username, f.alert_type, f.details,
                   f.severity, f.risk_score, f.resolved, f.created_at,
                   COALESCE(u.banned, 0) AS banned
            FROM fraud_alerts f
            LEFT JOIN users u ON f.telegram_id = u.telegram_id
            ORDER BY f.created_at DESC
            LIMIT 200
        """) as cur:
            rows = await cur.fetchall()

    return web.json_response([{
        "id":          r[0],
        "telegram_id": r[1],
        "username":    r[2],
        "alert_type":  r[3],
        "details":     r[4],
        "severity":    r[5],
        "risk_score":  r[6],
        "resolved":    bool(r[7]),
        "created_at":  r[8],
        "banned":      bool(r[9]),
    } for r in rows], headers=_CORS)


async def api_admin_resolve_alert(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)

    alert_id = request.match_info.get("alert_id")
    try:
        data = await request.json()
    except Exception:
        data = {}
    action = str(data.get("action", "resolve"))

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE fraud_alerts SET resolved = 1 WHERE id = ?", (alert_id,))
        if action == "ban":
            async with db.execute("SELECT telegram_id FROM fraud_alerts WHERE id = ?", (alert_id,)) as cur:
                row = await cur.fetchone()
            if row:
                await db.execute(
                    "UPDATE users SET banned = 1, flagged = 1 WHERE telegram_id = ?", (row[0],)
                )
        await db.commit()

    return web.json_response({"success": True}, headers=_CORS)


# ── API — User-created tasks ───────────────────────────────────────────────────

async def api_user_task_create(request: web.Request) -> web.Response:
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    creator_id      = data.get("telegramId")
    task_type       = str(data.get("type", "")).strip()
    title           = str(data.get("title", "")).strip()
    description     = str(data.get("description", "")).strip()
    target_url      = str(data.get("targetUrl", "")).strip()   # stored EXACTLY as-is
    reward          = float(data.get("reward", 0))
    total_budget    = float(data.get("totalBudget", 0))
    max_completions = int(data.get("maxCompletions", 0))

    if not creator_id or not task_type or not title or not target_url:
        return web.json_response({"error": "Missing required fields"}, status=400, headers=_CORS)
    if task_type not in ("join_channel", "join_group", "start_bot"):
        return web.json_response({"error": "Invalid task type"}, status=400, headers=_CORS)
    if max_completions < 1:
        return web.json_response({"error": "Invalid max_completions"}, status=400, headers=_CORS)

    task_id = _short_id()

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO user_tasks
                (id, creator_id, type, title, description, target_url, reward, total_budget, max_completions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (task_id, creator_id, task_type, title, description, target_url, reward, total_budget, max_completions))
        await db.commit()

        async with db.execute(
            "SELECT username, first_name FROM users WHERE telegram_id = ?", (creator_id,)
        ) as cur:
            urow = await cur.fetchone()

    uname = urow[0] if urow else ""
    fname = urow[1] if urow else ""
    await _notify_admin(
        f"📋 <b>Nouvelle tâche à approuver</b>\n"
        f"👤 {fname} @{uname or 'inconnu'} (ID: <code>{creator_id}</code>)\n"
        f"📝 {title}\n"
        f"🔗 {target_url}\n"
        f"💰 Budget: {total_budget:.3f} TON ({max_completions} × {reward:.4f} TON)\n"
        f"🆔 <code>{task_id}</code>\n"
        f"👉 Admin panel → Approuver / Refuser"
    )
    return web.json_response({"success": True, "id": task_id}, headers=_CORS)


async def api_user_task_mine(request: web.Request) -> web.Response:
    try:
        telegram_id = int(request.rel_url.query.get("telegram_id", 0))
    except (ValueError, TypeError):
        return web.json_response([], headers=_CORS)
    if not telegram_id:
        return web.json_response([], headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("""
            SELECT id, type, title, description, target_url, reward, total_budget, spent,
                   status, completions, max_completions, admin_note, created_at, approved_at
            FROM user_tasks WHERE creator_id = ?
            ORDER BY created_at DESC
        """, (telegram_id,)) as cur:
            rows = await cur.fetchall()

    return web.json_response([{
        "id":             r[0],
        "type":           r[1],
        "title":          r[2],
        "description":    r[3],
        "targetUrl":      r[4],
        "reward":         float(r[5]),
        "totalBudget":    float(r[6]),
        "spent":          float(r[7]),
        "status":         r[8],
        "completions":    r[9],
        "maxCompletions": r[10],
        "adminNote":      r[11],
        "createdAt":      r[12],
        "approvedAt":     r[13],
    } for r in rows], headers=_CORS)


async def api_user_task_available(request: web.Request) -> web.Response:
    try:
        telegram_id = int(request.rel_url.query.get("telegram_id", 0))
    except (ValueError, TypeError):
        telegram_id = 0

    fid = telegram_id or -1
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("""
            SELECT t.id, t.type, t.title, t.description, t.target_url,
                   t.reward, t.completions, t.max_completions
            FROM user_tasks t
            WHERE t.status = 'active'
              AND t.completions < t.max_completions
              AND t.creator_id != ?
              AND NOT EXISTS (
                  SELECT 1 FROM user_task_completions c
                  WHERE c.task_id = t.id AND c.telegram_id = ?
              )
            ORDER BY t.approved_at DESC
            LIMIT 100
        """, (fid, fid)) as cur:
            rows = await cur.fetchall()

    return web.json_response([{
        "id":               r[0],
        "type":             r[1],
        "title":            r[2],
        "description":      r[3],
        "targetUrl":        r[4],
        "reward":           float(r[5]),
        "totalCompletions": r[6],
        "maxCompletions":   r[7],
    } for r in rows], headers=_CORS)


async def api_user_task_complete(request: web.Request) -> web.Response:
    task_id = request.match_info.get("id")
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    try:
        telegram_id = int(data.get("telegramId", 0))
    except (ValueError, TypeError):
        return web.json_response({"error": "Invalid telegramId"}, status=400, headers=_CORS)
    if not telegram_id:
        return web.json_response({"error": "Missing telegramId"}, status=400, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT status, completions, max_completions, reward, creator_id FROM user_tasks WHERE id = ?",
            (task_id,)
        ) as cur:
            task = await cur.fetchone()

        if not task:
            return web.json_response({"error": "Task not found"}, status=404, headers=_CORS)
        if task[0] != 'active':
            return web.json_response({"error": "Task not active"}, status=400, headers=_CORS)
        if task[1] >= task[2]:
            return web.json_response({"error": "Task depleted"}, status=400, headers=_CORS)
        if task[4] == telegram_id:
            return web.json_response({"error": "Cannot complete your own task"}, status=400, headers=_CORS)

        async with db.execute(
            "SELECT 1 FROM user_task_completions WHERE task_id = ? AND telegram_id = ?",
            (task_id, telegram_id)
        ) as cur:
            if await cur.fetchone():
                return web.json_response({"error": "Already completed"}, status=400, headers=_CORS)

        reward          = float(task[3])
        new_completions = task[1] + 1
        new_status      = 'depleted' if new_completions >= task[2] else 'active'

        await db.execute(
            "INSERT INTO user_task_completions (task_id, telegram_id) VALUES (?, ?)",
            (task_id, telegram_id)
        )
        await db.execute(
            "UPDATE user_tasks SET completions = ?, spent = spent + ?, status = ? WHERE id = ?",
            (new_completions, reward, new_status, task_id)
        )
        await db.commit()

    return web.json_response({"success": True, "reward": reward}, headers=_CORS)


async def api_user_task_pause(request: web.Request) -> web.Response:
    task_id = request.match_info.get("id")
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    try:
        telegram_id = int(data.get("telegramId", 0))
    except (ValueError, TypeError):
        return web.json_response({"error": "Invalid telegramId"}, status=400, headers=_CORS)
    if not telegram_id:
        return web.json_response({"error": "Missing telegramId"}, status=400, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT status, creator_id FROM user_tasks WHERE id = ?", (task_id,)
        ) as cur:
            task = await cur.fetchone()

        if not task:
            return web.json_response({"error": "Task not found"}, status=404, headers=_CORS)
        if task[1] != telegram_id:
            return web.json_response({"error": "Unauthorized"}, status=403, headers=_CORS)
        if task[0] not in ('active', 'paused'):
            return web.json_response({"error": "Cannot toggle pause"}, status=400, headers=_CORS)

        new_status = 'paused' if task[0] == 'active' else 'active'
        await db.execute("UPDATE user_tasks SET status = ? WHERE id = ?", (new_status, task_id))
        await db.commit()

    return web.json_response({"success": True, "status": new_status}, headers=_CORS)


async def api_user_task_delete(request: web.Request) -> web.Response:
    task_id = request.match_info.get("id")
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    try:
        telegram_id = int(data.get("telegramId", 0))
    except (ValueError, TypeError):
        return web.json_response({"error": "Invalid telegramId"}, status=400, headers=_CORS)
    if not telegram_id:
        return web.json_response({"error": "Missing telegramId"}, status=400, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT creator_id, completions, max_completions, reward, status FROM user_tasks WHERE id = ?",
            (task_id,)
        ) as cur:
            task = await cur.fetchone()

        if not task:
            return web.json_response({"error": "Task not found"}, status=404, headers=_CORS)
        if task[0] != telegram_id:
            return web.json_response({"error": "Unauthorized"}, status=403, headers=_CORS)

        remaining = max(0, task[2] - task[1])
        refund    = remaining * float(task[3])

        await db.execute("DELETE FROM user_tasks WHERE id = ?", (task_id,))
        await db.execute("DELETE FROM user_task_completions WHERE task_id = ?", (task_id,))
        await db.commit()

    return web.json_response({"success": True, "refund": refund}, headers=_CORS)


async def api_user_task_fund(request: web.Request) -> web.Response:
    task_id = request.match_info.get("id")
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    try:
        telegram_id = int(data.get("telegramId", 0))
    except (ValueError, TypeError):
        return web.json_response({"error": "Invalid telegramId"}, status=400, headers=_CORS)
    if not telegram_id:
        return web.json_response({"error": "Missing telegramId"}, status=400, headers=_CORS)
    extra_executions = int(data.get("extraExecutions", 0))
    extra_budget     = float(data.get("extraBudget", 0))

    if extra_executions < 1:
        return web.json_response({"error": "Invalid extra executions"}, status=400, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT creator_id, status FROM user_tasks WHERE id = ?", (task_id,)
        ) as cur:
            task = await cur.fetchone()

        if not task:
            return web.json_response({"error": "Task not found"}, status=404, headers=_CORS)
        if task[0] != telegram_id:
            return web.json_response({"error": "Unauthorized"}, status=403, headers=_CORS)

        await db.execute("""
            UPDATE user_tasks
            SET max_completions = max_completions + ?,
                total_budget    = total_budget + ?,
                status = CASE WHEN status = 'depleted' THEN 'active' ELSE status END
            WHERE id = ?
        """, (extra_executions, extra_budget, task_id))
        await db.commit()

    return web.json_response({"success": True}, headers=_CORS)


async def api_admin_user_tasks(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)

    status_filter = request.rel_url.query.get("status", "all")

    query = """
        SELECT t.id, t.creator_id, t.type, t.title, t.description, t.target_url,
               t.reward, t.total_budget, t.spent, t.status, t.completions, t.max_completions,
               t.admin_note, t.created_at, t.approved_at,
               u.username, u.first_name
        FROM user_tasks t
        LEFT JOIN users u ON t.creator_id = u.telegram_id
    """
    params: list = []
    if status_filter != "all":
        query += " WHERE t.status = ?"
        params.append(status_filter)
    query += " ORDER BY t.created_at DESC LIMIT 200"

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(query, params) as cur:
            rows = await cur.fetchall()

    return web.json_response([{
        "id":             r[0],
        "creatorId":      r[1],
        "type":           r[2],
        "title":          r[3],
        "description":    r[4],
        "targetUrl":      r[5],
        "reward":         float(r[6]),
        "totalBudget":    float(r[7]),
        "spent":          float(r[8]),
        "status":         r[9],
        "completions":    r[10],
        "maxCompletions": r[11],
        "adminNote":      r[12],
        "createdAt":      r[13],
        "approvedAt":     r[14],
        "username":       r[15] or "",
        "firstName":      r[16] or "",
    } for r in rows], headers=_CORS)


async def api_admin_approve_user_task(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)

    task_id = request.match_info.get("id")

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT creator_id, title, status FROM user_tasks WHERE id = ?", (task_id,)
        ) as cur:
            task = await cur.fetchone()

        if not task or task[2] != 'pending_approval':
            return web.json_response({"error": "Task not found or not pending"}, status=400, headers=_CORS)

        await db.execute(
            "UPDATE user_tasks SET status = 'active', approved_at = datetime('now') WHERE id = ?",
            (task_id,)
        )
        await db.commit()

    if bot and task:
        try:
            await bot.send_message(
                task[0],
                f"✅ <b>Tâche approuvée !</b>\n\n"
                f"📋 <b>{task[1]}</b> est maintenant active.\n"
                f"Les utilisateurs peuvent la compléter dès maintenant.",
                parse_mode="HTML",
            )
        except Exception:
            pass

    return web.json_response({"success": True}, headers=_CORS)


async def api_admin_reject_user_task(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)

    task_id = request.match_info.get("id")
    try:
        data = await request.json()
    except Exception:
        data = {}
    note = str(data.get("note", "")).strip()

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT creator_id, title, total_budget, status FROM user_tasks WHERE id = ?", (task_id,)
        ) as cur:
            task = await cur.fetchone()

        if not task or task[3] != 'pending_approval':
            return web.json_response({"error": "Task not found or not pending"}, status=400, headers=_CORS)

        await db.execute(
            "UPDATE user_tasks SET status = 'rejected', admin_note = ? WHERE id = ?",
            (note, task_id)
        )
        await db.commit()

    if bot and task:
        try:
            await bot.send_message(
                task[0],
                f"❌ <b>Tâche refusée</b>\n\n"
                f"📋 <b>{task[1]}</b>\n"
                f"💰 Remboursement de <b>{float(task[2]):.3f} TON</b> en cours.\n"
                + (f"📝 Motif : {note}" if note else ""),
                parse_mode="HTML",
            )
        except Exception:
            pass

    return web.json_response({"success": True, "refund": float(task[2]) if task else 0}, headers=_CORS)


# ── Static Files ───────────────────────────────────────────────────────────────

DIST = os.path.join(os.path.dirname(__file__), "dist")


async def serve_app(request: web.Request) -> web.Response:
    index = os.path.join(DIST, "index.html")
    if os.path.exists(index):
        with open(index, "rb") as f:
            content = f.read()
        return web.Response(
            body=content, content_type="text/html",
            headers={"Cache-Control": "no-cache, no-store, must-revalidate",
                     "Pragma": "no-cache", "Expires": "0"},
        )
    return web.Response(text="Building… please wait.", status=503)


async def health(request: web.Request) -> web.Response:
    return web.Response(text="✅ TonCipher is running!")


async def serve_manifest(request: web.Request) -> web.Response:
    path = os.path.join(DIST, "tonconnect-manifest.json")
    if not os.path.exists(path):
        return web.Response(status=404)
    with open(path, "rb") as f:
        raw = f.read()
    return web.Response(body=raw, content_type="application/json",
                        headers={"Access-Control-Allow-Origin": "*"})


async def serve_image(request: web.Request) -> web.Response:
    filename = request.match_info["filename"]
    if ".." in filename or filename.startswith("/"):
        return web.Response(status=400)
    path = os.path.join(DIST, "images", filename)
    if not os.path.isfile(path):
        return web.Response(status=404)
    ext = os.path.splitext(filename)[1].lower()
    ctype = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
             ".svg": "image/svg+xml", ".webp": "image/webp"}.get(ext, "application/octet-stream")
    with open(path, "rb") as f:
        raw = f.read()
    return web.Response(body=raw, content_type=ctype,
                        headers={"Access-Control-Allow-Origin": "*"})


# ── Web Application ────────────────────────────────────────────────────────────

async def start_web() -> None:
    app = web.Application()

    # Static / health
    app.router.add_get("/health",                          health)
    app.router.add_get("/tonconnect-manifest.json",        serve_manifest)
    app.router.add_get("/images/{filename}",               serve_image)

    # User API
    app.router.add_post("/api/user/init",                  api_user_init)
    app.router.add_post("/api/user/referral",              api_user_referral)
    app.router.add_get( "/api/check-membership",           api_check_membership)
    app.router.add_get( "/api/check-bot-start",            api_check_bot_start)
    app.router.add_get( "/api/leaderboard",                api_leaderboard)

    # Transaction API (called by frontend)
    app.router.add_post("/api/deposit/record",             api_deposit_record)
    app.router.add_get( "/api/transactions",               api_transactions)
    app.router.add_post("/api/withdrawal/create",          api_withdrawal_create)

    # Admin — users
    app.router.add_get( "/api/admin/stats",                api_admin_stats)
    app.router.add_get( "/api/admin/users",                api_admin_users)
    app.router.add_post("/api/admin/users/{telegram_id}/ban",                  api_admin_ban_user)
    app.router.add_post("/api/admin/users/{telegram_id}/unban",                api_admin_unban_user)
    app.router.add_post("/api/admin/users/{telegram_id}/unflag",               api_admin_unflag_user)
    app.router.add_post("/api/admin/users/{telegram_id}/block-withdrawals",    api_admin_block_withdrawals)
    app.router.add_post("/api/admin/users/{telegram_id}/unblock-withdrawals",  api_admin_unblock_withdrawals)

    # Admin — withdrawals
    app.router.add_get( "/api/admin/withdrawals",          api_admin_withdrawals)
    app.router.add_post("/api/admin/withdrawals/{id}/approve", api_admin_approve_withdrawal)
    app.router.add_post("/api/admin/withdrawals/{id}/reject",  api_admin_reject_withdrawal)

    # Admin — fraud alerts
    app.router.add_get( "/api/admin/fraud-alerts",         api_admin_fraud_alerts)
    app.router.add_post("/api/admin/fraud-alerts/{alert_id}/resolve", api_admin_resolve_alert)

    # User tasks marketplace
    app.router.add_post("/api/user-tasks/create",               api_user_task_create)
    app.router.add_get( "/api/user-tasks/mine",                 api_user_task_mine)
    app.router.add_get( "/api/user-tasks/available",            api_user_task_available)
    app.router.add_post("/api/user-tasks/{id}/complete",        api_user_task_complete)
    app.router.add_post("/api/user-tasks/{id}/pause",           api_user_task_pause)
    app.router.add_post("/api/user-tasks/{id}/delete",          api_user_task_delete)
    app.router.add_post("/api/user-tasks/{id}/fund",            api_user_task_fund)

    # Admin — user tasks
    app.router.add_get( "/api/admin/user-tasks",                      api_admin_user_tasks)
    app.router.add_post("/api/admin/user-tasks/{id}/approve",         api_admin_approve_user_task)
    app.router.add_post("/api/admin/user-tasks/{id}/reject",          api_admin_reject_user_task)

    # SPA fallback — must be last
    app.router.add_get("/{path:.*}",                       serve_app)

    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", PORT).start()
    log.info("Web server listening on port %s", PORT)


async def main() -> None:
    log.info("Starting TonCipher bot + web server…")
    await init_db()
    tasks: list = [start_web()]
    if bot:
        tasks.append(dp.start_polling(bot, allowed_updates=["message"]))
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())
