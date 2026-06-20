"""
TonCipher — Telegram Mini App Bot + Web Server

Anti-fraud: Telegram initData HMAC validation, IP multi-account detection,
self-referral detection, rate limiting, fraud alert logging.
Transactions: deposit/withdrawal persistence with admin approve/reject flow.
"""
import asyncio
import base64
import hashlib
import json
import hmac as hmac_lib
import logging
import math
import os
import signal
import time
import uuid
from collections import defaultdict
from urllib.parse import parse_qsl

import aiohttp
import aiosqlite
from aiohttp import web
from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import CommandStart, Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from cryptography.fernet import Fernet

BOT_TOKEN         = os.getenv("BOT_TOKEN", "")
WEBAPP_URL        = os.getenv("WEBAPP_URL", "https://toncipherbot.onrender.com")
PORT              = int(os.getenv("PORT", 8080))
# DATABASE_PATH env var → set to a persistent volume path on Railway/Render
# e.g. DATABASE_PATH=/data/toncipherbot.db  (with volume mounted at /data)
# Falls back to ./data/ (ephemeral — data is lost on restarts) if not set.
DB_PATH = os.getenv(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(__file__), "data", "toncipherbot.db"),
)
ADMIN_SECRET      = os.getenv("ADMIN_SECRET", "")
ADMIN_TELEGRAM_ID = int(os.getenv("ADMIN_TELEGRAM_ID", "0"))
OFFICIAL_CHANNEL   = os.getenv("OFFICIAL_CHANNEL",   "@TonCipher_officiel")
WITHDRAWAL_CHANNEL = os.getenv("WITHDRAWAL_CHANNEL", "@TonCipher_Pays")

REFERRAL_BONUS_TON  = float(os.getenv("REFERRAL_BONUS_TON", "1.0"))
MAX_ACCOUNTS_PER_IP = int(os.getenv("MAX_ACCOUNTS_PER_IP", "3"))
RATE_LIMIT_MAX      = int(os.getenv("RATE_LIMIT_MAX", "30"))  # requests / minute / IP
RATE_LIMIT_WINDOW   = 60  # seconds

# ── GitHub backup (free persistent storage) ────────────────────────────────────
# GITHUB_TOKEN  : Personal Access Token with "repo" scope
# GITHUB_REPO   : "owner/repo" (defaults to this repo)
# DB_BACKUP_KEY : Random key — generate once with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
GITHUB_TOKEN  = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO   = os.getenv("GITHUB_REPO", "aryanpuri17/toncipherbot")
DB_BACKUP_KEY = os.getenv("DB_BACKUP_KEY", "")
_BACKUP_TAG   = "db-backup"
_BACKUP_NAME  = "toncipherbot.db.enc"

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN) if BOT_TOKEN else None
dp  = Dispatcher()

_CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key, X-Init-Data",
}

# ── USDT Jetton monitor config ────────────────────────────────────────────────
# HOT_WALLET_ADDRESS : The platform's TON wallet address that receives USDT deposits
# TONCENTER_API_KEY  : Optional TonCenter API key for higher rate limits
# USDT_JETTON_MASTER : Standard USDT Jetton contract on TON mainnet
HOT_WALLET_ADDRESS  = os.getenv("HOT_WALLET_ADDRESS", "")
TONCENTER_API_KEY   = os.getenv("TONCENTER_API_KEY", "")
USDT_JETTON_MASTER  = "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs"
USDT_DISCOUNT       = 0.98   # 2 % below market rate credited to user
USDT_MIN_AMOUNT     = 0.1    # minimum USDT deposit (in USDT, not nano)

_ton_price_cache: dict = {"price": None, "ts": 0}

# ── Platform task definitions (server-authoritative) ──────────────────────────
# Keys must match id values in frontend _defaultTasks.
# verification: 'none'|'channel'|'bot'|'timer'|'referral'|'proof'
# max_per_user: 0 = unlimited with cooldown, 1 = one-time only
# ── Withdrawal security limits (overridable via env vars) ─────────────────────
WD_MIN_AMOUNT  = float(os.getenv("WD_MIN_AMOUNT",  "0.1"))    # minimum per withdrawal (GRAM)
WD_MAX_AMOUNT  = float(os.getenv("WD_MAX_AMOUNT",  "5000.0")) # maximum per withdrawal (GRAM)
WD_DAILY_LIMIT = float(os.getenv("WD_DAILY_LIMIT", "1000.0")) # per-user daily total (GRAM)
WD_MAX_PENDING = int(os.getenv("WD_MAX_PENDING",   "3"))       # max simultaneous pending per user
WD_MIN_TASKS   = int(os.getenv("WD_MIN_TASKS",     "3"))       # min completed tasks before first withdrawal

# ── Platform task definitions (server-authoritative) ──────────────────────────
# Keys must match id values in frontend _defaultTasks.
# verification: 'none'|'channel'|'bot'|'timer'|'referral'|'proof'
# max_per_user: 0 = unlimited with cooldown, 1 = one-time only
PLATFORM_TASKS: dict[str, dict] = {
    "1":  {"type": "daily",        "reward": 0.10,  "cooldown_hours": 24, "verification": "none",     "target": None,                 "max_per_user": 0},
    "2":  {"type": "join_channel", "reward": 0.002, "cooldown_hours":  0, "verification": "channel",  "target": "@TonCipher_Official", "max_per_user": 1},
    "3":  {"type": "join_channel", "reward": 0.002, "cooldown_hours":  0, "verification": "channel",  "target": "@TonCipher_Pays",     "max_per_user": 1},
    "4":  {"type": "start_bot",    "reward": 0.002, "cooldown_hours":  0, "verification": "bot",      "target": None,                 "max_per_user": 1},
    "5":  {"type": "special",      "reward": 1.50,  "cooldown_hours":  0, "verification": "referral", "target": None,                 "max_per_user": 1, "required_referrals": 3},
    "6":  {"type": "special",      "reward": 0.80,  "cooldown_hours":  0, "verification": "proof",    "target": None,                 "max_per_user": 1},
    "7":  {"type": "watch_video",  "reward": 0.002, "cooldown_hours":  0, "verification": "timer",    "target": None,                 "max_per_user": 1, "min_seconds": 20},
    "8":  {"type": "social",       "reward": 0.002, "cooldown_hours":  0, "verification": "timer",    "target": None,                 "max_per_user": 1, "min_seconds": 30},
    "9":  {"type": "social",       "reward": 0.002, "cooldown_hours":  0, "verification": "timer",    "target": None,                 "max_per_user": 1, "min_seconds": 30},
    "10": {"type": "social",       "reward": 0.002, "cooldown_hours":  0, "verification": "timer",    "target": None,                 "max_per_user": 1, "min_seconds": 30},
}

# ── Server-Sent Events (real-time task updates) ───────────────────────────────

_sse_queues: list[asyncio.Queue] = []


async def _sse_broadcast(event: str, data: dict) -> None:
    """Push an event to every connected SSE client."""
    msg = f"event: {event}\ndata: {json.dumps(data)}\n\n".encode()
    dead = []
    for q in list(_sse_queues):
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            dead.append(q)
    for d in dead:
        try: _sse_queues.remove(d)
        except ValueError: pass


async def api_tasks_stream(request: web.Request) -> web.StreamResponse:
    """SSE endpoint — clients subscribe here for real-time task lifecycle events."""
    resp = web.StreamResponse()
    resp.headers["Content-Type"] = "text/event-stream"
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"
    resp.headers.update(_CORS)
    await resp.prepare(request)
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    _sse_queues.append(queue)
    try:
        await resp.write(b"event: connected\ndata: {}\n\n")
        while True:
            try:
                msg = await asyncio.wait_for(queue.get(), timeout=25)
                await resp.write(msg)
            except asyncio.TimeoutError:
                await resp.write(b": ping\n\n")
    except Exception:
        pass
    finally:
        try: _sse_queues.remove(queue)
        except ValueError: pass
    return resp

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
        log.warning("ADMIN_SECRET is not set — admin API is publicly accessible!")
        return True
    return request.headers.get("X-Admin-Key", "") == ADMIN_SECRET


def _init_data_user_id(init_data: str) -> int:
    """Extract the Telegram user id embedded in initData (0 if absent/invalid)."""
    try:
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))
        user = json.loads(parsed.get("user", "{}"))
        return int(user.get("id", 0))
    except Exception:
        return 0


def _verify_user_request(init_data: str, telegram_id: int) -> bool:
    """Authenticate a state-changing user request.

    When BOT_TOKEN is configured, the request must carry valid Telegram
    initData whose embedded user id matches the claimed telegram_id —
    otherwise anyone could act on behalf of any user. Without a bot token
    (local dev) everything passes.
    """
    if not BOT_TOKEN:
        return True
    if not _validate_init_data(init_data, BOT_TOKEN):
        return False
    return _init_data_user_id(init_data) == telegram_id


def _extract_chat_ref(url: str) -> str | None:
    """Turn a t.me link into a @username the Bot API can check, or None
    for invite links (+hash / joinchat) that can't be verified by username."""
    try:
        from urllib.parse import urlparse
        p = urlparse(url if "://" in url else "https://" + url)
        if p.netloc.lower() not in ("t.me", "telegram.me", "www.t.me"):
            return None
        seg = [s for s in p.path.split("/") if s]
        if not seg:
            return None
        first = seg[0]
        if first.startswith("+") or first.lower() == "joinchat":
            return None
        return "@" + first
    except Exception:
        return None


async def _is_chat_member(chat_ref: str, telegram_id: int) -> bool | None:
    """True/False if membership could be checked, None if unverifiable
    (bot missing from chat, network error…)."""
    if not bot:
        return None
    try:
        from aiogram.enums import ChatMemberStatus
        member = await bot.get_chat_member(chat_ref, telegram_id)
        return member.status in (
            ChatMemberStatus.MEMBER,
            ChatMemberStatus.ADMINISTRATOR,
            ChatMemberStatus.CREATOR,
        )
    except Exception as e:
        log.warning("Membership check failed for %d in %s: %s", telegram_id, chat_ref, e)
        return None


def _parse_amount(raw: object) -> float | None:
    """Parse a positive finite amount; returns None for anything else (NaN, inf, negatives, junk)."""
    try:
        value = float(raw)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(value) or value <= 0:
        return None
    return value


def _parse_telegram_id(raw: object) -> int:
    """Parse a telegram id; returns 0 for invalid input."""
    try:
        value = int(raw)  # type: ignore[arg-type]
        return value if value > 0 else 0
    except (TypeError, ValueError):
        return 0


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


# ── GitHub DB backup / restore ─────────────────────────────────────────────────

def _fernet() -> Fernet | None:
    if not DB_BACKUP_KEY:
        return None
    try:
        return Fernet(DB_BACKUP_KEY.encode())
    except Exception:
        return None

async def _gh_release_id(session: "aiohttp.ClientSession", create: bool = False) -> int | None:
    """Return the GitHub release id for _BACKUP_TAG, optionally creating it."""
    import aiohttp as _aiohttp
    headers = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"}
    url = f"https://api.github.com/repos/{GITHUB_REPO}/releases/tags/{_BACKUP_TAG}"
    async with session.get(url, headers=headers) as r:
        if r.status == 200:
            return (await r.json())["id"]
    if not create:
        return None
    async with session.post(
        f"https://api.github.com/repos/{GITHUB_REPO}/releases",
        headers=headers,
        json={"tag_name": _BACKUP_TAG, "name": "DB Backup", "body": "Auto backup — do not delete", "prerelease": True},
    ) as r:
        if r.status == 201:
            return (await r.json())["id"]
    return None

async def restore_db_from_github() -> bool:
    """Download and decrypt the latest DB backup from GitHub on startup."""
    if not GITHUB_TOKEN or not DB_BACKUP_KEY:
        return False
    f = _fernet()
    if not f:
        return False
    try:
        import aiohttp as _aiohttp
        headers = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"}
        async with _aiohttp.ClientSession() as session:
            release_id = await _gh_release_id(session)
            if not release_id:
                log.info("GitHub backup: no release found, starting fresh")
                return False
            async with session.get(
                f"https://api.github.com/repos/{GITHUB_REPO}/releases/{release_id}/assets",
                headers=headers,
            ) as r:
                assets = await r.json() if r.status == 200 else []
            asset = next((a for a in assets if a["name"] == _BACKUP_NAME), None)
            if not asset:
                log.info("GitHub backup: no asset found")
                return False
            dl_headers = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/octet-stream"}
            async with session.get(asset["url"], headers=dl_headers, allow_redirects=True) as r:
                if r.status != 200:
                    log.warning("GitHub backup: download failed %s", r.status)
                    return False
                enc_data = await r.read()
        decrypted = f.decrypt(enc_data)
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        with open(DB_PATH, "wb") as fh:
            fh.write(decrypted)
        log.info("DB restored from GitHub backup (%d bytes)", len(decrypted))
        return True
    except Exception as e:
        log.warning("GitHub restore failed: %s", e)
        return False

