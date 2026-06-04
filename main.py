"""
TonCipher — Telegram Mini App Bot
Handles /start and serves the built React frontend.
"""
import asyncio
import logging
import os

from aiohttp import web
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://toncipherbot.onrender.com")
PORT = int(os.getenv("PORT", 8080))

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def cmd_start(msg: types.Message):
    if not WEBAPP_URL:
        await msg.answer(
            "⚙️ <b>TonCipher</b> — configuration en cours.\nRevenez bientôt !",
            parse_mode="HTML",
        )
        return

    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="🚀 Ouvrir TonCipher",
            web_app=WebAppInfo(url=WEBAPP_URL),
        )
    ]])

    await msg.answer(
        "👋 Bienvenue sur <b>TonCipher</b> !\n\n"
        "💎 Gagnez des <b>TON</b> en complétant des tâches simples.\n"
        "👥 Invitez vos amis et montez dans le classement.\n\n"
        "⬇️ Appuyez sur le bouton pour démarrer :",
        parse_mode="HTML",
        reply_markup=kb,
    )


# ── Static file server for the React app ──────────────────────────────────────

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
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
    }
    ctype = ctype_map.get(ext, "application/octet-stream")
    with open(path, "rb") as f:
        data = f.read()
    return web.Response(body=data, content_type=ctype, headers={"Access-Control-Allow-Origin": "*"})


async def start_web() -> None:
    app = web.Application()
    app.router.add_get("/health", health)
    app.router.add_get("/tonconnect-manifest.json", serve_manifest)
    app.router.add_get("/images/{filename}", serve_image)
    app.router.add_get("/{path:.*}", serve_app)   # SPA fallback — toujours en dernier
    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", PORT).start()
    log.info("Web server listening on port %s", PORT)


async def main() -> None:
    log.info("Starting TonCipher bot + web server…")
    await asyncio.gather(
        start_web(),
        dp.start_polling(bot, allowed_updates=["message"]),
    )


if __name__ == "__main__":
    asyncio.run(main())
