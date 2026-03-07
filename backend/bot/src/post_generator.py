import asyncio
from typing import Optional, Tuple

from src.rss_parser import RSSParser
from src.telegram_parser import TelegramParser
from src.openrouter_client import OpenRouterClient
from src.image_handler import ImageHandler
from src.telegram_bot import TelegramPublisher
from src.vk_publisher import VKPublisher
from src.instagram_publisher import InstagramPublisher
from src.emoji_handler import EmojiHandler
from src import database as db
import config


class PostGenerator:
    def __init__(self):
        self.rss_parser = RSSParser()
        self.telegram_parser = TelegramParser()
        self.ai_client = OpenRouterClient()
        self.image_handler = ImageHandler()
        self.telegram = TelegramPublisher()
        self.vk = VKPublisher() if config.VK_ACCESS_TOKEN and config.VK_GROUP_ID else None
        self.instagram = InstagramPublisher() if config.INSTAGRAM_USERNAME and config.INSTAGRAM_PASSWORD else None
        self.emoji_handler = EmojiHandler()
        self.backend_news = None
        if config.BACKEND_API_URL and config.BACKEND_ADMIN_LOGIN and config.BACKEND_ADMIN_PASSWORD:
            try:
                from src.backend_news_publisher import BackendNewsPublisher, BackendCredentials

                self.backend_news = BackendNewsPublisher(
                    BackendCredentials(
                        api_url=config.BACKEND_API_URL,
                        login=config.BACKEND_ADMIN_LOGIN,
                        password=config.BACKEND_ADMIN_PASSWORD,
                    )
                )
                print(f"🧩 Backend news integration enabled: {config.BACKEND_API_URL}")
            except Exception as e:
                print(f"⚠️ Не удалось инициализировать Backend news интеграцию: {e}")

    async def fetch_new_content(self):
        print("📰 Загрузка новых материалов...")

        deleted_parsed, deleted_generated = db.cleanup_old_posts()
        if deleted_parsed > 0 or deleted_generated > 0:
            print(
                f"   🗑️ Удалено старых постов: {deleted_parsed} спарсенных, {deleted_generated} сгенерированных (старше {config.CLEANUP_DAYS} дней)"
            )

        old_marked = db.mark_old_posts_as_used()
        if old_marked > 0:
            print(f"   ⚠️ Помечено {old_marked} постов старше {config.NEWS_MAX_AGE_HOURS}ч как использованные")

        print("   RSS ленты...")
        await self.rss_parser.get_random_articles(20)

        print("   Telegram каналы...")
        await self.telegram_parser.fetch_all_channels(5)

        stats = db.get_stats()
        print(
            f"📊 В базе: {stats['total_parsed']} постов, из них {stats['fresh_unused']} свежих неиспользованных (не старше {config.NEWS_MAX_AGE_HOURS}ч)"
        )

    def _filter_posts(self, posts: list[dict]) -> list[dict]:
        war_keywords = [
            "война",
            "военный",
            "конфликт",
            "боевые",
            "атака",
            "обстрел",
            "нападение",
            "сражение",
            "вооружённый",
            "вооруженный",
            "вооружение",
            "оружие",
            "бомба",
            "ракета",
            "снаряд",
            "военные действия",
            "военная операция",
            "спецоперация",
            "мобилизация",
        ]

        politics_keywords = [
            "политика",
            "политический",
            "политик",
            "депутат",
            "партия",
            "выборы",
            "избиратель",
            "роскомнадзор",
            "ркн",
            "роском",
            "рособрнадзор",
            "роспотребнадзор",
            "блокировка",
            "блокируют",
            "заблокирован",
            "заблокировали",
            "разблокировка",
            "цензура",
            "запрет",
            "запретили",
            "запрещено",
            "запрещают",
            "санкции",
            "санкционный",
            "санкционированный",
            "власть",
            "власти",
            "правительство",
            "министерство",
            "министр",
            "президент",
            "госдума",
            "дума",
            "совет федерации",
            "федеральный совет",
            "путин",
            "медведев",
            "мишустин",
            "нарышкин",
            "володин",
            "оппозиция",
            "оппозиционный",
            "протест",
            "митинг",
            "демонстрация",
        ]

        prohibited_keywords = [
            "вейп",
            "вейпинг",
            "vape",
            "vaping",
            "вейпер",
            "вейперы",
            "электронная сигарета",
            "электронные сигареты",
            "электронка",
            "курение",
            "табак",
            "никотин",
            "сигареты",
            "сигарета",
            "сигара",
            "кальян",
            "трубка",
            "табачный",
            "табачная",
            "табачные",
        ]

        filtered = []
        for post in posts:
            title_lower = post["original_title"].lower()
            text_lower = post["original_text"].lower()

            if any(keyword in title_lower or keyword in text_lower for keyword in war_keywords):
                print(f"⚠️ Пост содержит тему о войне, пропускаем: {post['original_title'][:50]}...")
                db.mark_parsed_post_used(post["id"])
                continue

            if any(keyword in title_lower or keyword in text_lower for keyword in politics_keywords):
                print(f"⚠️ Пост содержит политическую тему, пропускаем: {post['original_title'][:50]}...")
                db.mark_parsed_post_used(post["id"])
                continue

            if any(keyword in title_lower or keyword in text_lower for keyword in prohibited_keywords):
                print(
                    f"⚠️ Пост содержит запрещённую тему (вейпы/курение), пропускаем: {post['original_title'][:50]}..."
                )
                db.mark_parsed_post_used(post["id"])
                continue

            if not post.get("image_url"):
                print(f"⚠️ Пост без изображения, пропускаем: {post['original_title'][:50]}...")
                db.mark_parsed_post_used(post["id"])
                continue

            filtered.append(post)

        return filtered

    def _calculate_interest_score(self, post: dict) -> float:
        score = 0.0
        title = post["original_title"].lower()
        text = post["original_text"].lower()
        full_text = title + " " + text

        text_length = len(post["original_text"])

        if 300 <= text_length <= 1500:
            score += 20
        elif 150 <= text_length < 300:
            score += 10
        elif text_length > 1500:
            score += 5

        it_keywords_found = sum(1 for keyword in config.IT_KEYWORDS if keyword in full_text)
        score += it_keywords_found * 3

        if any(word in title for word in ["новый", "новое", "новые", "новинка", "революция", "прорыв", "инновация"]):
            score += 15

        if any(word in title for word in ["ai", "искусственный интеллект", "машинное обучение", "нейросеть"]):
            score += 10

        if any(word in title for word in ["безопасность", "кибербезопасность", "уязвимость", "хакер"]):
            score += 8

        if any(word in title for word in ["стартап", "инвестиции", "финансирование", "миллион", "миллиард"]):
            score += 7

        if post["source_type"] == "rss":
            score += 5

        if "habr" in post["source_name"].lower() or "habr" in post.get("original_link", "").lower():
            score += 10

        return score

    def _rank_posts(self, posts: list[dict]) -> list[dict]:
        scored_posts = []
        for post in posts:
            score = self._calculate_interest_score(post)
            scored_posts.append((score, post))

        scored_posts.sort(key=lambda x: x[0], reverse=True)

        ranked = [post for _, post in scored_posts]

        print("📊 Ранжирование постов по интересности:")
        for i, (score, post) in enumerate(scored_posts[:10], 1):
            print(f"   {i}. [{score:.1f} баллов] {post['original_title'][:55]}...")

        return ranked

    def _check_prohibited_content(self, text: str) -> tuple[bool, str]:
        text_lower = text.lower()

        war_keywords = [
            "война",
            "военный",
            "конфликт",
            "боевые",
            "атака",
            "обстрел",
            "нападение",
            "сражение",
            "вооружённый",
            "вооруженный",
            "вооружение",
            "оружие",
            "бомба",
            "ракета",
            "снаряд",
            "военные действия",
            "военная операция",
            "спецоперация",
            "мобилизация",
        ]

        politics_keywords = [
            "политика",
            "политический",
            "политик",
            "депутат",
            "партия",
            "выборы",
            "избиратель",
            "роскомнадзор",
            "ркн",
            "роском",
            "рособрнадзор",
            "роспотребнадзор",
            "блокировка",
            "блокируют",
            "заблокирован",
            "заблокировали",
            "разблокировка",
            "цензура",
            "запрет",
            "запретили",
            "запрещено",
            "запрещают",
            "санкции",
            "санкционный",
            "санкционированный",
            "власть",
            "власти",
            "правительство",
            "министерство",
            "министр",
            "президент",
            "госдума",
            "дума",
            "совет федерации",
            "федеральный совет",
            "путин",
            "медведев",
            "мишустин",
            "нарышкин",
            "володин",
            "оппозиция",
            "оппозиционный",
            "протест",
            "митинг",
            "демонстрация",
        ]

        prohibited_keywords = [
            "вейп",
            "вейпинг",
            "vape",
            "vaping",
            "вейпер",
            "вейперы",
            "электронная сигарета",
            "электронные сигареты",
            "электронка",
            "курение",
            "табак",
            "никотин",
            "сигареты",
            "сигарета",
            "сигара",
            "кальян",
            "трубка",
            "табачный",
            "табачная",
            "табачные",
        ]

        if any(keyword in text_lower for keyword in war_keywords):
            return True, "война"
        if any(keyword in text_lower for keyword in politics_keywords):
            return True, "политика"
        if any(keyword in text_lower for keyword in prohibited_keywords):
            return True, "вейпы/курение"
        return False, ""

    async def generate_post(self) -> Tuple[Optional[str], Optional[str], Optional[bytes], Optional[int]]:
        await self.fetch_new_content()

        max_attempts = 3
        used_post_ids = set()

        for attempt in range(1, max_attempts + 1):
            print(f"\n🔄 Попытка {attempt}/{max_attempts} генерации поста...")

            print("📰 Получение постов для анализа...")
            posts = db.get_unused_parsed_posts(20)

            if not posts:
                print("❌ Нет доступных постов для обработки")
                return None, None, None, None

            posts = [p for p in posts if p["id"] not in used_post_ids]
            if not posts:
                print("❌ Все доступные посты уже были использованы в этой попытке")
                return None, None, None, None

            filtered_posts = self._filter_posts(posts)

            if len(filtered_posts) < 5:
                print(f"⚠️ После фильтрации осталось только {len(filtered_posts)} постов, получаем ещё...")
                additional = db.get_unused_parsed_posts(20)
                additional = [p for p in additional if p["id"] not in used_post_ids]
                filtered_posts.extend(self._filter_posts(additional))

            if not filtered_posts:
                print("❌ Не удалось найти подходящие посты после фильтрации")
                return None, None, None, None

            ranked_posts = self._rank_posts(filtered_posts)
            selected_posts = ranked_posts[:10]

            if attempt == 1:
                print(f"\n📝 Топ-{len(selected_posts)} самых интересных постов для анализа AI:")
                for i, post in enumerate(selected_posts, 1):
                    score = self._calculate_interest_score(post)
                    print(f"   {i}. [{score:.1f}] {post['original_title'][:55]}... ({post['source_name']})")

            print(f"\n🤖 AI анализирует {len(selected_posts)} постов и выбирает наиболее интересный...")
            result = await self.ai_client.rewrite_article_from_multiple(selected_posts)

            if not result:
                print("❌ Не удалось сгенерировать пост (AI вернул None)")
                if attempt < max_attempts:
                    print("   🔄 Пробуем ещё раз...")
                    continue
                print("   💡 Возможные причины: все модели недоступны или AI вернул SKIP")
                return None, None, None, None

            selected_post, rewritten_text = result

            if not rewritten_text:
                print("❌ Не удалось переписать статью (пустой текст)")
                if attempt < max_attempts:
                    print("   🔄 Пробуем ещё раз...")
                    continue
                return None, None, None, None

            if rewritten_text.strip().upper() == "SKIP":
                print("⚠️ AI пропустил все посты (запрещённые темы)")
                if attempt < max_attempts:
                    print("   🔄 Пробуем с другими постами...")
                    continue
                print("   💡 Совет: проверь источники, возможно нужно добавить больше IT-источников")
                return None, None, None, None

            has_prohibited, reason = self._check_prohibited_content(rewritten_text)
            if has_prohibited:
                print(f"⚠️ Сгенерированный пост содержит запрещённую тему ({reason}), пробуем другой...")
                used_post_ids.add(selected_post["id"])
                db.mark_parsed_post_used(selected_post["id"])
                if attempt < max_attempts:
                    print(f"   🔄 Попытка {attempt + 1}/{max_attempts} с другими постами...")
                    continue
                print("   ❌ Достигнут лимит попыток")
                return None, None, None, None

            text_len = len(rewritten_text)
            if text_len > 1000:
                print(f"⚠️ Текст слишком длинный ({text_len} символов, нужно до 1000)")
                print("   Обрезаем до 950 символов...")
                rewritten_text = rewritten_text[:947] + "..."
            elif text_len < 500:
                print(f"⚠️ Текст слишком короткий ({text_len} символов)")
                if attempt < max_attempts:
                    print(f"   🔄 Попытка {attempt + 1}/{max_attempts}...")
                    continue

            print(f"✅ AI выбрал пост: {selected_post['original_title'][:60]}...")
            print(f"   📏 Длина текста: {len(rewritten_text)} символов")

            print("🖼️ Проверяем наличие исходного изображения для выбранного поста...")
            image_url = selected_post.get("image_url")

            if not image_url:
                print("   ⚠️ У выбранного поста нет изображения (image_url пустой), пробуем другой пост...")
                used_post_ids.add(selected_post["id"])
                db.mark_parsed_post_used(selected_post["id"])
                if attempt < max_attempts:
                    print(f"   🔄 Попытка {attempt + 1}/{max_attempts} с другими постами...")
                    continue
                print("   ❌ Достигнут лимит попыток без поста с изображением")
                return None, None, None, None

            image_data = await self.image_handler.get_image_for_article(image_url)

            if not image_data or not self.image_handler.validate_image(image_data):
                print("   ⚠️ Не удалось получить валидное изображение для поста, пробуем другой...")
                used_post_ids.add(selected_post["id"])
                db.mark_parsed_post_used(selected_post["id"])
                if attempt < max_attempts:
                    print(f"   🔄 Попытка {attempt + 1}/{max_attempts} с другими постами...")
                    continue
                print("   ❌ Достигнут лимит попыток без валидного изображения")
                return None, None, None, None

            db.mark_parsed_post_used(selected_post["id"])

            generated_id = db.save_generated_post(
                parsed_post_id=selected_post["id"],
                generated_text=rewritten_text,
                image_path=None,
            )

            return selected_post["original_title"], rewritten_text, image_data, generated_id

        return None, None, None, None

    async def generate_and_publish(self) -> bool:
        title, text, image, generated_id = await self.generate_post()

        if not text:
            return False

        if not image:
            print("   ⚠️ Не удалось получить изображение для поста, публикация отменена")
            return False

        if generated_id:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT published FROM generated_posts WHERE id = ?", (generated_id,))
            row = cursor.fetchone()
            conn.close()

            if row and row["published"]:
                print(f"   ⚠️ Этот пост уже был опубликован (ID: {generated_id}), пропускаем")
                return True

        print("📤 Публикация в Telegram...")
        print(f"   📝 Длина исходного текста: {len(text)} символов")
        print(f"   📄 Первые 200 символов: {text[:200]}...")

        if not text or len(text.strip()) == 0:
            print("   ❌ КРИТИЧЕСКАЯ ОШИБКА: Исходный текст пустой!")
            return False

        processed_text, parse_mode = self.emoji_handler.prepare_for_telegram(text)

        print(f"   📝 Длина обработанного текста: {len(processed_text)} символов")
        if parse_mode:
            print("   🎨 Используются кастомные эмодзи (HTML)")

        if not processed_text or len(processed_text.strip()) == 0:
            print("   ❌ КРИТИЧЕСКАЯ ОШИБКА: Обработанный текст пустой! Используем исходный")
            processed_text = text
            parse_mode = None

        print(f"   ✅ Финальный текст для отправки: {len(processed_text)} символов")
        print(f"   📋 Первые 150 символов финального текста: {processed_text[:150]}...")
        print(f"   🖼️ Изображение: {'есть' if image else 'нет'} ({len(image) if image else 0} байт)")

        try:
            telegram_success = await self.telegram.publish_post(processed_text, image, parse_mode)
            print(f"   📊 Результат публикации в Telegram: {'✅ успешно' if telegram_success else '❌ ошибка'}")
        except Exception as e:
            print(f"   ❌ Исключение при публикации в Telegram: {e}")
            import traceback

            print(f"   Traceback: {traceback.format_exc()}")
            telegram_success = False

        backend_success = False
        if self.backend_news:
            if not image:
                print("   ⚠️ Backend news: нет изображения, пропускаем создание новости (photo required)")
                backend_success = False
            else:
                news_title = (title or "IT новости").strip()
                news_text = (text or "").strip()
                try:
                    print("\n📰 Публикация новости в админ-панель (backend)...")
                    backend_success = await self.backend_news.create_news(news_title, news_text, image)
                    print(f"   📊 Результат публикации новости: {'✅ успешно' if backend_success else '❌ ошибка'}")
                except Exception as e:
                    print(f"   ❌ Ошибка публикации новости в backend: {e}")
                    import traceback

                    print(f"   Traceback: {traceback.format_exc()}")
                    backend_success = False

        vk_success = True
        if self.vk:
            print("\n📤 Публикация в ВКонтакте...")
            try:
                vk_text = self.emoji_handler.prepare_for_vk(text)
                print(f"   📝 Текст для VK: {len(vk_text)} символов")
                print(f"   📋 Первые 150 символов VK: {vk_text[:150]}...")
                vk_success = await self.vk.publish_post(vk_text, image)
                print(f"   📊 Результат публикации в VK: {'✅ успешно' if vk_success else '❌ ошибка'}")
            except Exception as e:
                print(f"   ❌ Исключение при публикации в VK: {e}")
                import traceback

                print(f"   Traceback: {traceback.format_exc()}")
                vk_success = False
        else:
            print("   ⚠️ VK не настроен (пропускаем)")

        instagram_success = True
        if self.instagram and self.instagram.enabled:
            print("\n📸 Публикация в Instagram...")
            try:
                instagram_success = await self.instagram.publish_post(text, image)
                print(f"   📊 Результат публикации в Instagram: {'✅ успешно' if instagram_success else '❌ ошибка'}")
            except Exception as e:
                print(f"   ❌ Исключение при публикации в Instagram: {e}")
                import traceback

                print(f"   Traceback: {traceback.format_exc()}")
                instagram_success = False
        else:
            print("   ⚠️ Instagram не настроен (пропускаем)")

        final_success = telegram_success or vk_success or instagram_success or backend_success
        print(f"\n📊 Итоговый результат: {'✅ Пост опубликован' if final_success else '❌ Пост не опубликован'}")

        if final_success and generated_id:
            db.mark_post_published(generated_id)
            print(f"   ✅ Пост помечен как опубликованный в БД (ID: {generated_id})")
        elif not final_success:
            print("   ⚠️ Пост НЕ помечен как опубликованный, т.к. публикация не удалась")

        return final_success

    async def run_once(self):
        print("\n" + "=" * 50)
        print("🚀 Запуск генерации поста")
        print("=" * 50)

        success = await self.generate_and_publish()

        if success:
            print("✅ Пост успешно создан и опубликован!")
        else:
            print("❌ Не удалось создать пост")

        stats = db.get_stats()
        print(f"\n📊 Статистика: опубликовано {stats['total_published']} постов")

        return success

    async def preview_post(self) -> Optional[str]:
        _, text, image, _ = await self.generate_post()

        if text:
            print("\n" + "=" * 50)
            print("ПРЕВЬЮ ПОСТА:")
            print("=" * 50)
            print(text)
            print("=" * 50)
            if image:
                print(f"📷 Изображение загружено ({len(image)} байт)")
            else:
                print("⚠️ Изображение не загружено")
            print("=" * 50)

        return text

    async def show_stats(self):
        stats = db.get_stats()
        print("\n" + "=" * 50)
        print("📊 СТАТИСТИКА")
        print("=" * 50)
        print(f"Всего спарсено постов: {stats['total_parsed']}")
        print(f"Неиспользованных (все): {stats['unused_parsed']}")
        print(f"Свежих неиспользованных (не старше {config.NEWS_MAX_AGE_HOURS}ч): {stats['fresh_unused']}")
        print(f"Сгенерировано постов: {stats['total_generated']}")
        print(f"Опубликовано: {stats['total_published']}")
        print("=" * 50)

        print("\n📝 Последние посты:")
        recent = db.get_recent_posts(5)
        for post in recent:
            status = "✅" if post["published"] else "⏳"
            print(f"  {status} {post['original_title'][:40]}... ({post['source_name']})")

    async def generate_lead_and_publish(self) -> bool:
        """Генерирует AI-пост о том, что Alexol ищет новые проекты, и публикует его в Telegram."""
        print("\n" + "=" * 50)
        print("🚀 Генерация промо-поста о поиске новых проектов")
        print("=" * 50)

        text = await self.ai_client.generate_lead_post()
        if not text:
            print("❌ Не удалось сгенерировать промо-пост")
            return False

        print(f"   📝 Исходный текст промо-поста: {len(text)} символов")
        print(f"   📋 Первые 200 символов: {text[:200]}...")

        processed_text, parse_mode = self.emoji_handler.prepare_for_telegram(text)

        if not processed_text or len(processed_text.strip()) == 0:
            print("   ⚠️ После обработки текст пустой, используем оригинальный")
            processed_text = text
            parse_mode = None

        # Сначала пробуем использовать фирменные баннеры (светлый/тёмный),
        # если они есть в образе; если нет —fallback к случайному tech-бэкграунду.
        image = await self.image_handler.get_brand_banner()
        if not image:
            image = await self.image_handler.get_random_tech_image()

        try:
            print("📤 Публикация промо-поста в Telegram...")
            success = await self.telegram.publish_post(processed_text, image, parse_mode)
            print(f"   📊 Результат публикации промо-поста: {'✅ успешно' if success else '❌ ошибка'}")

            if success:
                # Сохраняем промо-пост в БД как сгенерированный (без привязки к parsed_post_id).
                generated_id = db.save_generated_post(
                    parsed_post_id=None,
                    generated_text=text,
                    image_path=None,
                )
                db.mark_post_published(generated_id)
                print(f"   ✅ Промо-пост сохранён в БД и помечен как опубликованный (ID: {generated_id})")

                # Дополнительно отправляем в backend как новость, чтобы он появился на сайте.
                if self.backend_news and image:
                    try:
                        news_title = "Alexol открыт к новым проектам"
                        news_text = processed_text.strip()
                        print("\n📰 Публикация промо-поста в админ-панель (backend)...")
                        backend_success = await self.backend_news.create_news(news_title, news_text, image)
                        print(
                            f"   📊 Результат публикации промо-новости: "
                            f"{'✅ успешно' if backend_success else '❌ ошибка'}"
                        )
                    except Exception as be:
                        print(f"   ❌ Ошибка публикации промо-новости в backend: {be}")
                        import traceback

                        print(f"   Traceback: {traceback.format_exc()}")

            return success
        except Exception as e:
            print(f"   ❌ Ошибка при публикации промо-поста: {e}")
            import traceback

            print(f"   Traceback: {traceback.format_exc()}")
            return False