async def backup_db_to_github() -> bool:
    """Encrypt and upload current DB to GitHub release (overwrites previous backup)."""
    if not GITHUB_TOKEN or not DB_BACKUP_KEY or not os.path.exists(DB_PATH):
        return False
    f = _fernet()
    if not f:
        return False
    try:
        import aiohttp as _aiohttp
        with open(DB_PATH, "rb") as fh:
            raw = fh.read()
        enc = f.encrypt(raw)
        headers_json = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"}
        async with _aiohttp.ClientSession() as session:
            release_id = await _gh_release_id(session, create=True)
            if not release_id:
                log.warning("GitHub backup: could not get/create release")
                return False
            # Delete old asset if exists
            async with session.get(
                f"https://api.github.com/repos/{GITHUB_REPO}/releases/{release_id}/assets",
                headers=headers_json,
            ) as r:
                assets = await r.json() if r.status == 200 else []
            for a in assets:
                if a["name"] == _BACKUP_NAME:
                    await session.delete(
                        f"https://api.github.com/repos/{GITHUB_REPO}/releases/assets/{a['id']}",
                        headers=headers_json,
                    )
            # Upload new asset
            upload_url = (
                f"https://uploads.github.com/repos/{GITHUB_REPO}"
                f"/releases/{release_id}/assets?name={_BACKUP_NAME}"
            )
            upload_headers = {"Authorization": f"token {GITHUB_TOKEN}", "Content-Type": "application/octet-stream"}
            async with session.post(upload_url, headers=upload_headers, data=enc) as r:
                if r.status == 201:
                    log.info("DB backed up to GitHub (%d bytes encrypted)", len(enc))
                    return True
                log.warning("GitHub backup upload failed: %s", r.status)
                return False
    except Exception as e:
        log.warning("GitHub backup failed: %s", e)
        return False

async def _periodic_backup() -> None:
    """Back up DB every 10 minutes."""
    while True:
        await asyncio.sleep(600)
        await backup_db_to_github()


# ── Database ───────────────────────────────────────────────────────────────────

