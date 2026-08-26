import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
# Отдельный бот только для публикации новостей в канал (polling не нужен).
# Если не задан — для постинга используется TELEGRAM_BOT_TOKEN (как раньше).
TELEGRAM_NEWS_BOT_TOKEN = os.getenv("TELEGRAM_NEWS_BOT_TOKEN")
# Языковой tutor-бот (Alexol Speak): отдельный токен, отдельный polling.
SPEAK_BOT_TOKEN = os.getenv("SPEAK_BOT_TOKEN")
# Mini App с офлайн-карточками (открывается из бота).
SPEAK_WEBAPP_URL = (os.getenv("SPEAK_WEBAPP_URL") or "https://lang.alexol.io").rstrip("/")
# STT: local = бесплатно (Whisper на сервере), openrouter = платно через API
SPEAK_STT_BACKEND = os.getenv("SPEAK_STT_BACKEND", "local")
SPEAK_WHISPER_LOCAL_MODEL = os.getenv("SPEAK_WHISPER_LOCAL_MODEL", "small")
SPEAK_STT_MODEL = os.getenv("SPEAK_STT_MODEL", "openai/whisper-1")
SPEAK_TTS_MODEL = os.getenv("SPEAK_TTS_MODEL", "deepgram/flux-tts:free")
# Один голос для всех ответов (OpenRouter Flux). Провайдеры через запятую: openrouter, edge, gtts
SPEAK_TTS_VOICE = os.getenv("SPEAK_TTS_VOICE", "flux-kit-en")
SPEAK_TTS_PROVIDERS = os.getenv("SPEAK_TTS_PROVIDERS", "openrouter,gtts")
# Скорость озвучки по умолчанию (B1): 0.85 slow, 0.95 b1, 1.0 normal, 1.1 fast
SPEAK_TTS_SPEED_DEFAULT = float(os.getenv("SPEAK_TTS_SPEED_DEFAULT", "0.95"))
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID")
# Куда слать заявки / обращения (не новости).
# Приоритет: TELEGRAM_REQUESTS_CHAT_ID -> TELEGRAM_CHAT_ID -> TELEGRAM_CHANNEL_ID
TELEGRAM_REQUESTS_CHAT_ID = (
    os.getenv("TELEGRAM_REQUESTS_CHAT_ID")
    or os.getenv("TELEGRAM_CHAT_ID")
    or TELEGRAM_CHANNEL_ID
)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# VK API настройки
VK_ACCESS_TOKEN = os.getenv("VK_ACCESS_TOKEN")
VK_GROUP_ID = os.getenv("VK_GROUP_ID")  # ID группы (без минуса) или страницы

# Instagram настройки (опционально, на свой риск!)
INSTAGRAM_USERNAME = os.getenv("INSTAGRAM_USERNAME")
INSTAGRAM_PASSWORD = os.getenv("INSTAGRAM_PASSWORD")

TELEGRAM_API_ID = os.getenv("TELEGRAM_API_ID")
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH")
TELEGRAM_PHONE = os.getenv("TELEGRAM_PHONE")

TDATA_PATH = os.getenv("TDATA_PATH", "tdata")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3-nano-30b-a3b:free")

_openrouter_fallback_models_env = os.getenv(
    "OPENROUTER_FALLBACK_MODELS",
    ",".join(
        [
            "nvidia/nemotron-3-nano-30b-a3b:free",
            "openrouter/free",
            "google/gemma-4-26b-a4b:free",
            "openai/gpt-oss-20b:free",
            "nvidia/nemotron-3-super-120b-a12b:free",
            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
            "qwen/qwen3.6-plus:free",
            "google/gemma-3-27b-it:free",
            "meta-llama/llama-3.3-70b-instruct:free",
        ]
    ),
)
OPENROUTER_FALLBACK_MODELS = [
    model.strip()
    for model in _openrouter_fallback_models_env.split(",")
    if model.strip()
]

# Speak tutor: без reasoning-моделей (ломают JSON, озвучивают «user safe» и т.п.)
SPEAK_OPENROUTER_MODEL = os.getenv("SPEAK_OPENROUTER_MODEL", "qwen/qwen3.6-plus:free")
_speak_fallback_env = os.getenv(
    "SPEAK_OPENROUTER_FALLBACK_MODELS",
    ",".join(
        [
            "qwen/qwen3.6-plus:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "google/gemma-3-27b-it:free",
            "nvidia/nemotron-3-nano-30b-a3b:free",
            "poolside/laguna-xs.2:free",
            "openrouter/free",
        ]
    ),
)
SPEAK_OPENROUTER_FALLBACK_MODELS = [
    model.strip()
    for model in _speak_fallback_env.split(",")
    if model.strip()
]

