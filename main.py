"""
TonCipher — Telegram Mini App Bot + Web Server

Anti-fraud: Telegram initData HMAC validation, IP multi-account detection,
self-referral detection, rate limiting, fraud alert logging.
"""
import asyncio
import hashlib
import hmac as hmac_lib
import logging
import os
import time
from collections import defaultdict
from urllib.parse import parse_qsl

import aiosqlite
from aiohttp import web
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

BOT_TOKEN  = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://toncipherbot.onrender.com")
PORT       = int(os.getenv("PORT", 8080))
DB_PATH    = os.path.join(os.path.dirname(__file__), "toncipherbot.db")

REFERRAL_BONUS_TON  = float(os.getenv("REFERRAL_BONUS_TON", "1.0"))
MAX_ACCOUNTS_PER_IP = int(os.getenv("MAX_ACCOUNTS_PER_IP", "3"))
RATE_LIMIT_MAX      = int(os.getenv("RATE_LIMIT_MAX", "30"))   # requests / minute / IP
RATE_LIMIT_WINDOW   = 60  # seconds

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN) if BOT_TOKEN else None
dp  = Dispatcher()

_CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

# In-memory rate-limit buckets  {ip: [timestamps]}
_rate_buckets: dict[str, list[float]] = defaultdict(list)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _client_ip(request: web.Request) -> str:
    fwd = request.headers.get("X-Forwarded-For", "")
    return fwd.split(",")[0].strip() if fwd else (request.remote or "")


def _is_rate_limited(ip: str) -> bool:
    """Return True if IP has exceeded RATE_LIMIT_MAX calls in RATE_LIMIT_WINDOW seconds."""
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW
    bucket = _rate_buckets[ip]
    # Evict old entries
    _rate_buckets[ip] = bucket = [t for t in bucket if t > cutoff]
    if len(bucket) >= RATE_LIMIT_MAX:
        return True
    bucket.append(now)
    return False


def _validate_init_data(init_data: str, bot_token: str) -> bool:
    """
    Validate Telegram Mini App initData using HMAC-SHA256.
    Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    Returns True if the signature is valid.
    """
    if not init_data or not bot_token:
        return False
    try:
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))
        check_hash = parsed.pop("hash", "")
        if not check_hash:
            return False
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )
        secret_key = hmac_lib.new(
            b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256,
        ).digest()
        expected = hmac_lib.new(
            secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256,
        ).hexdigest()
        return hmac_lib.compare_digest(expected, check_hash)
    except Exception:
        return False


def _risk_score(reasons: list[str]) -> int:
    """Compute a 0-100 risk score from a list of detected violations."""
    weights = {
        "invalid_init_data":  60,
        "multi_account_ip":   40,
        "self_referral_ip":   70,
        "rate_limit":         20,
    }
    score = sum(weights.get(r, 10) for r in reasons)
    return min(score, 100)


def _severity(score: int) -> str:
    if score >= 70:  return "critical"
    if score >= 50:  return "high"
    if score >= 25:  return "medium"
    return "low"


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
        # Backward-compat: add columns to existing tables
        for tbl, col, defn in [
            ("users", "referral_balance", "REAL    NOT NULL DEFAULT 0"),
            ("users", "ip_address",       "TEXT"),
            ("users", "flagged",          "INTEGER NOT NULL DEFAULT 0"),
            ("users", "banned",           "INTEGER NOT NULL DEFAULT 0"),
        ]:
            try:
                await db.execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {defn}")
            except Exception:
                pass
        await db.commit()
    log.info("Database ready at %s", DB_PATH)