async def init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
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
        await db.execute("""
            CREATE TABLE IF NOT EXISTS platform_config (
                key        TEXT PRIMARY KEY,
                value      TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS bot_verifications (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER NOT NULL,
                task_id     TEXT    NOT NULL,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                UNIQUE(telegram_id, task_id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS waiting_proof (
                telegram_id INTEGER PRIMARY KEY,
                task_id     TEXT    NOT NULL,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS social_proofs (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER NOT NULL,
                task_id     TEXT    NOT NULL,
                file_id     TEXT    NOT NULL,
                status      TEXT    NOT NULL DEFAULT 'pending',
                created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                reviewed_at TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS usdt_pending (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id    INTEGER NOT NULL,
                amount_usdt    REAL    NOT NULL,
                sender_address TEXT    NOT NULL DEFAULT '',
                deposit_code   TEXT    NOT NULL DEFAULT '',
                created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
                status         TEXT    NOT NULL DEFAULT 'pending'
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS task_departures (
                telegram_id INTEGER NOT NULL,
                task_id     TEXT    NOT NULL,
                departed_at TEXT    NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (telegram_id, task_id)
            )
        """)
        # Server-authoritative platform task completion log.
        # Each row is one completion event (daily tasks may have many rows per user).
        # Used for dedup (one-time tasks) and cooldown checks (daily tasks).
        await db.execute("""
            CREATE TABLE IF NOT EXISTS platform_task_completions (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id  INTEGER NOT NULL,
                task_id      TEXT    NOT NULL,
                completed_at TEXT    NOT NULL DEFAULT (datetime('now')),
                earned       REAL    NOT NULL DEFAULT 0
            )
        """)
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_ptc_lookup"
            " ON platform_task_completions(telegram_id, task_id, completed_at)"
        )
        # A given on-chain tx hash may only be credited once — blocks deposit replay
        await db.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_deposit_txhash
            ON transactions(tx_hash) WHERE type = 'deposit' AND tx_hash != ''
        """)
        # Performance indices — CREATE INDEX IF NOT EXISTS is idempotent
        await db.execute("CREATE INDEX IF NOT EXISTS idx_tx_telegram_id ON transactions(telegram_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_tx_type        ON transactions(type)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_tx_status      ON transactions(status)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_tx_created_at  ON transactions(created_at)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_ut_creator     ON user_tasks(creator_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_ut_status      ON user_tasks(status)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_utc_task       ON user_task_completions(task_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_fa_telegram    ON fraud_alerts(telegram_id)")

        # Backward-compat migrations — safe to run on existing DB
        for tbl, col, defn in [
            ("users", "referral_balance",   "REAL    NOT NULL DEFAULT 0"),
            ("users", "ip_address",         "TEXT"),
            ("users", "flagged",            "INTEGER NOT NULL DEFAULT 0"),
            ("users", "banned",             "INTEGER NOT NULL DEFAULT 0"),
            ("users", "withdrawal_blocked", "INTEGER NOT NULL DEFAULT 0"),
            ("users", "bot_started",        "INTEGER NOT NULL DEFAULT 0"),
            # Server-side mini-app balance backup — restores user state when
            # the Telegram WebView clears localStorage or on a new device.
            ("users", "app_balance",        "REAL"),
            ("users", "app_total_earnings", "REAL"),
            ("users", "app_tasks_completed", "INTEGER"),
            # JSON list of completed platform-task ids. Restored together with
            # the balance so clearing localStorage can't re-farm one-time tasks.
            ("users", "app_completed_tasks", "TEXT"),
            ("social_proofs", "creator_id", "INTEGER"),
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

    arg = (msg.text or "").split(maxsplit=1)[1] if len((msg.text or "").split()) > 1 else ""

    # ── Bot verification for start_bot tasks ──
    if arg.startswith("vb_"):
        rest = arg[3:]  # <taskId>_<telegramId>
        sep = rest.rfind("_")
        if sep > 0:
            task_id    = rest[:sep]
            claimed_id = rest[sep + 1:]
            if claimed_id == str(msg.from_user.id):
                async with aiosqlite.connect(DB_PATH) as db:
                    await db.execute(
                        "INSERT OR IGNORE INTO bot_verifications (telegram_id, task_id) VALUES (?,?)",
                        (msg.from_user.id, task_id),
                    )
                    await db.commit()
                await msg.answer(
                    "✅ <b>Visite confirmée !</b>\n\nRevenez dans l'app et appuyez sur <b>Vérifier</b> pour recevoir votre récompense.",
                    parse_mode="HTML",
                )
            else:
                await msg.answer("❌ Lien invalide.")
        return

    # ── Social proof request ──
    if arg.startswith("sp_"):
        rest = arg[3:]
        sep = rest.rfind("_")
        if sep > 0:
            task_id    = rest[:sep]
            claimed_id = rest[sep + 1:]
            if claimed_id == str(msg.from_user.id):
                async with aiosqlite.connect(DB_PATH) as db:
                    await db.execute(
                        "INSERT OR REPLACE INTO waiting_proof (telegram_id, task_id) VALUES (?,?)",
                        (msg.from_user.id, task_id),
                    )
                    await db.commit()
                await msg.answer(
                    "📸 <b>Envoyez maintenant votre screenshot</b> comme preuve que vous avez effectué l'action.\n\n"
                    "• Instagram / TikTok : screenshot du profil avec le bouton <i>Abonné</i>\n"
                    "• X (Twitter) : screenshot du profil avec <i>Suivi(e)</i>\n"
                    "• Discord : screenshot du serveur rejoint",
                    parse_mode="HTML",
                )
            else:
                await msg.answer("❌ Lien invalide.")
        return

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


# ── Bot command: /credit ──────────────────────────────────────────────────────

@dp.message(Command("credit"))
async def cmd_credit(msg: types.Message):
    if msg.from_user.id != ADMIN_TELEGRAM_ID:
        return

    args = (msg.text or "").split(maxsplit=3)[1:]
    if len(args) < 2:
        await msg.reply(
            "❌ Usage : <code>/credit &lt;id_ou_@username&gt; &lt;montant&gt; [note]</code>\n\n"
            "Exemples :\n"
            "<code>/credit 123456789 5.00</code>\n"
            "<code>/credit @monami 10 Cadeau</code>",
            parse_mode="HTML",
        )
        return

    target_raw = args[0]
    try:
        amount = float(args[1])
    except ValueError:
        await msg.reply("❌ Montant invalide.", parse_mode="HTML")
        return

    if not (0 < amount <= 100_000):
        await msg.reply("❌ Montant doit être entre 0 et 100 000 GRAM.", parse_mode="HTML")
        return

    note = args[2] if len(args) > 2 else "Crédit admin"

    async with aiosqlite.connect(DB_PATH) as db:
        if target_raw.startswith("@"):
            async with db.execute(
                "SELECT telegram_id, first_name, username FROM users WHERE username = ? COLLATE NOCASE",
                (target_raw[1:],),
            ) as cur:
                row = await cur.fetchone()
        else:
            try:
                tid = int(target_raw)
            except ValueError:
                await msg.reply("❌ ID invalide. Utilisez un nombre ou @username.", parse_mode="HTML")
                return
            async with db.execute(
                "SELECT telegram_id, first_name, username FROM users WHERE telegram_id = ?",
                (tid,),
            ) as cur:
                row = await cur.fetchone()

        if not row:
            await msg.reply(f"❌ Utilisateur introuvable : <code>{target_raw}</code>", parse_mode="HTML")
            return

        target_id  = row[0]
        first_name = row[1] or "Utilisateur"
        username   = row[2]

        await db.execute(
            """UPDATE users
               SET app_balance        = COALESCE(app_balance, 0)        + ?,
                   app_total_earnings = COALESCE(app_total_earnings, 0) + ?
               WHERE telegram_id = ?""",
            (amount, amount, target_id),
        )
        await db.execute(
            """INSERT INTO transactions
                   (id, telegram_id, type, amount, currency, network, address, status, admin_note)
               VALUES (?, ?, 'admin_credit', ?, 'GRAM', 'admin', 'admin', 'completed', ?)""",
            (str(uuid.uuid4()), target_id, amount, note),
        )
        await db.commit()

    try:
        note_line = f"\n📝 <i>{note}</i>" if note != "Crédit admin" else ""
        await bot.send_message(
            target_id,
            f"💎 <b>Crédit reçu !</b>\n\n"
            f"Bonjour <b>{first_name}</b> 👋\n\n"
            f"L'équipe TonCipher vous a crédité :\n"
            f"<b>+{amount:.4f} GRAM</b>{note_line}\n\n"
            f"Votre solde a été mis à jour instantanément.\n"
            f"Merci de votre confiance en TonCipher ! 🙏",
            parse_mode="HTML",
        )
    except Exception:
        pass

    username_part = f" (@{username})" if username else ""
    await msg.reply(
        f"✅ <b>Crédit envoyé !</b>\n\n"
        f"👤 {first_name}{username_part}\n"
        f"🆔 <code>{target_id}</code>\n"
        f"💎 <b>+{amount:.4f} GRAM</b>\n"
        f"📝 {note}",
        parse_mode="HTML",
    )


# ── Photo handler — social proof screenshots ──────────────────────────────────

@dp.message(F.photo)
async def handle_proof_photo(msg: types.Message) -> None:
    uid = msg.from_user.id
    proof_id = None
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT task_id FROM waiting_proof WHERE telegram_id = ?", (uid,)
        ) as cur:
            wp = await cur.fetchone()
        if not wp:
            return  # not in proof-waiting state

        task_id = wp[0]
        file_id = msg.photo[-1].file_id

        async with db.execute(
            "SELECT creator_id, title FROM user_tasks WHERE id = ?", (task_id,)
        ) as cur:
            trow = await cur.fetchone()

        creator_id = trow[0] if trow else None
        task_title = trow[1] if trow else f"Tâche #{task_id}"

        async with db.execute(
            "INSERT INTO social_proofs (telegram_id, task_id, file_id, creator_id) VALUES (?,?,?,?)",
            (uid, task_id, file_id, creator_id),
        ) as cur_ins:
            proof_id = cur_ins.lastrowid
        await db.execute("DELETE FROM waiting_proof WHERE telegram_id = ?", (uid,))
        await db.commit()

    # Notify admin (or task creator) with the photo + approve/reject buttons
    notify_id = creator_id if creator_id else ADMIN_TELEGRAM_ID
    if notify_id and proof_id is not None:
        username = msg.from_user.username or ""
        user_display = f"@{username}" if username else f"ID {uid}"
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(
                text="✅ Approuver",
                callback_data=f"proof_ok_{proof_id}_{uid}_{task_id}",
            ),
            InlineKeyboardButton(
                text="❌ Refuser",
                callback_data=f"proof_ko_{proof_id}_{uid}_{task_id}",
            ),
        ]])
        try:
            await bot.send_photo(
                notify_id,
                photo=file_id,
                caption=(
                    f"📸 <b>Preuve à valider</b>\n\n"
                    f"Tâche : <b>{task_title}</b>\n"
                    f"Utilisateur : {user_display} (<code>{uid}</code>)"
                ),
                parse_mode="HTML",
                reply_markup=kb,
            )
        except Exception:
            pass

    await msg.answer(
        "⏳ <b>Preuve reçue !</b>\n\nElle est en cours de vérification par notre équipe. "
        "Vous recevrez une notification dès la validation.",
        parse_mode="HTML",
    )


# ── Callback — admin approves / rejects social proof ──────────────────────────

@dp.callback_query(F.data.startswith("proof_"))
async def handle_proof_callback(cb: types.CallbackQuery) -> None:
    if cb.from_user.id != ADMIN_TELEGRAM_ID:
        await cb.answer("Non autorisé")
        return

    parts    = cb.data.split("_")  # proof_ok_<proofId>_<userId>_<taskId>
    action   = parts[1]            # ok | ko
    proof_id = int(parts[2])
    user_tg  = int(parts[3])
    task_id  = "_".join(parts[4:])

    new_status = "approved" if action == "ok" else "rejected"

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE social_proofs SET status=?, reviewed_at=datetime('now') WHERE id=?",
            (new_status, proof_id),
        )
        await db.commit()

    try:
        await cb.message.edit_reply_markup(reply_markup=None)
    except Exception:
        pass

    if action == "ok":
        await cb.answer("✅ Approuvé")
        try:
            await bot.send_message(
                user_tg,
                "✅ <b>Preuve validée !</b>\n\nRevenez dans l'app — votre récompense va être créditée automatiquement.",
                parse_mode="HTML",
            )
        except Exception:
            pass
    else:
        await cb.answer("❌ Refusé")
        try:
            await bot.send_message(
                user_tg,
                "❌ Votre preuve n'a pas été acceptée. Assurez-vous d'effectuer l'action demandée et renvoyez un screenshot plus clair.",
                parse_mode="HTML",
            )
        except Exception:
            pass


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
    username    = (data.get("username")   or "")[:64]
    first_name  = (data.get("firstName")  or "")[:128]
    last_name   = (data.get("lastName")   or "")[:128]
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
            "SELECT referral_count, referral_balance, flagged, banned, withdrawal_blocked,"
            "       app_balance, app_total_earnings, app_tasks_completed, app_completed_tasks"
            " FROM users WHERE telegram_id = ?",
            (telegram_id,),
        ) as cur:
            row = await cur.fetchone()

        # Server-authoritative completions from platform_task_completions table.
        # Merge these so clearing localStorage can't re-farm one-time tasks.
        async with db.execute(
            "SELECT DISTINCT task_id FROM platform_task_completions WHERE telegram_id = ?",
            (telegram_id,)
        ) as cur:
            server_ptc = [r[0] async for r in cur]

    completed_tasks: list = []
    if row and row[8]:
        try:
            parsed_tasks = json.loads(row[8])
            if isinstance(parsed_tasks, list):
                completed_tasks = parsed_tasks
        except (ValueError, TypeError):
            pass
    # Union: client-saved IDs + server-confirmed IDs (server wins on conflicts)
    completed_tasks = list(set(completed_tasks) | set(server_ptc))

    return web.json_response({
        "referralCount":      row[0] if row else 0,
        "referralBalance":    row[1] if row else 0.0,
        "flagged":            bool(row[2]) if row else False,
        "banned":             bool(row[3]) if row else False,
        "withdrawalBlocked":  bool(row[4]) if row else False,
        "appBalance":         row[5] if row else None,
        "appTotalEarnings":   row[6] if row else None,
        "appTasksCompleted":  row[7] if row else None,
        "appCompletedTasks":  completed_tasks,
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

        ins = await db.execute(
            "INSERT OR IGNORE INTO referrals (referrer_id, referee_id) VALUES (?, ?)",
            (referrer_id, referee_id),
        )
        if ins.rowcount == 0:
            # Lost a race with a concurrent identical request — don't credit twice
            return web.json_response({"success": False, "error": "Already referred"}, headers=_CORS)
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
    ip = _client_ip(request)
    if _is_rate_limited(ip):
        return web.json_response({"error": "Rate limit exceeded"}, status=429, headers=_CORS)

    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    tx_id       = str(data.get("id", "")).strip() or _short_id()
    telegram_id = _parse_telegram_id(data.get("telegramId"))
    amount      = _parse_amount(data.get("amount"))
    currency    = str(data.get("currency", "TON"))
    network     = str(data.get("network",  "TON"))
    tx_hash     = str(data.get("txHash",   "")).strip()
    init_data   = str(data.get("initData", "")).strip()

    if not telegram_id or amount is None:
        return web.json_response({"error": "Invalid data"}, status=400, headers=_CORS)

    if BOT_TOKEN:
        if not init_data or not _validate_init_data(init_data, BOT_TOKEN):
            return web.json_response({"error": "Authentication required"}, status=401, headers=_CORS)
        authed_id = _init_data_user_id(init_data)
        if authed_id != telegram_id:
            log.warning("Deposit fraud attempt: claimed=%d authed=%d hash=%s",
                        telegram_id, authed_id, tx_hash[:16])
            return web.json_response({"error": "Identity mismatch"}, status=403, headers=_CORS)

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
    """Create a withdrawal request with full server-side validation.

    Security model:
    - Transaction ID is generated SERVER-SIDE (client ID is ignored)
    - app_balance is checked and atomically reserved before confirming
    - Duplicate / concurrent requests blocked by the atomic UPDATE
    - Daily limit, pending cap, min tasks all validated against DB (not client state)
    - initData signature verifies the caller's Telegram identity
    """
    ip = _client_ip(request)
    if _is_rate_limited(ip):
        return web.json_response({"error": "Rate limit exceeded"}, status=429, headers=_CORS)

    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    telegram_id = _parse_telegram_id(data.get("telegramId"))
    amount      = _parse_amount(data.get("amount"))
    currency    = str(data.get("currency", "TON"))[:10]
    network     = str(data.get("network",  "TON"))[:20]
    address     = (data.get("address") or "").strip()[:128]
    fee         = _parse_amount(data.get("fee")) or 0.0
    init_data   = str(data.get("initData", "")).strip()

    # ── Basic input validation ─────────────────────────────────────────────────
    if not telegram_id or amount is None:
        return web.json_response({"error": "Données manquantes"}, status=400, headers=_CORS)
    if len(address) < 20:
        return web.json_response({"error": "Adresse invalide (trop courte)"}, status=400, headers=_CORS)
    if amount < WD_MIN_AMOUNT:
        return web.json_response(
            {"error": f"Montant minimum : {WD_MIN_AMOUNT} GRAM"}, status=400, headers=_CORS
        )
    if amount > WD_MAX_AMOUNT:
        return web.json_response(
            {"error": f"Montant maximum : {WD_MAX_AMOUNT} GRAM"}, status=400, headers=_CORS
        )

    # ── Identity verification ─────────────────────────────────────────────────
    if not _verify_user_request(init_data, telegram_id):
        if BOT_TOKEN:
            authed_id = _init_data_user_id(init_data)
            if authed_id and authed_id != telegram_id:
                log.warning("Withdrawal impersonation: claimed=%d authed=%d addr=%s",
                            telegram_id, authed_id, address[:12])
            return web.json_response({"error": "Authentification requise"}, status=401, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        # ── User status check ──────────────────────────────────────────────────
        async with db.execute(
            "SELECT banned, withdrawal_blocked, app_balance, app_tasks_completed,"
            "       username, first_name, flagged"
            " FROM users WHERE telegram_id = ?",
            (telegram_id,)
        ) as cur:
            urow = await cur.fetchone()

        if not urow:
            return web.json_response({"error": "Utilisateur introuvable"}, status=404, headers=_CORS)

        banned, wd_blocked, app_balance, tasks_done, uname, fname, is_flagged = urow
        app_balance  = float(app_balance  or 0)
        tasks_done   = int(tasks_done or 0)

        if banned:
            return web.json_response({"error": "Compte banni"}, status=403, headers=_CORS)
        if wd_blocked:
            return web.json_response({"error": "Retraits bloqués sur ce compte"}, status=403, headers=_CORS)

        # ── Minimum tasks requirement ──────────────────────────────────────────
        if tasks_done < WD_MIN_TASKS:
            return web.json_response(
                {"error": f"Complétez au moins {WD_MIN_TASKS} tâches avant de retirer "
                          f"({tasks_done}/{WD_MIN_TASKS})"},
                status=400, headers=_CORS
            )

        # ── Server-side balance check ──────────────────────────────────────────
        if app_balance < amount:
            return web.json_response(
                {"error": f"Solde insuffisant ({app_balance:.4f} GRAM disponibles)"},
                status=400, headers=_CORS
            )

        # ── Pending withdrawal cap (anti double-spend) ─────────────────────────
        async with db.execute(
            "SELECT COUNT(*), COALESCE(SUM(amount),0)"
            " FROM transactions"
            " WHERE telegram_id = ? AND type = 'withdrawal' AND status = 'pending'",
            (telegram_id,)
        ) as cur:
            pending_count, pending_sum = await cur.fetchone()
        if pending_count >= WD_MAX_PENDING:
            return web.json_response(
                {"error": f"Vous avez déjà {pending_count} retraits en attente. "
                          f"Attendez qu'ils soient traités."},
                status=400, headers=_CORS
            )
        # Ensure pending + new request does not exceed actual balance
        if float(pending_sum or 0) + amount > app_balance:
            return web.json_response(
                {"error": "Solde insuffisant (retrait en attente pris en compte)"},
                status=400, headers=_CORS
            )

        # ── Daily limit check ─────────────────────────────────────────────────
        async with db.execute(
            "SELECT COALESCE(SUM(amount),0)"
            " FROM transactions"
            " WHERE telegram_id = ? AND type = 'withdrawal'"
            "   AND status != 'rejected'"
            "   AND DATE(created_at) = DATE('now')",
            (telegram_id,)
        ) as cur:
            (daily_total,) = await cur.fetchone()
        if float(daily_total or 0) + amount > WD_DAILY_LIMIT:
            remaining = max(0, WD_DAILY_LIMIT - float(daily_total or 0))
            return web.json_response(
                {"error": f"Limite journalière atteinte. Restant aujourd'hui : {remaining:.2f} GRAM"},
                status=400, headers=_CORS
            )

        # ── Atomic balance reservation ─────────────────────────────────────────
        # Only succeeds if app_balance is still sufficient (race-condition-safe).
        upd = await db.execute(
            "UPDATE users SET app_balance = app_balance - ?"
            " WHERE telegram_id = ? AND COALESCE(app_balance, 0) >= ?",
            (amount, telegram_id, amount)
        )
        if upd.rowcount == 0:
            return web.json_response(
                {"error": "Solde insuffisant (actualisé) — réessayez"},
                status=400, headers=_CORS
            )

        # ── Insert withdrawal record with SERVER-GENERATED id ──────────────────
        tx_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO transactions"
            " (id, telegram_id, type, amount, currency, network, address, status, fee)"
            " VALUES (?, ?, 'withdrawal', ?, ?, ?, ?, 'pending', ?)",
            (tx_id, telegram_id, amount, currency, network, address, fee)
        )
        await db.commit()

    # Fetch user info for the notification
    uname  = uname  or ""
    fname  = fname  or ""
    is_flagged = bool(is_flagged)

    flag_warn = "\n⚠️ <b>Compte signalé (anti-fraude)</b> — vérification recommandée." if is_flagged else ""
    from datetime import datetime as _dt
    now_str = _dt.utcnow().strftime("%d/%m/%Y à %H:%M UTC")
    admin_msg = (
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"💸 <b>DEMANDE DE RETRAIT</b>{flag_warn}\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 <b>Utilisateur :</b> {fname} @{uname or 'inconnu'}\n"
        f"🆔 <b>Telegram ID :</b> <code>{telegram_id}</code>\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"💰 <b>Montant :</b> <b>{amount:.4f} {currency}</b>\n"
        f"🌐 <b>Réseau :</b> {network}\n"
        f"🏷️ <b>Frais :</b> {fee}\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"📬 <b>Adresse :</b>\n<code>{address}</code>\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"🔖 <b>Référence :</b> <code>{tx_id}</code>\n"
        f"🕐 <b>Date :</b> {now_str}\n"
        f"━━━━━━━━━━━━━━━━━━━━━"
    )
    await _notify_admin(admin_msg + "\n\n👉 <b>Ouvre l'admin pour approuver ou refuser.</b>")

    log.info("Withdrawal request: id=%s telegram_id=%d amount=%.2f %s → %s",
             tx_id, telegram_id, amount, currency, address[:12])
    return web.json_response({"success": True, "id": tx_id}, headers=_CORS)


# ── API — Check channel membership ────────────────────────────────────────────

async def api_task_depart(request: web.Request) -> web.Response:
    """Record server-side that a user left to complete a task (anti-cheat timer)."""
    try:
        data        = await request.json()
        telegram_id = int(data.get("telegramId", 0))
        task_id     = str(data.get("taskId", "")).strip()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)
    if not telegram_id or not task_id:
        return web.json_response({"error": "Missing fields"}, status=400, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO task_departures (telegram_id, task_id, departed_at)"
            " VALUES (?, ?, datetime('now'))",
            (telegram_id, task_id),
        )
        await db.commit()
    return web.json_response({"ok": True}, headers=_CORS)


async def api_task_verify_timer(request: web.Request) -> web.Response:
    """Check whether 30 s have passed since the server-recorded departure.
    Returns {ok: True} if verified, {ok: False, remaining: <seconds>} if too early.
    Also deletes the departure record on success so it cannot be reused.
    """
    try:
        telegram_id = int(request.rel_url.query.get("telegramId", 0))
        task_id     = request.rel_url.query.get("taskId", "").strip()
        required_s  = int(request.rel_url.query.get("requiredSeconds", 30))
    except Exception:
        return web.json_response({"ok": False, "remaining": 30}, headers=_CORS)
    if not telegram_id or not task_id:
        return web.json_response({"ok": False, "remaining": 30}, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT (julianday('now') - julianday(departed_at)) * 86400.0"
            " FROM task_departures WHERE telegram_id = ? AND task_id = ?",
            (telegram_id, task_id),
        ) as cur:
            row = await cur.fetchone()

    if row is None:
        # No server-side record — could mean server was sleeping when user clicked;
        # allow through (client-side timer still guards the UI).
        return web.json_response({"ok": True, "noRecord": True}, headers=_CORS)

    elapsed_s = row[0]
    if elapsed_s < required_s:
        remaining = max(1, int(required_s - elapsed_s))
        return web.json_response({"ok": False, "remaining": remaining}, headers=_CORS)

    # Timer passed — delete the record so it cannot be used again
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "DELETE FROM task_departures WHERE telegram_id = ? AND task_id = ?",
            (telegram_id, task_id),
        )
        await db.commit()
    return web.json_response({"ok": True}, headers=_CORS)


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


# ── API — User: check own withdrawal statuses (for balance restoration) ────────

async def api_user_withdrawal_status(request: web.Request) -> web.Response:
    """Return status of the caller's withdrawal transactions so the frontend can
    detect rejections and restore the locally-deducted balance."""
    try:
        telegram_id = int(request.rel_url.query.get("telegram_id", 0))
    except (ValueError, TypeError):
        return web.json_response([], headers=_CORS)
    if not telegram_id:
        return web.json_response([], headers=_CORS)

    # Verify the request comes from the same user via initData
    init_data = request.headers.get("X-Init-Data", "")
    if BOT_TOKEN and init_data and not _validate_init_data(init_data, BOT_TOKEN):
        return web.json_response({"error": "Forbidden"}, status=403, headers=_CORS)
    caller_id = _init_data_user_id(init_data) if init_data else 0
    if caller_id and caller_id != telegram_id:
        return web.json_response({"error": "Forbidden"}, status=403, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("""
            SELECT id, amount, currency, status, processed_at, admin_note,
                   created_at, tx_hash, address, network
            FROM transactions
            WHERE telegram_id = ? AND type = 'withdrawal'
            ORDER BY created_at DESC LIMIT 50
        """, (telegram_id,)) as cur:
            rows = await cur.fetchall()

    return web.json_response([{
        "id":          r[0],
        "amount":      float(r[1]),
        "currency":    r[2],
        "status":      r[3],
        "processedAt": r[4],
        "adminNote":   r[5],
        "createdAt":   r[6],
        "txHash":      r[7],
        "address":     r[8],
        "network":     r[9],
    } for r in rows], headers=_CORS)


# ── API — User: own transaction history (deposits + withdrawals) ───────────────

async def api_user_transactions(request: web.Request) -> web.Response:
    """Return the caller's deposits and withdrawals so the wallet history
    survives app reloads (the frontend transaction list is in-memory)."""
    try:
        telegram_id = int(request.rel_url.query.get("telegram_id", 0))
    except (ValueError, TypeError):
        return web.json_response([], headers=_CORS)
    if not telegram_id:
        return web.json_response([], headers=_CORS)

    # Verify the request comes from the same user via initData
    init_data = request.headers.get("X-Init-Data", "")
    if BOT_TOKEN and init_data and not _validate_init_data(init_data, BOT_TOKEN):
        return web.json_response({"error": "Forbidden"}, status=403, headers=_CORS)
    caller_id = _init_data_user_id(init_data) if init_data else 0
    if caller_id and caller_id != telegram_id:
        return web.json_response({"error": "Forbidden"}, status=403, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("""
            SELECT id, type, amount, currency, network, status,
                   tx_hash, address, created_at, processed_at, admin_note
            FROM transactions
            WHERE telegram_id = ? AND type IN ('deposit', 'withdrawal')
            ORDER BY created_at DESC LIMIT 100
        """, (telegram_id,)) as cur:
            rows = await cur.fetchall()

    return web.json_response([{
        "id":          r[0],
        "type":        r[1],
        "amount":      float(r[2]),
        "currency":    r[3],
        "network":     r[4],
        "status":      r[5],
        "txHash":      r[6],
        "address":     r[7],
        "createdAt":   r[8],
        "processedAt": r[9],
        "adminNote":   r[10],
    } for r in rows], headers=_CORS)


# ── API — User: server-side balance backup ─────────────────────────────────────

async def api_user_balance_set(request: web.Request) -> web.Response:
    """Persist the user's mini-app balance server-side so it survives
    localStorage loss (Telegram WebView cleanup, new device, reinstall)."""
    ip = _client_ip(request)
    if _is_rate_limited(ip):
        return web.json_response({"error": "Rate limit exceeded"}, status=429, headers=_CORS)

    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    telegram_id = _parse_telegram_id(data.get("telegramId"))
    init_data   = str(data.get("initData", ""))
    if not telegram_id:
        return web.json_response({"error": "Invalid telegramId"}, status=400, headers=_CORS)
    if not _verify_user_request(init_data, telegram_id):
        return web.json_response({"error": "Authentication required"}, status=401, headers=_CORS)

    def _nonneg(key: str) -> float | None:
        try:
            value = float(data.get(key, 0))
        except (TypeError, ValueError):
            return None
        return value if math.isfinite(value) and 0 <= value <= 1e9 else None

    balance = _nonneg("balance")
    total   = _nonneg("totalEarnings")
    if balance is None:
        return web.json_response({"error": "Invalid balance"}, status=400, headers=_CORS)
    try:
        tasks_done = max(0, min(10_000_000, int(data.get("tasksCompleted", 0))))
    except (TypeError, ValueError):
        tasks_done = 0

    raw_completed = data.get("completedTasks", [])
    completed_tasks = [str(t)[:64] for t in raw_completed[:300]] if isinstance(raw_completed, list) else []

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """UPDATE users
               SET app_balance = ?, app_total_earnings = ?, app_tasks_completed = ?,
                   app_completed_tasks = ?
               WHERE telegram_id = ?""",
            (balance, total if total is not None else 0.0, tasks_done,
             json.dumps(completed_tasks), telegram_id),
        )
        await db.commit()

    return web.json_response({"success": True}, headers=_CORS)


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

def _require_admin_telegram_id(request: web.Request) -> tuple[int, web.Response | None]:
    """Extract and validate telegram_id from URL path for admin user endpoints."""
    tid = _parse_telegram_id(request.match_info.get("telegram_id"))
    if not tid:
        return 0, web.json_response({"error": "Invalid telegram_id"}, status=400, headers=_CORS)
    return tid, None


async def api_admin_ban_user(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)
    telegram_id, err = _require_admin_telegram_id(request)
    if err: return err
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET banned = 1, flagged = 1 WHERE telegram_id = ?", (telegram_id,))
        await db.commit()
    return web.json_response({"success": True}, headers=_CORS)


async def api_admin_unban_user(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)
    telegram_id, err = _require_admin_telegram_id(request)
    if err: return err
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET banned = 0, flagged = 0 WHERE telegram_id = ?", (telegram_id,))
        await db.commit()
    return web.json_response({"success": True}, headers=_CORS)


async def api_admin_unflag_user(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)
    telegram_id, err = _require_admin_telegram_id(request)
    if err: return err
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET flagged = 0 WHERE telegram_id = ? AND banned = 0", (telegram_id,))
        await db.commit()
    return web.json_response({"success": True}, headers=_CORS)


async def api_admin_block_withdrawals(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)
    telegram_id, err = _require_admin_telegram_id(request)
    if err: return err
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET withdrawal_blocked = 1 WHERE telegram_id = ?", (telegram_id,))
        await db.commit()
    return web.json_response({"success": True}, headers=_CORS)


async def api_admin_unblock_withdrawals(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)
    telegram_id, err = _require_admin_telegram_id(request)
    if err: return err
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET withdrawal_blocked = 0 WHERE telegram_id = ?", (telegram_id,))
        await db.commit()
    return web.json_response({"success": True}, headers=_CORS)


# ── API — Admin: credit user balance ──────────────────────────────────────────

async def api_admin_credit_user(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)
    telegram_id, err = _require_admin_telegram_id(request)
    if err: return err

    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    try:
        amount = float(data.get("amount", 0))
    except (TypeError, ValueError):
        return web.json_response({"error": "Montant invalide"}, status=400, headers=_CORS)

    if not (0 < amount <= 100_000):
        return web.json_response({"error": "Le montant doit être entre 0 et 100 000"}, status=400, headers=_CORS)

    note = str(data.get("note", "")).strip()[:200] or "Crédit administrateur"

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT telegram_id, first_name, username FROM users WHERE telegram_id = ?",
            (telegram_id,)
        ) as cur:
            row = await cur.fetchone()
        if not row:
            return web.json_response({"error": "Utilisateur introuvable"}, status=404, headers=_CORS)

        first_name = row[1] or "Utilisateur"
        username   = row[2]

        # Credit balance + total earnings
        await db.execute(
            """UPDATE users
               SET app_balance        = COALESCE(app_balance, 0)        + ?,
                   app_total_earnings = COALESCE(app_total_earnings, 0) + ?
               WHERE telegram_id = ?""",
            (amount, amount, telegram_id),
        )

        # Audit trail in transactions table
        tx_id = str(uuid.uuid4())
        await db.execute(
            """INSERT INTO transactions
                   (id, telegram_id, type, amount, currency, network, address, status, admin_note)
               VALUES (?, ?, 'admin_credit', ?, 'GRAM', 'admin', 'admin', 'completed', ?)""",
            (tx_id, telegram_id, amount, note),
        )
        await db.commit()

    # Telegram notification (non-blocking)
    try:
        username_part = f" (@{username})" if username else ""
        note_line     = f"\n📝 <i>{note}</i>" if note != "Crédit administrateur" else ""
        await bot.send_message(
            telegram_id,
            f"💎 <b>Crédit reçu !</b>\n\n"
            f"Bonjour <b>{first_name}</b>{username_part} 👋\n\n"
            f"L'équipe TonCipher vous a crédité :\n"
            f"<b>+{amount:.4f} GRAM</b>{note_line}\n\n"
            f"Votre solde a été mis à jour instantanément.\n"
            f"Merci de votre confiance en TonCipher ! 🙏",
            parse_mode="HTML",
        )
    except Exception:
        pass  # Notification failure must not block the response

    return web.json_response({"ok": True, "amount": amount, "telegram_id": telegram_id}, headers=_CORS)


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


# ── API — Platform config (promo events, streak milestones…) ───────────────────
# The mini app is client-side; without this, config changed in the admin panel
# would only exist in the admin's own browser. Users fetch it on app start.

# Keys returned by the public /api/config endpoint (safe for all users to read)
_PUBLIC_CONFIG_KEYS = {
    "promoEvent", "streakMilestones", "withdrawalChannel",
    "welcomeBonusEnabled", "welcomeBonusAmount",
    "maintenanceMode", "maintenanceMessage", "registrationEnabled",
    "referralBonusSignup", "referralBonusActivity", "referralBonusDeposit",
    "referralBonusDepositPercent", "referralLevels", "referralCodeLength",
    "streakBonusPerDay", "bonusTaskMultiplier",
    "depositBonusPercent", "firstDepositBonus",
    "botUsername", "appShortName",
    "mainChannel", "mainGroup", "supportBot", "announcementChannel",
}

# Keys that admin can write — superset of public keys
_ADMIN_CONFIG_KEYS = _PUBLIC_CONFIG_KEYS | {
    "autoWithdrawalEnabled", "autoWithdrawalMaxAmount", "withdrawalReviewThreshold",
    "minWithdrawalInterval", "requireVerificationAbove",
    "globalDailyWithdrawalLimit", "globalDailyDepositLimit", "maxPendingWithdrawals",
    "taskVerificationTimeout", "taskCooldownGlobal", "maxDailyTasks",
    "minDepositForBonus", "taskCreationFeeRate", "taskPricePerExecution",
    "taskMinExecutions", "taskMaxExecutions",
    "adminNotifyDeposit", "adminNotifyWithdrawal", "adminNotifyFraud",
    "adminNotifyNewUser", "adminChatId",
    "antifraudEnabled", "vpnDetectionEnabled", "deviceFingerprintEnabled",
    "maxAccountsPerDevice", "maxAccountsPerIP",
    "suspiciousActivityThreshold", "autobanThreshold",
    "mainWallet", "hotWalletThreshold", "coldWalletThreshold",
    "xpPerTask", "xpPerReferral", "xpPerDeposit", "xpMultiplier", "maxLevel",
    "streakMultiplier", "maxStreakBonus", "streakResetHours",
}


async def _configured_withdrawal_channel() -> str:
    """Withdrawal channel from admin config (DB), falling back to the env var.
    Lets the admin fix a missing/wrong WITHDRAWAL_CHANNEL without redeploying."""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute(
                "SELECT value FROM platform_config WHERE key = 'withdrawalChannel'"
            ) as cur:
                row = await cur.fetchone()
        if row:
            val = json.loads(row[0])
            if isinstance(val, str) and val.strip():
                return val.strip()
    except Exception:
        pass
    return WITHDRAWAL_CHANNEL


async def api_config_get(request: web.Request) -> web.Response:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT key, value FROM platform_config") as cur:
            rows = await cur.fetchall()
    config: dict = {}
    for key, value in rows:
        if key not in _PUBLIC_CONFIG_KEYS:
            continue
        try:
            config[key] = json.loads(value)
        except (ValueError, TypeError):
            continue
    return web.json_response(config, headers=_CORS)


async def api_admin_config_set(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)
    key = data.get("key", "")
    if key not in _ADMIN_CONFIG_KEYS:
        return web.json_response({"error": f"Unknown config key: {key}"}, status=400, headers=_CORS)
    value = json.dumps(data.get("value"))
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO platform_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at""",
            (key, value),
        )
        await db.commit()
    await _sse_broadcast("config_updated", {"key": key})
    return web.json_response({"success": True}, headers=_CORS)


