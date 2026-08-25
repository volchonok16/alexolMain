from telegram import Bot, InputFile
from telegram.error import TelegramError
from typing import Optional
from io import BytesIO

import config

import asyncio


class TelegramPublisher:
    _lock = asyncio.Lock()
    _sending_global = False

    def __init__(self):
        token = config.TELEGRAM_NEWS_BOT_TOKEN or config.TELEGRAM_BOT_TOKEN
        self.bot = Bot(token=token)
        self.channel_id = config.TELEGRAM_CHANNEL_ID
        self._last_sent = None
        self._sending = False

    def _clean_text(self, text: str, parse_mode: Optional[str]) -> str:
        """Очищает текст от невалидных HTML-тегов, сохраняя валидные Telegram теги"""
        if parse_mode == "HTML":
            import re

            valid_tags = [
                "b",
                "strong",
                "i",
                "em",
                "u",
                "ins",
                "s",
                "strike",
                "del",
                "code",
                "pre",
                "a",
                "tg-emoji",
            ]
            valid_pattern = "|".join(valid_tags)
            text = re.sub(rf"<(?!\/?(?:{valid_pattern})\b)[^>]+>", "", text, flags=re.IGNORECASE)
        return text

    def _plain_text(self, text: str) -> str:
        import re

        plain = re.sub(r"<[^>]+>", "", text or "")
        plain = (
            plain.replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", '"')
            .replace("&#39;", "'")
        )
        return plain.strip()

    def _is_html_parse_error(self, error: Exception) -> bool:
        message = str(error).lower()
        return any(
            token in message
            for token in (
                "can't parse entities",
                "can't find end of the entity",
                "unsupported start tag",
                "unclosed start tag",
            )
        )

    async def publish_post(
        self,
        text: str,
        image_data: Optional[bytes] = None,
        parse_mode: str = None,
    ) -> bool:
        async with TelegramPublisher._lock:
            if TelegramPublisher._sending_global:
                print("   ⚠️ ПРЕДОТВРАЩЕНО: Уже идёт отправка (глобальная блокировка), пропускаем")
                return False

            if self._sending:
                print("   ⚠️ ПРЕДОТВРАЩЕНО: Уже идёт отправка (локальная блокировка), пропускаем")
                return False

            TelegramPublisher._sending_global = True
            self._sending = True

        try:
            text = self._clean_text(text, parse_mode)

            if image_data and len(image_data) > 1000:
                print("   📊 ДИАГНОСТИКА ТЕКСТА:")
                print(f"      Исходный текст: {len(text) if text else 0} символов")
                print(f"      Текст не пустой: {bool(text and text.strip())}")

                if not text or len(text.strip()) == 0:
                    print("   ❌ КРИТИЧЕСКАЯ ОШИБКА: Текст пустой после обработки!")
                    caption = "📰 IT новости"
                else:
                    caption = text.strip()
                    if len(caption) > 1024:
                        caption = caption[:1021] + "..."
                        print(f"   ⚠️ Текст обрезан до 1024 символов (было {len(text)})")

                if not caption or len(caption.strip()) == 0:
                    print("   ❌ КРИТИЧЕСКАЯ ОШИБКА: Caption пустой! Используем дефолтный текст")
                    caption = "📰 IT новости"

                print("   📷 ОТПРАВКА: изображение + текст в ОДНОМ сообщении")
                print(f"      Изображение: {len(image_data)} байт")
                print(f"      Caption: {len(caption)} символов")
                print(f"      Parse mode: {parse_mode}")
                print(f"      Preview caption: {caption[:100]}...")

                photo = InputFile(BytesIO(image_data), filename="post_image.jpg")

                print(f"   🚀 ВЫЗОВ send_photo с caption={len(caption)} символов")
                try:
                    message = await self.bot.send_photo(
                        chat_id=self.channel_id,
                        photo=photo,
                        caption=caption,
                        parse_mode=parse_mode,
                    )
                except TelegramError as e:
                    if parse_mode and self._is_html_parse_error(e):
                        print(f"   ⚠️ Telegram не принял HTML ({e}), повторяем без разметки")
                        photo = InputFile(BytesIO(image_data), filename="post_image.jpg")
                        message = await self.bot.send_photo(
                            chat_id=self.channel_id,
                            photo=photo,
                            caption=self._plain_text(caption)[:1024] or "📰 IT новости",
                            parse_mode=None,
                        )
                    else:
                        raise

                print(f"✅ Опубликовано фото с caption (ID: {message.message_id})")
                print(f"   📌 Caption: {len(caption)} символов")

                if len(text) > 1024:
                    print(f"   ⚠️ Исходный текст был {len(text)} символов, обрезан до 1024")

                return True
            elif image_data:
                print(f"   ⚠️ Изображение слишком маленькое ({len(image_data)} байт), отправляем только текст")
                if len(text) > config.MAX_POST_LENGTH:
                    text = text[: config.MAX_POST_LENGTH - 3] + "..."
                await self.bot.send_message(
                    chat_id=self.channel_id,
                    text=text,
                    parse_mode=parse_mode,
                    disable_web_page_preview=True,
                )
                print(f"✅ Пост без изображения успешно опубликован в {self.channel_id}")
                return True
            else:
                if len(text) > config.MAX_POST_LENGTH:
                    text = text[: config.MAX_POST_LENGTH - 3] + "..."
                await self.bot.send_message(
                    chat_id=self.channel_id,
                    text=text,
                    parse_mode=parse_mode,
                    disable_web_page_preview=True,
                )
                print(f"✅ Пост успешно опубликован в {self.channel_id}")
                return True

        except TelegramError as e:
            print(f"❌ Ошибка Telegram: {e}")
            print(f"   Детали: {type(e).__name__}")
            import traceback

            print(f"   Traceback: {traceback.format_exc()}")
            return False
        except Exception as e:
            print(f"❌ Ошибка публикации: {e}")
            print(f"   Детали: {type(e).__name__}")
            import traceback

            print(f"   Traceback: {traceback.format_exc()}")
            return False
        finally:
            TelegramPublisher._sending_global = False
            self._sending = False

    async def send_test_message(self) -> bool:
        try:
            await self.bot.send_message(chat_id=self.channel_id, text="🤖 Тестовое сообщение от бота. Всё работает!")
            return True
        except Exception as e:
            print(f"Ошибка тестового сообщения: {e}")
            return False

    async def send_test_photo_with_text(
        self, test_text: str = "🧪 Тестовый пост с картинкой и текстом в одном сообщении"
    ):
        try:
            from PIL import Image
            import io

            img = Image.new("RGB", (800, 600), color="blue")
            img_bytes = io.BytesIO()
            img.save(img_bytes, format="PNG")
            img_bytes.seek(0)

            photo = InputFile(img_bytes, filename="test.png")

            print(f"🧪 ТЕСТ: Отправка фото с текстом ({len(test_text)} символов)")
            message = await self.bot.send_photo(chat_id=self.channel_id, photo=photo, caption=test_text)
            print(f"✅ ТЕСТ: Отправлено ОДНО сообщение (ID: {message.message_id})")
            return True
        except Exception as e:
            print(f"❌ Ошибка тестового фото: {e}")
            return False

    async def get_bot_info(self) -> dict:
        try:
            bot_info = await self.bot.get_me()
            return {"id": bot_info.id, "username": bot_info.username, "first_name": bot_info.first_name}
        except Exception as e:
            print(f"Ошибка получения информации о боте: {e}")
            return {}

