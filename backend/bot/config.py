import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
# Отдельный бот только для публикации новостей в канал (polling не нужен).
# Если не задан — для постинга используется TELEGRAM_BOT_TOKEN (как раньше).
TELEGRAM_NEWS_BOT_TOKEN = os.getenv("TELEGRAM_NEWS_BOT_TOKEN")
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
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-r1-distill-qwen-32b")

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