async def api_admin_config_bulk(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)
    configs = data.get("configs", {})
    if not isinstance(configs, dict):
        return web.json_response({"error": "configs must be an object"}, status=400, headers=_CORS)
    saved = 0
    async with aiosqlite.connect(DB_PATH) as db:
        for key, value in configs.items():
            if key not in _ADMIN_CONFIG_KEYS:
                continue
            await db.execute(
                """INSERT INTO platform_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
                   ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at""",
                (key, json.dumps(value)),
            )
            saved += 1
        await db.commit()
    await _sse_broadcast("config_updated", {"keys": list(configs.keys())})
    return web.json_response({"success": True, "saved": saved}, headers=_CORS)


async def api_admin_approve_withdrawal(request: web.Request) -> web.Response:
    if not _check_admin_auth(request):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)

    tx_id = request.match_info.get("id")
    try:
        data = await request.json()
    except Exception:
        data = {}
    tx_hash = str(data.get("txHash", "")).strip()
    tx_date_raw = str(data.get("txDate", "")).strip()  # "YYYY-MM-DDTHH:MM" from datetime-local input

    # Parse admin-supplied date or fall back to now
    from datetime import datetime as _dt_ap
    if tx_date_raw:
        try:
            tx_dt = _dt_ap.strptime(tx_date_raw[:16], "%Y-%m-%dT%H:%M")
            processed_at_val = tx_dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            processed_at_val = _dt_ap.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    else:
        processed_at_val = _dt_ap.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("""
            UPDATE transactions
            SET status = 'completed', tx_hash = ?, processed_at = ?
            WHERE id = ? AND type = 'withdrawal' AND status = 'pending'
        """, (tx_hash, processed_at_val, tx_id))
        if cur.rowcount == 0:
            # Already approved/rejected (or unknown id) — don't notify twice
            return web.json_response({"error": "Already processed or not found"}, status=409, headers=_CORS)
        # Fetch transaction + user details for the notification
        async with db.execute("""
            SELECT t.telegram_id, t.amount, t.currency, t.address,
                   u.first_name, t.processed_at
            FROM transactions t
            LEFT JOIN users u ON t.telegram_id = u.telegram_id
            WHERE t.id = ?
        """, (tx_id,)) as cur2:
            tx_row = await cur2.fetchone()
        await db.commit()

    tx_link = f"https://tonscan.org/tx/{tx_hash}" if tx_hash else ""
    if bot and tx_row:
        first_name = tx_row[4] or "cher utilisateur"
        username_part = f" (@{tx_row[5]})" if tx_row[5] else ""
        addr_short = tx_row[3][:8] + "…" + tx_row[3][-6:] if tx_row[3] and len(tx_row[3]) > 14 else (tx_row[3] or "")
        tx_hash_short = (tx_hash[:16] + "…") if len(tx_hash) > 16 else tx_hash
        try:
            await bot.send_message(
                tx_row[0],
                f"✅ <b>Retrait approuvé !</b>\n\n"
                f"Félicitations <b>{first_name}</b>{username_part} 🎉\n\n"
                f"Votre retrait a été traité avec succès et envoyé à votre adresse.\n\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"💎 Montant envoyé : <b>{tx_row[1]:.4f} {tx_row[2]}</b>\n"
                f"📍 Adresse : <code>{addr_short}</code>\n"
                + (f"🔗 TX Hash : <code>{tx_hash_short}</code>\n"
                   f'<a href="{tx_link}">👁 Voir sur TonScan</a>\n' if tx_link else "")
                + f"━━━━━━━━━━━━━━━━━━━━\n\n"
                f"Merci de votre confiance en TonCipher ! 🙏\n"
                f"Continuez à accomplir des tâches et profitez de nos jeux pour gagner encore plus de TON ! 🚀",
                parse_mode="HTML",
                disable_web_page_preview=False,
            )
        except Exception:
            pass

    if tx_row:
        first_name_pub = tx_row[4] or "Utilisateur"
        # processed_at from DB (SQLite returns "YYYY-MM-DD HH:MM:SS")
        try:
            from datetime import datetime as _dt2
            processed_dt = _dt2.strptime(tx_row[5], "%Y-%m-%d %H:%M:%S")
            approved_str = processed_dt.strftime("%d/%m/%Y à %H:%M:%S UTC")
        except Exception:
            from datetime import datetime as _dt2
            approved_str = _dt2.utcnow().strftime("%d/%m/%Y à %H:%M:%S UTC")
        await _notify_channel(
            await _configured_withdrawal_channel(),
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"✅ <b>RETRAIT APPROUVÉ</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"👤 <b>Bénéficiaire :</b> {first_name_pub}\n"
            f"💰 <b>Montant :</b> {tx_row[1]:.4f} {tx_row[2]}\n"
            f"🕐 <b>Approuvé le :</b> {approved_str}\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            + (f'🔗 <a href="{tx_link}">Voir la transaction sur TonScan</a>\n' if tx_link else "📭 Aucun TX Hash fourni\n")
            + f"━━━━━━━━━━━━━━━━━━━━━",
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
    note = (data.get("note") or "").strip()

    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("""
            UPDATE transactions
            SET status = 'rejected', admin_note = ?, processed_at = datetime('now')
            WHERE id = ? AND type = 'withdrawal' AND status = 'pending'
        """, (note, tx_id))
        if cur.rowcount == 0:
            # Already approved/rejected (or unknown id) — don't notify twice
            return web.json_response({"error": "Already processed or not found"}, status=409, headers=_CORS)
        async with db.execute("""
            SELECT t.telegram_id, t.amount, t.currency,
                   u.first_name, u.username
            FROM transactions t
            LEFT JOIN users u ON t.telegram_id = u.telegram_id
            WHERE t.id = ?
        """, (tx_id,)) as cur2:
            tx_row = await cur2.fetchone()
        if tx_row:
            # Keep the server-side balance backup consistent: the amount was
            # debited locally at request time and pushed here, so credit it back.
            await db.execute(
                "UPDATE users SET app_balance = app_balance + ? WHERE telegram_id = ? AND app_balance IS NOT NULL",
                (tx_row[1], tx_row[0]),
            )
        await db.commit()

    if bot and tx_row:
        first_name = tx_row[3] or "cher utilisateur"
        username_part = f" (@{tx_row[4]})" if tx_row[4] else ""
        try:
            await bot.send_message(
                tx_row[0],
                f"❌ <b>Retrait non traité</b>\n\n"
                f"Bonjour <b>{first_name}</b>{username_part},\n\n"
                f"Votre demande de retrait n'a pas pu être traitée pour le moment.\n\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"💎 Montant : <b>{tx_row[1]:.4f} {tx_row[2]}</b>\n"
                + (f"📝 Motif : {note}\n" if note else "📝 Aucun motif précisé.\n")
                + f"━━━━━━━━━━━━━━━━━━━━\n\n"
                f"✅ <b>Bonne nouvelle :</b> votre solde de <b>{tx_row[1]:.4f} {tx_row[2]}</b> "
                f"a été automatiquement recrédité sur votre compte.\n\n"
                f"Si vous pensez qu'il s'agit d'une erreur, contactez notre support : @TonCipher_bot 💬",
                parse_mode="HTML",
            )
        except Exception:
            pass

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
            if row and row[0] > 0:
                await db.execute(
                    "UPDATE users SET banned = 1, flagged = 1 WHERE telegram_id = ?", (row[0],)
                )
        await db.commit()

    return web.json_response({"success": True}, headers=_CORS)


# ── API — User-created tasks ───────────────────────────────────────────────────

async def api_user_task_create(request: web.Request) -> web.Response:
    ip = _client_ip(request)
    if _is_rate_limited(ip):
        return web.json_response({"error": "Rate limit exceeded"}, status=429, headers=_CORS)

    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    creator_id      = _parse_telegram_id(data.get("telegramId"))
    task_type       = str(data.get("type", "")).strip()
    title           = (data.get("title")       or "").strip()[:200]
    description     = (data.get("description") or "").strip()[:500]
    target_url      = (data.get("targetUrl") or "").strip()[:512]
    reward          = _parse_amount(data.get("reward"))
    total_budget    = _parse_amount(data.get("totalBudget"))
    try:
        max_completions = int(data.get("maxCompletions", 0))
    except (TypeError, ValueError):
        max_completions = 0

    if not creator_id or not task_type or not title or not target_url:
        return web.json_response({"error": "Missing required fields"}, status=400, headers=_CORS)
    if task_type not in ("join_channel", "join_group", "start_bot", "watch_video", "social"):
        return web.json_response({"error": "Invalid task type"}, status=400, headers=_CORS)
    if reward is None or total_budget is None:
        return web.json_response({"error": "Invalid reward or budget"}, status=400, headers=_CORS)
    if max_completions < 1 or max_completions > 100_000:
        return web.json_response({"error": "Invalid max_completions (1–100 000)"}, status=400, headers=_CORS)
    # Guard against budget/reward mismatch (allow ±1 unit rounding tolerance)
    if abs(reward * max_completions - total_budget) > reward + 0.001:
        return web.json_response({"error": "Budget mismatch with reward × completions"}, status=400, headers=_CORS)

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
    ip = _client_ip(request)
    if _is_rate_limited(ip):
        return web.json_response({"error": "Rate limit exceeded"}, status=429, headers=_CORS)

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
            "SELECT status, reward, creator_id FROM user_tasks WHERE id = ?",
            (task_id,)
        ) as cur:
            task = await cur.fetchone()

        if not task:
            return web.json_response({"error": "Task not found"}, status=404, headers=_CORS)
        if task[0] != 'active':
            return web.json_response({"error": "Task not active"}, status=400, headers=_CORS)
        if task[2] == telegram_id:
            await _log_fraud_alert(
                db, telegram_id, str(telegram_id),
                "self_task_complete",
                f"Creator attempted to complete own task {task_id}",
                _risk_score(["self_referral_ip"]),
            )
            await db.commit()
            return web.json_response({"error": "Cannot complete your own task"}, status=400, headers=_CORS)

        reward = float(task[1])

        # Atomic dedup: only one completion record per (task_id, telegram_id)
        ins = await db.execute(
            "INSERT OR IGNORE INTO user_task_completions (task_id, telegram_id) VALUES (?, ?)",
            (task_id, telegram_id)
        )
        if ins.rowcount == 0:
            return web.json_response({"error": "Already completed"}, status=400, headers=_CORS)

        # Atomic budget guard: increment only while completions < max_completions.
        # If another concurrent request already filled the last slot, rowcount = 0.
        upd = await db.execute(
            """UPDATE user_tasks
               SET completions = completions + 1,
                   spent       = spent + ?,
                   status      = CASE WHEN completions + 1 >= max_completions THEN 'depleted' ELSE 'active' END
               WHERE id = ? AND status = 'active' AND completions < max_completions""",
            (reward, task_id)
        )
        if upd.rowcount == 0:
            # Last slot was raced away — roll back the completion record
            await db.execute(
                "DELETE FROM user_task_completions WHERE task_id = ? AND telegram_id = ?",
                (task_id, telegram_id)
            )
            await db.commit()
            return web.json_response({"error": "Task depleted"}, status=400, headers=_CORS)

        await db.commit()

    # Verify membership server-side (after recording the completion so we
    # don't lose the atomicity, but before returning reward to the client).
    # For join_channel / join_group: check via Bot API.
    # For start_bot: checked via bot_started flag in users table.
    task_status_row = await _verify_task_completion(task_id, telegram_id)
    if task_status_row is False:
        # Membership check definitively failed: roll back completion record
        async with aiosqlite.connect(DB_PATH) as db2:
            await db2.execute(
                "DELETE FROM user_task_completions WHERE task_id = ? AND telegram_id = ?",
                (task_id, telegram_id)
            )
            await db2.execute(
                "UPDATE user_tasks SET completions = completions - 1, spent = spent - ?,"
                " status = CASE WHEN status = 'depleted' AND completions - 1 < max_completions THEN 'active' ELSE status END"
                " WHERE id = ?",
                (reward, task_id)
            )
            await db2.commit()
        return web.json_response({"error": "Membership not verified. Please join and try again."}, status=403, headers=_CORS)

    # Broadcast updated completion count to SSE clients
    async with aiosqlite.connect(DB_PATH) as db3:
        async with db3.execute(
            "SELECT completions, max_completions, status FROM user_tasks WHERE id = ?", (task_id,)
        ) as cur:
            upd_row = await cur.fetchone()
    if upd_row:
        evt = "task_removed" if upd_row[2] == "depleted" else "task_updated"
        await _sse_broadcast(evt, {"id": task_id, "totalCompletions": upd_row[0], "maxCompletions": upd_row[1]})

    return web.json_response({"success": True, "reward": reward}, headers=_CORS)