# Backend news integration (optional)
# Example:
# BACKEND_API_URL=https://api.alexol.io/api
# BACKEND_ADMIN_LOGIN=alex
# BACKEND_ADMIN_PASSWORD=...
BACKEND_API_URL = os.getenv("BACKEND_API_URL")
BACKEND_ADMIN_LOGIN = os.getenv("BACKEND_ADMIN_LOGIN")
BACKEND_ADMIN_PASSWORD = os.getenv("BACKEND_ADMIN_PASSWORD")

NEWS_MAX_AGE_HOURS = int(os.getenv("NEWS_MAX_AGE_HOURS", "24"))
CLEANUP_DAYS = 3

# Ключевые слова для поиска картинок к промо-постам «мы ищем проекты»: бизнес, команда, работа над проектом.
LEAD_IMAGE_KEYWORDS = [
    "successful business team",
    "business people working together",
    "office team collaboration",
    "startup team meeting",
    "business handshake",
    "professional team project",
    "company office meeting",
    "business presentation",
    "team brainstorming",
    "entrepreneurs working",
]

IMAGE_SEARCH_KEYWORDS = [
    "fintech",
    "digital banking",
    "mobile banking app",
    "payment terminal",
    "online payments",
    "stock market dashboard",
    "cryptocurrency trading",
    "blockchain network",
    "technology",
    "coding",
    "programming",
    "artificial intelligence",
    "cybersecurity",
    "data science",
    "cloud computing",
    "software development",
]

IT_KEYWORDS = [
    "технология",
    "технологии",
    "технологический",
    "программирование",
    "разработка",
    "разработчик",
    "искусственный интеллект",
    "ai",
    "машинное обучение",
    "кибербезопасность",
    "безопасность",
    "облако",
    "cloud",
    "сервер",
    "приложение",
    "приложения",
    "app",
    "стартап",
    "инновации",
    "инновационный",
    "гаджет",
    "устройство",
    "девайс",
    "процессор",
    "чип",
    "микросхема",
    "интернет",
    "сеть",
    "сети",
    "данные",
    "big data",
    "аналитика",
    "код",
    "алгоритм",
    "программное обеспечение",
    "linux",
    "windows",
    "android",
    "ios",
    "python",
    "javascript",
    "github",
    "gitlab",
    "docker",
    "kubernetes",
    "nvidia",
    "intel",
    "amd",
    "apple",
    "google",
    "microsoft",
    "openai",
    "chatgpt",
    "яндекс",
    "gigachat",
    "huggingface",
    "hugging face",
    "raspberry",
    "node.js",
    "copilot",
    "gpu",
    "cpu",
    "api",
]

FINTECH_KEYWORDS = [
    "финтех",
    "fintech",
    "финансовые технологии",
    "финансовый сервис",
    "необанк",
    "neobank",
    "банк",
    "банковский",
    "банкинг",
    "digital banking",
    "онлайн-банк",
    "платеж",
    "платёж",
    "платежи",
    "перевод",
    "переводы",
    "эквайринг",
    "эквайринговый",
    "терминал оплаты",
    "оплата картой",
    "банковская карта",
    "дебетовая карта",
    "кредитная карта",
    "кошелёк",
    "кошелек",
    "электронный кошелёк",
    "электронный кошелек",
    "wallet",
    "p2p",
    "инвестиции",
    "инвестиционный",
    "трейдинг",
    "инвестплатформа",
    "биржа",
    "фондовый рынок",
    "акции",
    "облигации",
    "криптовалюта",
    "крипта",
    "crypto",
    "биткоин",
    "bitcoin",
    "ethereum",
    "blockchain",
    "defi",
    "paytech",
]

# Для обратной совместимости (больше не используется напрямую планировщиком).
POST_HOUR = int(os.getenv("POST_HOUR", "10"))

# Часовые окна публикации новостей: (начало_часа, конец_часа).
# Случайная минута внутри каждого окна выбирается при старте бота.
# Формат в .env: NEWS_WINDOWS=10-11,14-15,18-19,22-23
_news_windows_env = os.getenv("NEWS_WINDOWS", "10-11,14-15,18-19,22-23")
NEWS_WINDOWS = [
    (int(pair.split("-")[0]), int(pair.split("-")[1]))
    for pair in _news_windows_env.split(",")
    if "-" in pair
]

TIMEZONE = os.getenv("TIMEZONE", "Europe/Moscow")

MAX_POST_LENGTH = 3000

# Подпись с ссылкой на канал, которая будет добавляться в конец каждого поста.
# Формат по умолчанию — HTML-ссылка для Telegram:
# <a href="https://t.me/+B3Ru2nZS8K82MDc6">Alexol | Подписаться</a>
# VK и Instagram получают тот же текст, но без HTML (в VK будет "Alexol | Подписаться (https://t.me/+B3Ru2nZS8K82MDc6)").
SUBSCRIBE_FOOTER = os.getenv(
    "SUBSCRIBE_FOOTER",
    '<a href="https://t.me/+B3Ru2nZS8K82MDc6">Alexol | Подписаться</a>',
)

