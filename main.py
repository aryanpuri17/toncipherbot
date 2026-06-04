"""
TonCipher — Telegram Mini App Bot + Web Server

Database: SQLite (toncipherbot.db in project directory).
Note: on Render free tier, data persists between restarts but resets on each
new deployment. Upgrade to Render Disk or Supabase for full persistence.
"""
import asyncio
import logging
import os

import aiosqlite
from aiohttp import web
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://toncipherbot.onrender.com")
PORT = int(os.getenv("PORT", 8080))
DB_PATH = os.path.join(os.path.dirname(__file__), "toncipherbot.db")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN) if BOT_TOKEN else None
dp = Dispatcher()

_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


# ── Database ───────────────────────────────────────────────────────────────────

async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                telegram_id  INTEGER PRIMARY KEY,
                username     TEXT    NOT NULL DEFAULT '',
                first_name   TEXT    NOT NULL DEFAULT '',
                last_name    TEXT    NOT NULL DEFAULT '',
                referral_count INTEGER NOT NULL DEFAULT 0,
                referred_by  INTEGER,
                created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS referrals (
                referrer_id INTEGER NOT NULL,
                referee_id  INTEGER NOT NULL PRIMARY KEY,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.commit()
    log.info("Database ready at %s", DB_PATH)


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
        parse_mode="HTML",
        reply_markup=kb,
    )


# ── API — User init ────────────────────────────────────────────────────────────

async def api_user_init(request: web.Request) -> web.Response:
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    telegram_id = data.get("telegramId")
    username    = str(data.get("username", ""))
    first_name  = str(data.get("firstName", ""))
    last_name   = str(data.get("lastName", ""))

    if not telegram_id or not isinstance(telegram_id, int):
        return web.json_response({"error": "Invalid telegramId"}, status=400, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO users (telegram_id, username, first_name, last_name)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(telegram_id) DO UPDATE SET
                username   = excluded.username,
                first_name = excluded.first_name,
                last_name  = excluded.last_name
        """, (telegram_id, username, first_name, last_name))
        await db.commit()

        async with db.execute(
            "SELECT referral_count FROM users WHERE telegram_id = ?", (telegram_id,)
        ) as cur:
            row = await cur.fetchone()

    return web.json_response(
        {"referralCount": row[0] if row else 0},
        headers=_CORS,
    )


# ── API — Process referral ─────────────────────────────────────────────────────

async def api_user_referral(request: web.Request) -> web.Response:
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400, headers=_CORS)

    try:
        referrer_id = int(data.get("referrerId", 0))
        referee_id  = int(data.get("refereeId",  0))
    except (ValueError, TypeError):
        return web.json_response({"error": "Invalid IDs"}, status=400, headers=_CORS)

    referee_username = str(data.get("refereeUsername", "quelqu'un"))

    if not referrer_id or not referee_id or referrer_id == referee_id:
        return web.json_response({"success": False, "error": "Invalid IDs"}, headers=_CORS)

    async with aiosqlite.connect(DB_PATH) as db:
        # Prevent double-counting — referee can only be referred once
        async with db.execute(
            "SELECT referrer_id FROM referrals WHERE referee_id = ?", (referee_id,)
        ) as cur:
            existing = await cur.fetchone()

        if existing:
            return web.json_response(
                {"success": False, "error": "Already referred"}, headers=_CORS
            )

        await db.execute(
            "INSERT OR IGNORE INTO referrals (referrer_id, referee_id) VALUES (?, ?)",
            (referrer_id, referee_id),
        )
        await db.execute(
            "UPDATE users SET referral_count = referral_count + 1 WHERE telegram_id = ?",
            (referrer_id,),
        )
        await db.commit()

        async with db.execute(
            "SELECT referral_count FROM users WHERE telegram_id = ?", (referrer_id,)
        ) as cur:
            row = await cur.fetchone()

    new_count = row[0] if row else 1

    # Notify the referrer via bot (best-effort — only works if they started the bot)
    if bot:
        try:
            await bot.send_message(
                referrer_id,
                f"🎉 <b>Nouveau filleul !</b>\n\n"
                f"@{referee_username} vient de rejoindre TonCipher via votre lien de parrainage.\n"
                f"💎 Filleuls total : <b>{new_count}</b>",
                parse_mode="HTML",
            )
        except Exception:
            pass

    return web.json_response({"success": True, "referrerCount": new_count}, headers=_CORS)


# ── API — Leaderboard ──────────────────────────────────────────────────────────

async def api_leaderboard(request: web.Request) -> web.Response:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("""
            SELECT telegram_id, username, first_name, referral_count
            FROM users
            ORDER BY referral_count DESC
            LIMIT 50
        """) as cur:
            rows = await cur.fetchall()

    users = [
        {
            "telegramId":    r[0],
            "username":      r[1],
            "firstName":     r[2],
            "referralCount": r[3],
        }
        for r in rows
    ]
    return web.json_response(users, headers=_CORS)


# ── Static Files ───────────────────────────────────────────────────────────────

DIST = os.path.join(os.path.dirname(__file__), "dist")


async def serve_app(request: web.Request) -> web.Response:
    index = os.path.join(DIST, "index.html")
    if os.path.exists(index):
        with open(index, "rb") as f:
            content = f.read()
        return web.Response(
            body=content,
            content_type="text/html",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    return web.Response(text="Building… please wait.", status=503)


async def health(request: web.Request) -> web.Response:
    return web.Response(text="✅ TonCipher is running!")


async def serve_manifest(request: web.Request) -> web.Response:
    path = os.path.join(DIST, "tonconnect-manifest.json")
    with open(path, "rb") as f:
        data = f.read()
    return web.Response(
        body=data,
        content_type="application/json",
        headers={"Access-Control-Allow-Origin": "*"},
    )


async def serve_image(request: web.Request) -> web.Response:
    filename = request.match_info["filename"]
    if ".." in filename or filename.startswith("/"):
        return web.Response(status=400)
    path = os.path.join(DIST, "images", filename)
    if not os.path.isfile(path):
        return web.Response(status=404)
    ext = os.path.splitext(filename)[1].lower()
    ctype_map = {
        ".png":  "image/png",
        ".jpg":  "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg":  "image/svg+xml",
        ".webp": "image/webp",
    }
    ctype = ctype_map.get(ext, "application/octet-stream")
    with open(path, "rb") as f:
        data = f.read()
    return web.Response(body=data, content_type=ctype, headers={"Access-Control-Allow-Origin": "*"})


# ── Web Application ────────────────────────────────────────────────────────────

async def start_web() -> None:
    app = web.Application()
    # Health + static assets
    app.router.add_get("/health", health)
    app.router.add_get("/tonconnect-manifest.json", serve_manifest)
    app.router.add_get("/images/{filename}", serve_image)
    # API
    app.router.add_post("/api/user/init",     api_user_init)
    app.router.add_post("/api/user/referral", api_user_referral)
    app.router.add_get("/api/leaderboard",    api_leaderboard)
    # SPA fallback — must be last
    app.router.add_get("/{path:.*}", serve_app)

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