async def api_check_bot_verify(request: web.Request) -> web.Response:
    """Return whether user confirmed via bot deep-link for a start_bot task."""
    try:
        telegram_id = int(request.rel_url.query.get("telegramId", 0))
        task_id     = request.rel_url.query.get("taskId", "")
    except (ValueError, TypeError):
        return web.json_response({"error": "Bad params"}, status=400, headers=_CORS)
    if not telegram_id or not task_id:
        return web.json_response({"verified": False}, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT id FROM bot_verifications WHERE telegram_id=? AND task_id=?",
            (telegram_id, task_id),
        ) as cur:
            row = await cur.fetchone()

    return web.json_response({"verified": row is not None}, headers=_CORS)


async def api_submit_proof_miniapp(request: web.Request) -> web.Response:
    """Accept a proof screenshot uploaded directly from the mini-app."""
    from aiogram.types import BufferedInputFile
    try:
        reader = await request.multipart()
        telegram_id: int | None = None
        task_id: str | None = None
        file_bytes: bytes | None = None
        async for field in reader:
            if field.name == "telegramId":
                telegram_id = int(await field.read())
            elif field.name == "taskId":
                task_id = (await field.read()).decode("utf-8")
            elif field.name == "file":
                file_bytes = await field.read()
    except Exception:
        return web.json_response({"error": "Invalid request"}, status=400, headers=_CORS)

    if not telegram_id or not task_id or not file_bytes:
        return web.json_response({"error": "Missing fields"}, status=400, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT creator_id, title FROM user_tasks WHERE id = ?", (task_id,)
        ) as cur:
            trow = await cur.fetchone()

    creator_id  = trow[0] if trow else None
    task_title  = trow[1] if trow else f"Tâche #{task_id}"
    notify_id   = creator_id if creator_id else ADMIN_TELEGRAM_ID
    if not notify_id:
        return web.json_response({"error": "No admin configured"}, status=500, headers=_CORS)

    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ Approuver", callback_data=f"proof_ok_PENDING_{telegram_id}_{task_id}"),
        InlineKeyboardButton(text="❌ Refuser",   callback_data=f"proof_ko_PENDING_{telegram_id}_{task_id}"),
    ]])
    try:
        photo_input = BufferedInputFile(file_bytes, filename="proof.jpg")
        sent = await bot.send_photo(
            notify_id,
            photo=photo_input,
            caption=(
                f"📸 <b>Preuve à valider</b>\n\n"
                f"Tâche : <b>{task_title}</b>\n"
                f"Utilisateur : <code>{telegram_id}</code>"
            ),
            parse_mode="HTML",
            reply_markup=kb,
        )
        file_id = sent.photo[-1].file_id
    except Exception as exc:
        return web.json_response({"error": str(exc)}, status=500, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "INSERT INTO social_proofs (telegram_id, task_id, file_id, creator_id) VALUES (?,?,?,?)",
            (telegram_id, task_id, file_id, creator_id),
        ) as cur_ins:
            proof_id = cur_ins.lastrowid
        await db.commit()

    # Update the Telegram message buttons with the real proof_id
    if proof_id is not None:
        kb2 = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text="✅ Approuver", callback_data=f"proof_ok_{proof_id}_{telegram_id}_{task_id}"),
            InlineKeyboardButton(text="❌ Refuser",   callback_data=f"proof_ko_{proof_id}_{telegram_id}_{task_id}"),
        ]])
        try:
            await bot.edit_message_reply_markup(notify_id, sent.message_id, reply_markup=kb2)
        except Exception:
            pass

    return web.json_response({"ok": True, "proofId": proof_id}, headers=_CORS)


