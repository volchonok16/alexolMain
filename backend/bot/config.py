import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
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

POST_HOUR = int(os.getenv("POST_HOUR", "10"))
TIMEZONE = os.getenv("TIMEZONE", "Europe/Moscow")

MAX_POST_LENGTH = 3000

# Подпись с ссылкой на канал, которая будет добавляться в конец каждого поста.
# Если нужно переопределить, можно задать SUBSCRIBE_FOOTER в .env,
# но по умолчанию используем фиксированное значение с ссылкой:
# Alexol | Подписаться (https://t.me/+QofDQ2Ctq8o1Y2Ey)
SUBSCRIBE_FOOTER = os.getenv(
    "SUBSCRIBE_FOOTER",
    "Alexol(https://t.me/+QofDQ2Ctq8o1Y2Ey) |(https://t.me/+QofDQ2Ctq8o1Y2Ey) Подписаться:(https://t.me/+QofDQ2Ctq8o1Y2Ey)", parse_mode=ParseMode.MARKDOWN
)

