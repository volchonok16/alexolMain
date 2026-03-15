import httpx
from typing import Optional
import re

import config
from src.emoji_handler import EmojiHandler


class OpenRouterClient:
    def __init__(self):
        self.api_key = config.OPENROUTER_API_KEY
        self.base_url = config.OPENROUTER_BASE_URL
        self.model = config.OPENROUTER_MODEL
        self.emoji_handler = EmojiHandler()
        self.fallback_models = [
            "deepseek/deepseek-r1-distill-qwen-32b",
            "google/gemini-2.0-flash-exp:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "qwen/qwen-2.5-coder-32b-instruct:free",
            "deepseek/deepseek-chat:free",
            "mistralai/mistral-small-24b-instruct-2501:free",
            "google/gemma-2-9b-it:free",
            "meta-llama/llama-3.2-3b-instruct:free",
            "huggingfaceh4/zephyr-7b-beta:free",
        ]

    def _clean_ai_response(self, text: str) -> str:
        """Очищает ответ AI от артефактов, китайских символов и других нежелательных элементов"""
        if not text:
            return ""

        text = re.sub(r"\[/?INST\]", "", text, flags=re.IGNORECASE)
        text = re.sub(r"<\|.*?\|>", "", text)

        text = re.sub(r":想想", "", text)
        text = re.sub(r"薄", "", text)

        html_tags = []
        emojis = []

        # Сохраняем только разрешённые HTML-теги (b, i, code и их закрывающие),
        # все прочие "теги" вроде <FIRE> просто вырезаем.
        def save_html(match):
            tag = match.group(0)
            # имя тега без <, > и /, в нижнем регистре
            m = re.match(r"</?\s*([a-zA-Z0-9]+)", tag)
            allowed = {"b", "i", "code"}
            if m and m.group(1).lower() in allowed:
                html_tags.append(tag)
                return f"__HTML_TAG_{len(html_tags)-1}__"
            # все остальные псевдо-теги удаляем
            return ""

        text = re.sub(r"<[^>]+>", save_html, text)

        def save_emoji(match):
            emoji = match.group(0)
            emojis.append(emoji)
            return f"__EMOJI_{len(emojis)-1}__"

        emoji_pattern = (
            r"[\U0001F300-\U0001F9FF\U0001FA00-\U0001FAFF\U00002600-\U000027BF"
            r"\U0001F600-\U0001F64F\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF"
            r"\U00002700-\U000027BF\U0001F900-\U0001F9FF\U00002600-\U000026FF"
            r"\U00002700-\U000027BF]+"
        )
        text = re.sub(emoji_pattern, save_emoji, text)

        text = re.sub(r"[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]", "", text)

        # Разрешаем базовую пунктуацию и тире/дефисы, чтобы не склеивать слова вроде "январе–феврале".
        allowed_chars = r"a-zA-Zа-яА-ЯёЁ0-9\s\.,!?;:\(\)\[\]\{\}\-\—–\+\*\/=\'\"@#\$%&_\|\\`~"
        text = re.sub(f"[^{allowed_chars}]", "", text)

        # Удаляем "случайные" иностранные слова (unlock/enabling/menjadi и т.п.),
        # но сохраняем короткие аббревиатуры и распространённые названия компаний/продуктов.
        def remove_foreign_words(t: str) -> str:
            allowed_short = {"ai", "it", "api", "sql", "ml", "ui", "ux", "vr", "ar"}
            allowed_brands = {
                "microsoft",
                "google",
                "openai",
                "anthropic",
                "meta",
                "apple",
                "amazon",
                "nvidia",
                "intel",
                "amd",
                "tesla",
                "samsung",
                "ibm",
                "oracle",
                "adobe",
                "github",
                "gitlab",
                "linux",
                "windows",
                "android",
                "ios",
                "azure",
                "aws",
                "gcp",
                "copilot",
                "chatgpt",
                "gpt",
                "gemini",
                "claude",
                "deepseek",
                "qwen",
                # fintech/payments
                "visa",
                "mastercard",
                "paypal",
                "stripe",
                "revolut",
                "wise",
                "binance",
                "coinbase",
                "ethereum",
                "bitcoin",
                "solana",
                "tether",
                # наш бренд/сайт
                "alexol",
            }

            # Удаляем латинские слова длиной 4+ символа, если это "обычные" английские слова,
            # но оставляем бренды/продукты и CamelCase/ALLCAPS.
            def repl(match):
                word = match.group(0)
                w = word.lower()
                if w in allowed_short or w in allowed_brands:
                    return word
                # ALLCAPS оставляем (например, NVIDIA, AWS)
                if word.isupper():
                    return word
                # CamelCase оставляем (например, OpenAI, ChatGPT)
                if any(c.isupper() for c in word[1:]):
                    return word
                # Capitalized-only (Unlock) считаем "обычным" словом и вырезаем
                return "" if word.islower() or (word[:1].isupper() and word[1:].islower()) else ""
 
            t = re.sub(r"\b[A-Za-z]{4,}\b", repl, t)
            # Дополнительно защищаем полное доменное имя alexol.io на случай,
            # если оно было частично затронуто другими заменами.
            t = t.replace("alexol.io", "alexol.io")
            t = t.replace("https://alexol.io", "https://alexol.io")
            return t

        text = remove_foreign_words(text)

        # Нормализуем пробелы вокруг пунктуации: "анонсировала , облачное" -> "анонсировала, облачное"
        text = re.sub(r"\s+([,.;:!?])", r"\1", text)
        text = re.sub(r"([,.;:!?])([^\s\n])", r"\1 \2", text)

        # Исправляем склейки вида "гигантыcpu" -> "гигант CPU" / "гигантами CPU"
        text = re.sub(r"([А-Яа-яЁё]+)cpu\b", r"\1 CPU", text, flags=re.IGNORECASE)

        for i, emoji in enumerate(emojis):
            text = text.replace(f"__EMOJI_{i}__", emoji)

        for i, tag in enumerate(html_tags):
            text = text.replace(f"__HTML_TAG_{i}__", tag)

        lines = text.split("\n")
        cleaned_lines = []
        for line in lines:
            cleaned_line = re.sub(r"\s+", " ", line).strip()
            if cleaned_line:
                cleaned_lines.append(cleaned_line)
            else:
                cleaned_lines.append("")

        text = "\n".join(cleaned_lines)
        text = re.sub(r"\n{3,}", "\n\n", text)

        return text.strip()

    async def _try_model(self, client: httpx.AsyncClient, model: str, prompt: str) -> Optional[str]:
        if not self.api_key or self.api_key == "your_openrouter_api_key":
            print("      ❌ API ключ не настроен! Добавь OPENROUTER_API_KEY в .env")
            return None

        try:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/telegram-news-bot",
                    "X-Title": "Telegram News Bot",
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 2000,
                    "temperature": 0.8,
                },
            )

            if response.status_code == 200:
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    raw_text = data["choices"][0]["message"]["content"].strip()
                    cleaned_text = self._clean_ai_response(raw_text)
                    if cleaned_text and len(cleaned_text) > 10:
                        return cleaned_text
                    else:
                        print(f"      ⚠️ Ответ от {model} слишком короткий после очистки")
                        return None
                print(f"      ⚠️ Пустой ответ от {model}")
                return None
            elif response.status_code == 401:
                print("      ❌ Неверный API ключ!")
                return None
            elif response.status_code == 402:
                print("      ❌ Недостаточно кредитов на OpenRouter")
                return None
            elif response.status_code == 429:
                print("      ⚠️ Лимит запросов, пробуем другую модель...")
                return None
            else:
                try:
                    error_data = response.json()
                    if "error" in error_data:
                        error_msg = error_data["error"].get("message", "Unknown error")
                        print(f"      ⚠️ {response.status_code}: {error_msg[:80]}")
                except Exception:
                    print(f"      ⚠️ HTTP {response.status_code}: {response.text[:80]}")
                return None
        except httpx.TimeoutException:
            print(f"      ⚠️ Таймаут запроса к {model}")
            return None
        except Exception as e:
            print(f"      ⚠️ Ошибка: {str(e)[:80]}")
            return None

    async def rewrite_article(self, title: str, description: str, source: str) -> Optional[str]:
        emoji_list = self.emoji_handler.get_emoji_list_for_prompt()

        prompt = f"""Ты — главный редактор Telegram-канала про финтех и IT. Напиши профессиональный, но живой пост.

ИСХОДНИК:
Заголовок: {title}
Текст: {description}

СТИЛЬ — редакторский:
• Пиши ТОЛЬКО по-русски (без английских и других иностранных слов в середине предложений, кроме коротких аббревиатур вроде AI, IT, API, SQL и названий компаний/продуктов)
• Грамотный литературный русский без орфографических и грамматических ошибок
• Короткие абзацы (2-3 предложения)
• Пустая строка между абзацами
• Живой язык, конкретика
• ЗАВЕРШАЙ мысль — не оставляй вопросы без ответа!
• В заголовке и в первом абзаце назови ключевую компанию/продукт (если они есть в исходнике). Не пиши "представила" без субъекта.

СТРУКТУРА:
<b>💡 Название компании/продукта + короткое действие</b>

Суть в 1-2 предложениях.

Почему важно — 2 предложения.

Вывод с ответом — что это значит, к чему приведёт.

Не добавляй подпись, хэштеги или ссылки — они добавляются автоматически.

ФОРМАТИРОВАНИЕ:
• <b>жирный</b> — заголовки
• <i>курсив</i> — акценты
• <code>код</code> — термины
• Эмодзи: {emoji_list}

⚠️ ДЛИНА: 700-850 символов.

ЗАПРЕЩЕНО: война, политика, Роскомнадзор, блокировки, вейпы — верни SKIP

НЕ используй хэштеги (#тег1 и т.п.).

Ответ — только готовый пост или SKIP:"""

        models_to_try = [self.model] + [m for m in self.fallback_models if m != self.model]

        async with httpx.AsyncClient(timeout=90.0) as client:
            for model in models_to_try:
                print(f"   Попытка модели: {model}")
                result = await self._try_model(client, model, prompt)
                if result:
                    print(f"   ✅ Успешно использована модель: {model}")
                    return result
                else:
                    print(f"   ❌ Модель {model} не доступна")

            print("\n❌ Все модели недоступны!")
            print("   💡 Проверь:")
            print("      1. Актуальные бесплатные модели на https://openrouter.ai/models")
            print("      2. Правильность API ключа в .env файле")
            print("      3. Баланс на OpenRouter (даже бесплатные модели требуют регистрации)")
            print("      4. Попробуй обновить OPENROUTER_MODEL в .env на актуальную модель")
            return None

    async def rewrite_article_from_multiple(self, posts: list[dict]) -> Optional[tuple[dict, str]]:
        emoji_list = self.emoji_handler.get_emoji_list_for_prompt()

        posts_text = ""
        for i, post in enumerate(posts, 1):
            posts_text += f"""
Пост {i}:
Заголовок: {post['original_title']}
Текст: {post['original_text'][:500]}...
Источник: {post['source_name']}
---
"""

        prompt = f"""Ты — главный редактор Telegram-канала про финтех и IT. Пиши профессионально, но живо и интересно.

Вот {len(posts)} новостей:
{posts_text}

ЗАДАЧА: Выбери ОДНУ самую интересную IT/финтех-новость и напиши пост.

СТИЛЬ — редакторский:
• Пиши ТОЛЬКО по-русски (без английских и других иностранных слов в середине предложений, кроме коротких аббревиатур вроде AI, IT, API, SQL и названий компаний/продуктов)
• Грамотный литературный русский без орфографических и грамматических ошибок
• Короткие абзацы (2-3 предложения)
• Пустая строка между абзацами
• Живой язык, конкретика
• ЗАВЕРШАЙ мысль, не оставляй вопросы без ответа
• В заголовке и в первом абзаце назови ключевую компанию/продукт (если они есть в исходнике). Не пиши "представила" без субъекта.

СТРУКТУРА (строго):
<b>💡 Название компании/продукта + короткое действие</b>

Суть новости — 1-2 предложения.

Почему важно — 2 предложения с конкретикой.

Вывод с ответом — что это значит, к чему приведёт. НЕ задавай вопрос без ответа!

Не добавляй подпись, хэштеги или ссылки — они добавляются автоматически.

ФОРМАТИРОВАНИЕ:
• <b>жирный</b> — заголовки
• <i>курсив</i> — акценты
• <code>код</code> — термины
• Эмодзи: {emoji_list}

⚠️ ДЛИНА: 700-850 символов.

ЗАПРЕЩЁННЫЕ ТЕМЫ (верни SKIP):
Война, политика, Роскомнадзор, блокировки, вейпы, курение

НЕ используй хэштеги (#тег1 и т.п.).

Формат ответа (строго):
1. Первая строка — только цифра номера поста (1-{len(posts)})
2. Вторая строка — пустая
3. Остальное — готовый пост

Пример:
2

<b>💡 Заголовок</b>
Текст поста...
"""

        models_to_try = [self.model] + [m for m in self.fallback_models if m != self.model]

        async with httpx.AsyncClient(timeout=150.0) as client:
            for i, model in enumerate(models_to_try, 1):
                print(f"   Попытка {i}/{len(models_to_try)}: {model}")
                result = await self._try_model(client, model, prompt)
                if result:
                    print(f"   ✅ Успешно использована модель: {model}")

                    result_upper = result.strip().upper()
                    if result_upper.startswith("SKIP") or "SKIP" in result_upper[:50]:
                        print("   ⚠️ AI вернул SKIP, пропускаем")
                        return None

                    result_clean = result.strip()
                    if "[/INST]" in result_clean:
                        parts = result_clean.split("[/INST]", 1)
                        if len(parts) > 1:
                            result_clean = parts[1].strip()

                    lines = result_clean.split("\n")

                    lines_to_skip = 0
                    for j, line in enumerate(lines[:3]):
                        line_clean = line.strip().lower()
                        if (
                            line.strip().isdigit()
                            or "номер поста" in line_clean
                            or "пост №" in line_clean
                            or ("post" in line_clean and ":" in line_clean)
                            or line_clean == ""
                        ):
                            lines_to_skip = j + 1
                        else:
                            break

                    post_num = 0
                    for line in lines[:lines_to_skip]:
                        numbers = re.findall(r"\d+", line)
                        if numbers:
                            post_num = int(numbers[0]) - 1
                            break

                    if 0 < lines_to_skip < len(lines):
                        rewritten_text = "\n".join(lines[lines_to_skip:]).strip()
                    else:
                        rewritten_text = result_clean

                    selected_post = posts[post_num] if 0 <= post_num < len(posts) else posts[0]

                    if rewritten_text and len(rewritten_text) > 50:
                        return (selected_post, rewritten_text)

                    return (selected_post, result_clean)
                else:
                    print(f"   ❌ Модель {model} не доступна")

            print("\n❌ Все модели недоступны!")
            print("   💡 Проверь:")
            print("      1. Актуальные бесплатные модели на https://openrouter.ai/models")
            print("      2. Правильность API ключа в .env файле")
            print("      3. Баланс на OpenRouter (даже бесплатные модели требуют регистрации)")
            print("      4. Попробуй обновить OPENROUTER_MODEL в .env на актуальную модель")
            return None

    async def generate_image_prompt(
        self, title: str, description: str, generated_text: str = ""
    ) -> Optional[str]:
        context = generated_text[:800] if generated_text else description[:400]

        prompt = f"""Проанализируй новость на тему финтеха или IT и создай ТОЧНЫЙ запрос для поиска изображения.

ЗАГОЛОВОК: {title}

ПОЛНЫЙ ТЕКСТ ПОСТА:
{context}

ЗАДАЧА: Определи ГЛАВНУЮ тему поста и подбери визуальный объект.

ПРАВИЛА:
✅ 2-4 слова на английском
✅ Конкретный технологический объект
❌ БЕЗ людей, лиц, рук
❌ БЕЗ абстракций ("innovation", "future")

Ответ — только запрос:"""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://github.com/telegram-news-bot",
                        "X-Title": "Telegram News Bot",
                    },
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 50,
                        "temperature": 0.5,
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    raw_text = data["choices"][0]["message"]["content"].strip()
                    cleaned_text = self._clean_ai_response(raw_text)
                    return cleaned_text if cleaned_text else None
                return None

        except Exception as e:
            print(f"Ошибка генерации промпта для изображения: {e}")
            return None

    async def generate_lead_post(self) -> Optional[str]:
        """Генерирует промо-пост о том, что Alexol ищет новые проекты."""
        examples = """
Вариант 1:
👋 Друзья, важная новость!

Мы в Alexol открыты к новым проектам и ищем интересные задачи. Если вы или ваши знакомые задумывались о цифровизации бизнеса, разработке корпоративной системы, веб-сервиса или мобильного приложения — сейчас самое время начать!

🚀 Как с нами связаться:
— Оставить заявку на сайте: https://alexol.io
— Написать в нашего бота: @AlexolBot

Мы работаем быстро, честно и с душой. Ждём ваши задачи! 💻✨

---
Вариант 2:
📢 Alexol ищет новые проекты!

Мы в активном поиске задач по разработке ПО. В приоритете:
— Корпоративные системы
— Веб-приложения
— Мобильные приложения

✅ 7+ лет опыта
✅ 150+ успешных проектов
✅ Команда senior-специалистов

📌 Оставить заявку можно:
🔹 На сайте: https://alexol.io
🔹 В Telegram-боте: @AlexolBot

Будем рады сотрудничеству! 🤝

---
Вариант 3:
⚡️ Внимание! Alexol в поиске проектов

Хотите качественную разработку под ключ? Мы готовы взяться за вашу задачу!

📱 Корпсистемы
💻 Веб-сервисы
📲 Мобильные приложения

Оставляйте заявку:
🌐 https://alexol.io
🤖 @AlexolBot

Ждём вас! 🚀

---
Вариант 4:
🔥 Мы ищем, кого бы автоматизировать!

Команда Alexol набирает обороты и ищет новые проекты. Если у вас есть идея или готовая задача — не стесняйтесь, пишите!

🏆 7 лет, 150+ проектов, только senior-разработчики.

📬 Два способа связаться:
— Сайт: https://alexol.io
— Бот: @AlexolBot

Расскажите о своей задаче, и мы предложим лучшее решение! 👨‍💻

---
Вариант 5:
📌 Важное объявление

Друзья, мы открыты к сотрудничеству и ищем новые проекты! Если вам нужна заказная разработка ПО — корпоративные системы, веб или мобильные приложения — присылайте заявку.

🔹 Сайт: https://alexol.io
🔹 Бот: @AlexolBot

Полный цикл работ: от идеи до поддержки. Ждём ваши задачи! 🚀
"""

        prompt = f"""Ты — редактор Telegram-канала компании по разработке ПО Alexol.

Ниже есть несколько примеров постов о том, что команда ищет новые проекты:
{examples}

ЗАДАЧА:
— На основе примеров сгенерируй НОВЫЙ вариант поста на русском языке.
— Пост должен быть о том, что Alexol открыт к новым проектам и ищет интересные задачи в области разработки ПО.
— Обязательно упомяни:
   • сайт https://alexol.io (именно так, полностью, не ".io" и не без https)
   • Telegram-бота @AlexolBot
— Стиль: дружелюбный, профессиональный, без канцелярита.

ТРЕБОВАНИЯ:
— 2–4 абзаца, короткие строки.
— Используй эмодзи, но не перебарщивай.
— 350–700 символов.
— НЕ копируй дословно ни один из примеров, текст должен быть вариацией в том же духе.
— Не используй нумерацию вариантов и слова «Вариант 1/2/3».

Ответ: только готовый текст поста, без пояснений."""

        models_to_try = [self.model] + [m for m in self.fallback_models if m != self.model]

        async with httpx.AsyncClient(timeout=90.0) as client:
            for i, model in enumerate(models_to_try, 1):
                print(f"   [lead] Попытка {i}/{len(models_to_try)}: {model}")
                result = await self._try_model(client, model, prompt)
                if result:
                    print(f"   [lead] ✅ Успешно использована модель: {model}")
                    return result
                else:
                    print(f"   [lead] ❌ Модель {model} не доступна")

        print("[lead] ❌ Не удалось сгенерировать промо-пост (все модели недоступны)")
        return None