async def api_check_social_proof(request: web.Request) -> web.Response:
    """Return approval status for a submitted social proof screenshot."""
    try:
        telegram_id = int(request.rel_url.query.get("telegramId", 0))
        task_id     = request.rel_url.query.get("taskId", "")
    except (ValueError, TypeError):
        return web.json_response({"error": "Bad params"}, status=400, headers=_CORS)
    if not telegram_id or not task_id:
        return web.json_response({"status": "none"}, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT status FROM social_proofs WHERE telegram_id=? AND task_id=? ORDER BY created_at DESC LIMIT 1",
            (telegram_id, task_id),
        ) as cur:
            row = await cur.fetchone()

    return web.json_response({"status": row[0] if row else "none"}, headers=_CORS)


async def _verify_task_completion(task_id: str, telegram_id: int) -> bool | None:
    """Return True if verified, False if definitely NOT a member, None if unverifiable."""
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT type, target_url FROM user_tasks WHERE id = ?", (task_id,)
        ) as cur:
            row = await cur.fetchone()
    if not row:
        return None

    task_type, target_url = row[0], row[1]

    if task_type == "start_bot":
        # Prefer deep-link bot confirmation (new flow)
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute(
                "SELECT id FROM bot_verifications WHERE telegram_id=? AND task_id=?",
                (telegram_id, task_id),
            ) as cur:
                bv = await cur.fetchone()
        if bv:
            return True
        # Fallback: legacy bot_started flag (our own bot tasks)
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute(
                "SELECT bot_started FROM users WHERE telegram_id = ?", (telegram_id,)
            ) as cur:
                urow = await cur.fetchone()
        return None if urow is None else (bool(urow[0]) or None)

    if task_type == "social":
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute(
                "SELECT status FROM social_proofs WHERE telegram_id=? AND task_id=? ORDER BY created_at DESC LIMIT 1",
                (telegram_id, task_id),
            ) as cur:
                sp = await cur.fetchone()
        if sp is None:
            return None  # No proof yet — benefit of doubt (timer-based)
        if sp[0] == "approved":
            return True
        if sp[0] == "rejected":
            return False
        return None  # pending — don't block, let frontend poll

    if task_type in ("join_channel", "join_group"):
        chat_ref = _extract_chat_ref(target_url)
        if chat_ref is None:
            return None
        result = await _is_chat_member(chat_ref, telegram_id)
        return result

    return None


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

    await _sse_broadcast("task_removed" if new_status == "paused" else "task_approved", {"id": task_id})
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

    await _sse_broadcast("task_removed", {"id": task_id})
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
    try:
        extra_executions = int(data.get("extraExecutions", 0))
    except (TypeError, ValueError):
        extra_executions = 0
    try:
        extra_budget = float(data.get("extraBudget", 0))
    except (TypeError, ValueError):
        extra_budget = 0.0

    if extra_executions < 1:
        return web.json_response({"error": "Invalid extra executions"}, status=400, headers=_CORS)
    if extra_budget <= 0:
        return web.json_response({"error": "Invalid extra budget"}, status=400, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT creator_id, status FROM user_tasks WHERE id = ?", (task_id,)
        ) as cur:
            task = await cur.fetchone()

        if not task:
            return web.json_response({"error": "Task not found"}, status=404, headers=_CORS)
        if task[0] != telegram_id:
            return web.json_response({"error": "Unauthorized"}, status=403, headers=_CORS)
        if task[1] not in ('active', 'depleted'):
            return web.json_response({"error": "Task cannot be funded in its current state"}, status=400, headers=_CORS)

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

        # Fetch full task to broadcast to SSE clients
        async with db.execute(
            "SELECT id, type, title, description, target_url, reward, completions, max_completions "
            "FROM user_tasks WHERE id = ?", (task_id,)
        ) as cur:
            trow = await cur.fetchone()

    if trow:
        await _sse_broadcast("task_approved", {
            "id": trow[0], "type": trow[1], "title": trow[2],
            "description": trow[3], "targetUrl": trow[4],
            "reward": float(trow[5]), "totalCompletions": trow[6],
            "maxCompletions": trow[7],
        })

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
    note = (data.get("note") or "").strip()

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


async def api_pending_proofs(request: web.Request) -> web.Response:
    """Pending social proofs for tasks created by a given user."""
    try:
        telegram_id = int(request.rel_url.query.get("telegramId", 0))
    except (ValueError, TypeError):
        return web.json_response([], headers=_CORS)
    if not telegram_id:
        return web.json_response([], headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            """
            SELECT sp.id, sp.task_id, sp.telegram_id, sp.file_id, sp.status, sp.created_at,
                   ut.title, u.first_name, u.username
            FROM social_proofs sp
            JOIN user_tasks ut ON sp.task_id = ut.id
            LEFT JOIN users u ON sp.telegram_id = u.telegram_id
            WHERE ut.creator_id = ? AND sp.status = 'pending'
            ORDER BY sp.created_at DESC
            """,
            (telegram_id,),
        ) as cur:
            rows = await cur.fetchall()

    return web.json_response(
        [
            {
                "id":              r[0],
                "taskId":          r[1],
                "workerId":        r[2],
                "fileId":          r[3],
                "status":          r[4],
                "createdAt":       r[5],
                "taskTitle":       r[6],
                "workerName":      r[7] or str(r[2]),
                "workerUsername":  r[8],
            }
            for r in rows
        ],
        headers=_CORS,
    )