async def _log_fraud_alert(
    db: aiosqlite.Connection,
    telegram_id: int,
    username: str,
    alert_type: str,
    details: str,
    score: int,
) -> None:
    sev = _severity(score)
    await db.execute("""
        INSERT INTO fraud_alerts (telegram_id, username, alert_type, details, severity, risk_score)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (telegram_id, username, alert_type, details, sev, score))
    log.warning("FRAUD [%s] user=%d @%s score=%d — %s", sev.upper(), telegram_id, username, score, details)


# ── Bot Handlers ───────────────────────────────────────────────────────────────

@dp.message(CommandStart())
async def cmd_start(msg: types.Message):
    if not WEBAPP_URL:
        await msg.answer(
            "⚙️ <b>TonCipher</b> — configuration en cours.\nRevenez bientôt !",
            parse_mode="HTML",
        )
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

    # 1. Telegram initData HMAC validation
    if BOT_TOKEN and init_data:
        if not _validate_init_data(init_data, BOT_TOKEN):
            violations.append("invalid_init_data")
    # (If initData not provided, skip — allows browser testing without Telegram)

    async with aiosqlite.connect(DB_PATH) as db:
        # Check if banned
        async with db.execute(
            "SELECT banned FROM users WHERE telegram_id = ?", (telegram_id,)
        ) as cur:
            existing = await cur.fetchone()
        if existing and existing[0]:
            return web.json_response({"error": "Account banned"}, status=403, headers=_CORS)

        # Upsert user
        await db.execute("""
            INSERT INTO users (telegram_id, username, first_name, last_name, ip_address)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(telegram_id) DO UPDATE SET
                username   = excluded.username,
                first_name = excluded.first_name,
                last_name  = excluded.last_name,
                ip_address = excluded.ip_address
        """, (telegram_id, username, first_name, last_name, ip))

        # 2. Multi-account IP detection
        if ip:
            async with db.execute(
                "SELECT COUNT(*) FROM users WHERE ip_address = ? AND telegram_id != ?",
                (ip, telegram_id),
            ) as cur:
                (ip_count,) = await cur.fetchone()
            if ip_count >= MAX_ACCOUNTS_PER_IP:
                violations.append("multi_account_ip")

        # Log and flag if any violations
        if violations:
            score = _risk_score(violations)
            await _log_fraud_alert(
                db, telegram_id, username,
                alert_type=", ".join(violations),
                details=f"IP {ip} | violations: {violations} | other accounts on same IP: {ip_count if ip else 0}",
                score=score,
            )
            await db.execute(
                "UPDATE users SET flagged = 1 WHERE telegram_id = ?", (telegram_id,)
            )

        await db.commit()

        async with db.execute(
            "SELECT referral_count, referral_balance, flagged FROM users WHERE telegram_id = ?",
            (telegram_id,),
        ) as cur:
            row = await cur.fetchone()

    return web.json_response({
        "referralCount":   row[0] if row else 0,
        "referralBalance": row[1] if row else 0.0,
        "flagged":         bool(row[2]) if row else False,
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

    # Validate Telegram initData — mandatory for referral (involves money)
    if BOT_TOKEN:
        if not init_data or not _validate_init_data(init_data, BOT_TOKEN):
            async with aiosqlite.connect(DB_PATH) as db:
                score = _risk_score(["invalid_init_data"])
                await _log_fraud_alert(
                    db, referee_id, referee_username,
                    "invalid_init_data",
                    f"Referral attempt with invalid/missing initData from IP {ip}",
                    score,
                )
                await db.commit()
            return web.json_response({"success": False, "error": "Unauthorized"}, status=401, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        # Prevent double-counting
        async with db.execute(
            "SELECT referrer_id FROM referrals WHERE referee_id = ?", (referee_id,)
        ) as cur:
            if await cur.fetchone():
                return web.json_response({"success": False, "error": "Already referred"}, headers=_CORS)

        # Fetch referee's IP and status
        async with db.execute(
            "SELECT ip_address, flagged, banned FROM users WHERE telegram_id = ?", (referee_id,)
        ) as cur:
            ref_row = await cur.fetchone()

        if ref_row and ref_row[2]:  # banned
            return web.json_response({"success": False, "error": "Referee banned"}, headers=_CORS)

        # Fetch referrer's IP
        async with db.execute(
            "SELECT ip_address FROM users WHERE telegram_id = ?", (referrer_id,)
        ) as cur:
            rr_row = await cur.fetchone()

        referrer_ip = rr_row[0] if rr_row else None
        referee_ip  = ref_row[0] if ref_row else ip

        violations: list[str] = []

        # Self-referral via same IP
        if referrer_ip and referee_ip and referrer_ip == referee_ip:
            violations.append("self_referral_ip")

        # Flagged referee
        if ref_row and ref_row[1]:
            violations.append("multi_account_ip")

        if violations:
            score = _risk_score(violations)
            await _log_fraud_alert(
                db, referee_id, referee_username,
                alert_type=", ".join(violations),
                details=f"Referral from {referrer_id} to {referee_id} | referrer_ip={referrer_ip} referee_ip={referee_ip}",
                score=score,
            )
            await db.commit()
            return web.json_response({"success": False, "error": "Fraud detected"}, headers=_CORS)

        # All clear — record referral and credit bonus
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
            "SELECT referral_count, referral_balance FROM users WHERE telegram_id = ?",
            (referrer_id,),
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
            SELECT telegram_id, username, first_name, referral_count, referral_balance
            FROM users
            WHERE flagged = 0 AND banned = 0
            ORDER BY referral_count DESC
            LIMIT 50
        """) as cur:
            rows = await cur.fetchall()
    return web.json_response([
        {"telegramId": r[0], "username": r[1], "firstName": r[2],
         "referralCount": r[3], "referralBalance": r[4]}
        for r in rows
    ], headers=_CORS)