async def api_review_proof(request: web.Request) -> web.Response:
    """Creator approves or rejects a pending social proof."""
    proof_id = request.match_info.get("id", "")
    try:
        data        = await request.json()
        telegram_id = int(data.get("telegramId", 0))
        action      = data.get("action", "")
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    if action not in ("approve", "reject"):
        return web.json_response({"error": "Invalid action"}, status=400, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            """
            SELECT sp.telegram_id, sp.task_id, ut.creator_id, ut.title
            FROM social_proofs sp
            JOIN user_tasks ut ON sp.task_id = ut.id
            WHERE sp.id = ?
            """,
            (proof_id,),
        ) as cur:
            row = await cur.fetchone()

        if not row:
            return web.json_response({"error": "Not found"}, status=404, headers=_CORS)

        worker_tg, task_id, creator_id, task_title = row

        if creator_id != telegram_id and telegram_id != ADMIN_TELEGRAM_ID:
            return web.json_response({"error": "Unauthorized"}, status=403, headers=_CORS)

        new_status = "approved" if action == "approve" else "rejected"
        await db.execute(
            "UPDATE social_proofs SET status=?, reviewed_at=datetime('now') WHERE id=?",
            (new_status, proof_id),
        )
        await db.commit()

    worker_msg = (
        "✅ <b>Preuve validée !</b>\n\nRevenez dans l'app — votre récompense sera créditée automatiquement."
        if action == "approve"
        else "❌ Votre preuve a été refusée. Si vous pensez que c'est injuste, vous pouvez contester depuis l'app."
    )
    try:
        await bot.send_message(worker_tg, worker_msg, parse_mode="HTML")
    except Exception:
        pass

    return web.json_response({"success": True}, headers=_CORS)


async def api_proof_image(request: web.Request) -> web.Response:
    """Redirect to Telegram CDN URL for a proof screenshot."""
    proof_id    = request.match_info.get("id", "")
    try:
        telegram_id = int(request.rel_url.query.get("telegramId", 0))
    except (ValueError, TypeError):
        return web.Response(status=400)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            """
            SELECT sp.file_id, ut.creator_id
            FROM social_proofs sp
            JOIN user_tasks ut ON sp.task_id = ut.id
            WHERE sp.id = ?
            """,
            (proof_id,),
        ) as cur:
            row = await cur.fetchone()

    if not row:
        return web.Response(status=404, headers=_CORS)

    file_id, creator_id = row
    if telegram_id != creator_id and telegram_id != ADMIN_TELEGRAM_ID:
        return web.Response(status=403, headers=_CORS)

    try:
        tg_file = await bot.get_file(file_id)
        raise web.HTTPFound(
            f"https://api.telegram.org/file/bot{BOT_TOKEN}/{tg_file.file_path}"
        )
    except web.HTTPFound:
        raise
    except Exception:
        return web.Response(status=500, headers=_CORS)


async def api_report_proof_abuse(request: web.Request) -> web.Response:
    """Worker reports that a task creator is abusively rejecting proofs."""
    try:
        data        = await request.json()
        telegram_id = int(data.get("telegramId", 0))
        task_id     = data.get("taskId", "")
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    if not telegram_id or not task_id:
        return web.json_response({"error": "Missing fields"}, status=400, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT creator_id, title FROM user_tasks WHERE id=?", (task_id,)
        ) as cur:
            task_row = await cur.fetchone()

        if not task_row:
            return web.json_response({"error": "Task not found"}, status=404, headers=_CORS)

        creator_id, task_title = task_row

        async with db.execute(
            """
            SELECT COUNT(*) FROM social_proofs sp
            JOIN user_tasks ut ON sp.task_id = ut.id
            WHERE ut.creator_id = ? AND sp.status = 'rejected'
              AND sp.reviewed_at > datetime('now', '-7 days')
            """,
            (creator_id,),
        ) as cur:
            rejection_count = (await cur.fetchone())[0]

        severity   = "high" if rejection_count >= 5 else "medium"
        risk_score = min(100, rejection_count * 15)
        details    = (
            f"Signalement d'abus par worker {telegram_id} · tâche '{task_title}' ({task_id}) · "
            f"creator {creator_id} · {rejection_count} refus en 7 jours"
        )
        await db.execute(
            """
            INSERT INTO fraud_alerts (telegram_id, username, alert_type, details, severity, risk_score)
            VALUES (?, '', 'proof_rejection_abuse', ?, ?, ?)
            """,
            (creator_id, details, severity, risk_score),
        )
        await db.commit()

    if ADMIN_TELEGRAM_ID:
        try:
            await bot.send_message(
                ADMIN_TELEGRAM_ID,
                f"⚠️ <b>Signalement d'abus — preuves</b>\n\n"
                f"Creator ID: <code>{creator_id}</code>\n"
                f"Tâche: {task_title}\n"
                f"Refus en 7 jours: {rejection_count}\n"
                f"Signalé par: <code>{telegram_id}</code>",
                parse_mode="HTML",
            )
        except Exception:
            pass

    return web.json_response({"success": True}, headers=_CORS)


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


# ── USDT Jetton auto-detection ────────────────────────────────────────────────

async def _fetch_ton_price_usd() -> float | None:
    """Fetch TON/USD price from Binance, fall back to CoinGecko."""
    now = time.time()
    if _ton_price_cache["price"] and now - _ton_price_cache["ts"] < 300:
        return _ton_price_cache["price"]
    try:
        async with aiohttp.ClientSession() as s:
            async with s.get(
                "https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT",
                timeout=aiohttp.ClientTimeout(total=8),
            ) as r:
                d = await r.json()
                p = float(d.get("price", 0))
                if p > 0:
                    _ton_price_cache.update({"price": p, "ts": now})
                    return p
    except Exception:
        pass
    try:
        async with aiohttp.ClientSession() as s:
            async with s.get(
                "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd",
                timeout=aiohttp.ClientTimeout(total=10),
            ) as r:
                d = await r.json()
                p = float((d.get("the-open-network") or {}).get("usd", 0))
                if p > 0:
                    _ton_price_cache.update({"price": p, "ts": now})
                    return p
    except Exception:
        pass
    return _ton_price_cache.get("price")


async def api_ton_price(request: web.Request) -> web.Response:
    """Return current TON/USD price for the frontend."""
    price = await _fetch_ton_price_usd()
    if price:
        return web.json_response({"price": price}, headers=_CORS)
    return web.json_response({"error": "unavailable"}, status=503, headers=_CORS)


async def api_usdt_deposit_register(request: web.Request) -> web.Response:
    """Frontend calls this when a user declares they sent USDT — store the hint
    so the on-chain monitor knows what to look for."""
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    telegram_id   = _parse_telegram_id(data.get("telegramId"))
    amount        = _parse_amount(data.get("amount"))
    deposit_code  = str(data.get("depositCode", "")).strip()
    sender_address = str(data.get("senderAddress", "")).strip()

    if not telegram_id or amount is None:
        return web.json_response({"error": "Invalid data"}, status=400, headers=_CORS)

    # Light auth: if initData is provided, verify it matches
    init_data = str(data.get("initData", "")).strip()
    if BOT_TOKEN and init_data:
        if not _validate_init_data(init_data, BOT_TOKEN):
            return web.json_response({"error": "Auth failed"}, status=401, headers=_CORS)
        if _init_data_user_id(init_data) != telegram_id:
            return web.json_response({"error": "Identity mismatch"}, status=403, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS usdt_pending (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id    INTEGER NOT NULL,
                amount_usdt    REAL    NOT NULL,
                sender_address TEXT    NOT NULL DEFAULT '',
                deposit_code   TEXT    NOT NULL DEFAULT '',
                created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
                status         TEXT    NOT NULL DEFAULT 'pending'
            )
        """)
        await db.execute(
            "INSERT INTO usdt_pending (telegram_id, amount_usdt, sender_address, deposit_code) VALUES (?, ?, ?, ?)",
            (telegram_id, amount, sender_address, deposit_code or str(telegram_id))
        )
        await db.commit()

    return web.json_response({"success": True, "message": "Deposit registered. We'll credit you once detected on-chain."}, headers=_CORS)


async def _monitor_usdt_jetton() -> None:
    """Background task: poll TonCenter every 2 minutes for incoming USDT Jetton
    transfers to the platform wallet and auto-credit matched users."""
    # Wait a bit for the app to fully start
    await asyncio.sleep(30)

    while True:
        try:
            if not HOT_WALLET_ADDRESS:
                await asyncio.sleep(120)
                continue

            price = await _fetch_ton_price_usd()
            if not price:
                log.warning("USDT monitor: TON price unavailable, skipping cycle")
                await asyncio.sleep(120)
                continue

            params: dict = {
                "address":       HOT_WALLET_ADDRESS,
                "jetton_master": USDT_JETTON_MASTER,
                "direction":     "in",
                "limit":         "50",
            }
            if TONCENTER_API_KEY:
                params["api_key"] = TONCENTER_API_KEY

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://toncenter.com/api/v3/jetton/transfers",
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=15),
                ) as resp:
                    if resp.status != 200:
                        log.warning("USDT monitor: TonCenter returned %d", resp.status)
                        await asyncio.sleep(120)
                        continue
                    result = await resp.json()

            transfers = result.get("jetton_transfers", [])
            credited = 0

            for t in transfers:
                tx_hash = str(t.get("transaction_hash") or t.get("hash") or "").strip()
                if not tx_hash:
                    continue

                # Amount in nano USDT (6 decimals)
                try:
                    usdt_amount = int(t.get("amount", 0)) / 1_000_000
                except (TypeError, ValueError):
                    continue

                if usdt_amount < USDT_MIN_AMOUNT:
                    continue

                # Try to identify user: first by comment (= depositCode = telegramId),
                # then by sender TON address vs usdt_pending table
                comment = str(t.get("comment") or "").strip()
                telegram_id = 0
                try:
                    telegram_id = int(comment)
                except (ValueError, TypeError):
                    pass

                async with aiosqlite.connect(DB_PATH) as db:
                    # If comment didn't give us a telegram_id, check pending table by sender address
                    if not telegram_id:
                        sender = str(t.get("source_wallet") or t.get("source") or "").strip()
                        async with db.execute(
                            "SELECT telegram_id FROM usdt_pending WHERE sender_address = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
                            (sender,)
                        ) as cur:
                            row = await cur.fetchone()
                        if row:
                            telegram_id = row[0]

                    if not telegram_id:
                        continue

                    # Verify user exists
                    async with db.execute("SELECT 1 FROM users WHERE telegram_id = ?", (telegram_id,)) as cur:
                        if not await cur.fetchone():
                            continue

                    # Compute GRAM equivalent (USDT ÷ TON_price × discount)
                    gram_amount = round(usdt_amount / price * USDT_DISCOUNT, 6)

                    try:
                        tx_id = _short_id()
                        await db.execute("""
                            INSERT INTO transactions
                                (id, telegram_id, type, amount, currency, network, status, tx_hash, processed_at)
                            VALUES (?, ?, 'deposit', ?, 'USDT', 'TON', 'completed', ?, datetime('now'))
                        """, (tx_id, telegram_id, gram_amount, tx_hash))
                        # Mark any matching pending hints as done
                        await db.execute(
                            "UPDATE usdt_pending SET status = 'credited' WHERE telegram_id = ? AND status = 'pending'",
                            (telegram_id,)
                        )
                        await db.commit()
                        credited += 1
                        log.info(
                            "USDT deposit auto-credited: %.4f USDT → %.6f GRAM for telegram_id=%d (tx=%s…)",
                            usdt_amount, gram_amount, telegram_id, tx_hash[:16]
                        )
                        if bot:
                            try:
                                await bot.send_message(
                                    telegram_id,
                                    f"✅ Dépôt USDT confirmé !\n"
                                    f"{usdt_amount:.4f} USDT → *{gram_amount:.4f} GRAM* crédité sur votre compte.",
                                    parse_mode="Markdown",
                                )
                            except Exception:
                                pass
                    except aiosqlite.IntegrityError:
                        pass  # tx_hash already processed

            if credited:
                log.info("USDT monitor cycle: %d deposit(s) credited", credited)

        except Exception as e:
            log.warning("USDT monitor error: %s", e)

        await asyncio.sleep(120)  # check every 2 minutes


# ── API — Platform task: secure server-side completion ───────────────────────

async def api_platform_task_complete(request: web.Request) -> web.Response:
    """Verify and credit a built-in platform task completion.

    The server is authoritative for:
    - Task existence and reward amount (from PLATFORM_TASKS — not client-supplied)
    - Anti-dedup (one-time tasks: INSERT check; daily tasks: cooldown window)
    - Type-specific verification (channel membership, bot start, timer elapsed, referral count)
    - Balance credit (app_balance column in users table)

    The frontend calls this instead of the old client-only completeTask() action.
    """
    ip = _client_ip(request)
    if _is_rate_limited(ip):
        return web.json_response({"error": "Rate limit exceeded"}, status=429, headers=_CORS)

    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    telegram_id = _parse_telegram_id(data.get("telegramId"))
    if not telegram_id:
        return web.json_response({"error": "Missing telegramId"}, status=400, headers=_CORS)

    task_id = str(data.get("taskId", "")).strip()
    if not task_id:
        return web.json_response({"error": "Missing taskId"}, status=400, headers=_CORS)

    init_data = str(data.get("initData", ""))
    if not _verify_user_request(init_data, telegram_id):
        return web.json_response({"error": "Unauthorized"}, status=401, headers=_CORS)

    task_cfg = PLATFORM_TASKS.get(task_id)
    if not task_cfg:
        return web.json_response({"error": "Unknown platform task"}, status=404, headers=_CORS)

    verification   = task_cfg["verification"]
    max_per_user   = task_cfg.get("max_per_user", 1)
    cooldown_hours = float(task_cfg.get("cooldown_hours", 0))
    reward         = float(task_cfg["reward"])

    async with aiosqlite.connect(DB_PATH) as db:
        # Verify user exists and is active
        async with db.execute(
            "SELECT banned FROM users WHERE telegram_id = ?", (telegram_id,)
        ) as cur:
            u = await cur.fetchone()
        if not u:
            return web.json_response({"error": "User not found"}, status=404, headers=_CORS)
        if u[0]:
            return web.json_response({"error": "Account suspended"}, status=403, headers=_CORS)

        # ── Dedup / cooldown ───────────────────────────────────────────────────
        if cooldown_hours > 0:
            # Daily-style: check last completion within cooldown window
            async with db.execute(
                "SELECT (julianday('now') - julianday(completed_at)) * 24.0"
                " FROM platform_task_completions"
                " WHERE telegram_id = ? AND task_id = ?"
                " ORDER BY completed_at DESC LIMIT 1",
                (telegram_id, task_id)
            ) as cur:
                last = await cur.fetchone()
            if last and last[0] < cooldown_hours:
                remaining_min = int((cooldown_hours - last[0]) * 60)
                return web.json_response(
                    {"error": f"Cooldown active. Try again in {remaining_min} minutes."},
                    status=400, headers=_CORS
                )
        elif max_per_user == 1:
            # One-time task: any previous completion blocks retry
            async with db.execute(
                "SELECT 1 FROM platform_task_completions"
                " WHERE telegram_id = ? AND task_id = ? LIMIT 1",
                (telegram_id, task_id)
            ) as cur:
                if await cur.fetchone():
                    return web.json_response({"error": "Already completed"}, status=400, headers=_CORS)

        # ── Type-specific verification ─────────────────────────────────────────
        if verification == "channel":
            target = task_cfg.get("target")
            if target and bot:
                is_member = await _is_chat_member(target, telegram_id)
                if is_member is False:
                    return web.json_response(
                        {"error": "Not a member of the required channel. Please join and retry."},
                        status=403, headers=_CORS
                    )

        elif verification == "bot":
            async with db.execute(
                "SELECT bot_started FROM users WHERE telegram_id = ?", (telegram_id,)
            ) as cur:
                brow = await cur.fetchone()
            async with db.execute(
                "SELECT 1 FROM bot_verifications WHERE telegram_id = ? LIMIT 1", (telegram_id,)
            ) as cur:
                bv = await cur.fetchone()
            if not ((brow and brow[0]) or bv):
                return web.json_response(
                    {"error": "Please start the bot first (click Start in Telegram)."},
                    status=403, headers=_CORS
                )

        elif verification == "timer":
            min_s = int(task_cfg.get("min_seconds", 30))
            async with db.execute(
                "SELECT (julianday('now') - julianday(departed_at)) * 86400.0"
                " FROM task_departures WHERE telegram_id = ? AND task_id = ?",
                (telegram_id, task_id)
            ) as cur:
                dep = await cur.fetchone()
            if dep is None:
                return web.json_response(
                    {"error": "No departure recorded. Please start the task first."},
                    status=400, headers=_CORS
                )
            elapsed_s = dep[0]
            if elapsed_s < min_s:
                remaining = max(1, int(min_s - elapsed_s))
                return web.json_response(
                    {"error": f"Too early. Wait {remaining} more seconds."},
                    status=400, headers=_CORS
                )
            # Consume the departure record so it cannot be reused for another attempt
            await db.execute(
                "DELETE FROM task_departures WHERE telegram_id = ? AND task_id = ?",
                (telegram_id, task_id)
            )

        elif verification == "referral":
            required = int(task_cfg.get("required_referrals", 3))
            async with db.execute(
                "SELECT referral_count FROM users WHERE telegram_id = ?", (telegram_id,)
            ) as cur:
                rrow = await cur.fetchone()
            count = rrow[0] if rrow else 0
            if count < required:
                return web.json_response(
                    {"error": f"Need {required} referrals. You have {count}."},
                    status=400, headers=_CORS
                )

        elif verification == "proof":
            async with db.execute(
                "SELECT 1 FROM social_proofs"
                " WHERE telegram_id = ? AND task_id = ? AND status = 'approved' LIMIT 1",
                (telegram_id, task_id)
            ) as cur:
                proof = await cur.fetchone()
            if not proof:
                return web.json_response(
                    {"error": "Proof not yet approved by the team."},
                    status=403, headers=_CORS
                )

        # ── Record completion + credit balance + transaction log ───────────────
        await db.execute(
            "INSERT INTO platform_task_completions (telegram_id, task_id, earned)"
            " VALUES (?, ?, ?)",
            (telegram_id, task_id, reward)
        )
        await db.execute(
            "UPDATE users SET app_balance = COALESCE(app_balance, 0) + ? WHERE telegram_id = ?",
            (reward, telegram_id)
        )
        await db.execute(
            "INSERT INTO transactions"
            " (id, telegram_id, type, amount, currency, network, address, status)"
            " VALUES (?, ?, 'reward', ?, 'GRAM', 'platform', '', 'completed')",
            (str(uuid.uuid4()), telegram_id, reward)
        )
        await db.commit()

    return web.json_response({"success": True, "earned": reward}, headers=_CORS)


async def api_platform_tasks_completed(request: web.Request) -> web.Response:
    """Return list of completed platform task IDs for a user.
    Fetched on app init so server-side completions override a cleared localStorage.
    """
    try:
        telegram_id = _parse_telegram_id(request.rel_url.query.get("telegram_id", 0))
    except Exception:
        return web.json_response([], headers=_CORS)
    if not telegram_id:
        return web.json_response([], headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT DISTINCT task_id FROM platform_task_completions WHERE telegram_id = ?",
            (telegram_id,)
        ) as cur:
            task_ids = [row[0] async for row in cur]

    return web.json_response(task_ids, headers=_CORS)


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
    app.router.add_post("/api/user/balance",               api_user_balance_set)
    app.router.add_get( "/api/user/withdrawals",           api_user_withdrawal_status)
    app.router.add_get( "/api/user/transactions",          api_user_transactions)
    app.router.add_post("/api/task/depart",                  api_task_depart)
    app.router.add_get( "/api/task/verify-timer",            api_task_verify_timer)
    app.router.add_post("/api/platform-tasks/complete",      api_platform_task_complete)
    app.router.add_get( "/api/platform-tasks/completed",     api_platform_tasks_completed)
    app.router.add_get( "/api/check-membership",           api_check_membership)
    app.router.add_get( "/api/check-bot-start",            api_check_bot_start)
    app.router.add_get( "/api/check-bot-verify",           api_check_bot_verify)
    app.router.add_get( "/api/check-social-proof",         api_check_social_proof)
    app.router.add_post("/api/submit-proof",               api_submit_proof_miniapp)
    app.router.add_get( "/api/user-tasks/pending-proofs",      api_pending_proofs)
    app.router.add_post("/api/social-proof/{id}/review",        api_review_proof)
    app.router.add_get( "/api/proof-image/{id}",                api_proof_image)
    app.router.add_post("/api/report-proof-abuse",              api_report_proof_abuse)
    app.router.add_get( "/api/leaderboard",                api_leaderboard)

    # Transaction API (called by frontend)
    app.router.add_post("/api/deposit/record",             api_deposit_record)
    app.router.add_post("/api/deposit/usdt-register",      api_usdt_deposit_register)
    app.router.add_get( "/api/ton-price",                  api_ton_price)
    app.router.add_get( "/api/transactions",               api_transactions)
    app.router.add_get( "/api/config",                     api_config_get)
    app.router.add_post("/api/admin/config",               api_admin_config_set)
    app.router.add_post("/api/admin/config/bulk",          api_admin_config_bulk)
    app.router.add_post("/api/withdrawal/create",          api_withdrawal_create)

    # Admin — users
    app.router.add_get( "/api/admin/stats",                api_admin_stats)
    app.router.add_get( "/api/admin/users",                api_admin_users)
    app.router.add_post("/api/admin/users/{telegram_id}/ban",                  api_admin_ban_user)
    app.router.add_post("/api/admin/users/{telegram_id}/unban",                api_admin_unban_user)
    app.router.add_post("/api/admin/users/{telegram_id}/unflag",               api_admin_unflag_user)
    app.router.add_post("/api/admin/users/{telegram_id}/block-withdrawals",    api_admin_block_withdrawals)
    app.router.add_post("/api/admin/users/{telegram_id}/unblock-withdrawals",  api_admin_unblock_withdrawals)
    app.router.add_post("/api/admin/users/{telegram_id}/credit",               api_admin_credit_user)

    # Admin — withdrawals
    app.router.add_get( "/api/admin/withdrawals",          api_admin_withdrawals)
    app.router.add_post("/api/admin/withdrawals/{id}/approve", api_admin_approve_withdrawal)
    app.router.add_post("/api/admin/withdrawals/{id}/reject",  api_admin_reject_withdrawal)

    # Admin — fraud alerts
    app.router.add_get( "/api/admin/fraud-alerts",         api_admin_fraud_alerts)
    app.router.add_post("/api/admin/fraud-alerts/{alert_id}/resolve", api_admin_resolve_alert)

    # User tasks marketplace
    app.router.add_get( "/api/tasks/stream",                    api_tasks_stream)
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

    # CORS preflight — must be before SPA fallback
    async def handle_options(request: web.Request) -> web.Response:
        return web.Response(status=204, headers=_CORS)

    app.router.add_route("OPTIONS", "/{path:.*}", handle_options)

    # SPA fallback — must be last
    app.router.add_get("/{path:.*}",                       serve_app)

    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", PORT).start()
    log.info("Web server listening on port %s", PORT)
    # Keep the coroutine alive — without this the server stops as soon as
    # start_web() returns (fatal when the bot polling task isn't running).
    await asyncio.Event().wait()


async def main() -> None:
    log.info("Starting TonCipher bot + web server…")

    # Restore DB from GitHub backup before init (only if no local DB exists yet)
    if not os.path.exists(DB_PATH):
        log.info("No local DB found — attempting restore from GitHub backup…")
        await restore_db_from_github()

    await init_db()

    # Graceful shutdown: backup DB before exiting
    loop = asyncio.get_running_loop()
    def _on_sigterm():
        log.info("SIGTERM received — backing up DB before exit…")
        asyncio.ensure_future(backup_db_to_github())
    loop.add_signal_handler(signal.SIGTERM, _on_sigterm)

    tasks: list = [start_web(), _monitor_usdt_jetton()]
    if bot:
        tasks.append(dp.start_polling(bot, allowed_updates=["message", "callback_query"]))
    if GITHUB_TOKEN and DB_BACKUP_KEY:
        tasks.append(_periodic_backup())
        log.info("GitHub DB backup enabled (every 10 min)")

    await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())