# ── API — Admin: fraud alerts ──────────────────────────────────────────────────

async def api_admin_fraud_alerts(request: web.Request) -> web.Response:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("""
            SELECT id, telegram_id, username, alert_type, details, severity, risk_score, resolved, created_at
            FROM fraud_alerts
            ORDER BY created_at DESC
            LIMIT 200
        """) as cur:
            rows = await cur.fetchall()
    alerts = [
        {
            "id":          r[0],
            "telegramId":  r[1],
            "username":    r[2],
            "type":        r[3],
            "description": r[4],
            "severity":    r[5],
            "riskScore":   r[6],
            "resolved":    bool(r[7]),
            "createdAt":   r[8],
        }
        for r in rows
    ]
    return web.json_response(alerts, headers=_CORS)


async def api_admin_resolve_alert(request: web.Request) -> web.Response:
    alert_id = request.match_info.get("alert_id")
    try:
        data = await request.json()
    except Exception:
        data = {}
    action = str(data.get("action", "resolve"))  # "resolve" | "ban"

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE fraud_alerts SET resolved = 1 WHERE id = ?", (alert_id,)
        )
        if action == "ban":
            # Get the telegram_id for this alert
            async with db.execute(
                "SELECT telegram_id FROM fraud_alerts WHERE id = ?", (alert_id,)
            ) as cur:
                row = await cur.fetchone()
            if row:
                await db.execute(
                    "UPDATE users SET banned = 1, flagged = 1 WHERE telegram_id = ?", (row[0],)
                )
        await db.commit()

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
    with open(os.path.join(DIST, "tonconnect-manifest.json"), "rb") as f:
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
    app.router.add_get( "/health",                        health)
    app.router.add_get( "/tonconnect-manifest.json",      serve_manifest)
    app.router.add_get( "/images/{filename}",             serve_image)
    # User API
    app.router.add_post("/api/user/init",                 api_user_init)
    app.router.add_post("/api/user/referral",             api_user_referral)
    app.router.add_get( "/api/leaderboard",               api_leaderboard)
    # Admin API
    app.router.add_get( "/api/admin/fraud-alerts",        api_admin_fraud_alerts)
    app.router.add_post("/api/admin/fraud-alerts/{alert_id}/resolve", api_admin_resolve_alert)
    # SPA fallback
    app.router.add_get( "/{path:.*}",                     serve_app)

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
