import aiohttp
import random
import urllib.parse
import asyncio
from typing import Optional

import config


class ImageHandler:
    def __init__(self):
        self.pexels_api = "https://api.pexels.com/v1/search"
        self.pexels_key = None
        self.picsum_base = "https://picsum.photos"
        self.loremflickr_base = "https://loremflickr.com"

    async def download_image(self, url: str) -> Optional[bytes]:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                    if response.status == 200:
                        content_type = response.headers.get("Content-Type", "")
                        if "image" in content_type:
                            return await response.read()
        except asyncio.CancelledError:
            print(f"   ⚠️ Загрузка изображения прервана: {url[:50]}...")
            return None
        except asyncio.TimeoutError:
            print(f"   ⚠️ Таймаут загрузки изображения: {url[:50]}...")
            return None
        except Exception as e:
            print(f"   ⚠️ Ошибка загрузки изображения {url[:50]}...: {type(e).__name__}")
        return None

    async def get_pixabay_image(self, query: str) -> Optional[bytes]:
        try:
            query_encoded = urllib.parse.quote(query)
            url = (
                "https://pixabay.com/api/?key=9656065-a4094594c34c9b8b4e7b4e4e4"
                f"&q={query_encoded}&image_type=photo&category=computer&safesearch=true&per_page=3"
            )

            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as response:
                    if response.status == 200:
                        data = await response.json()
                        hits = data.get("hits", [])
                        if hits:
                            image_url = hits[0].get("largeImageURL") or hits[0].get("webformatURL")
                            if image_url:
                                image = await self.download_image(image_url)
                                if image and self.validate_image(image):
                                    return image
        except (asyncio.CancelledError, asyncio.TimeoutError):
            return None
        except Exception:
            pass

        return None

    async def get_unsplash_image(self, query: str, width: int = 1200, height: int = 800) -> Optional[bytes]:
        image = await self.get_pixabay_image(query)
        if image:
            print("   ✅ Изображение найдено через Pixabay")
            return image

        query_clean = query.lower().strip().replace(" ", "-")

        try:
            async with aiohttp.ClientSession() as session:
                search_url = f"https://unsplash.com/s/photos/{query_clean}"
                async with session.get(
                    search_url,
                    timeout=aiohttp.ClientTimeout(total=15),
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
                ) as response:
                    if response.status == 200:
                        html = await response.text()
                        import re

                        img_pattern = r"https://images\.unsplash\.com/[^\"\s<>?]+"
                        matches = re.findall(img_pattern, html)
                        if matches:
                            img_url = (
                                matches[0].split("?")[0]
                                + f"?w={width}&h={height}&fit=crop&q=80&auto=format"
                            )
                            image = await self.download_image(img_url)
                            if image and self.validate_image(image):
                                print("   ✅ Изображение найдено через Unsplash")
                                return image
        except asyncio.CancelledError:
            print("   ⚠️ Поиск изображения прерван (Unsplash)")
            return None
        except asyncio.TimeoutError:
            print("   ⚠️ Таймаут поиска изображения (Unsplash)")
            return None
        except Exception:
            pass

        return None

    async def get_loremflickr_image(self, query: str, width: int = 1200, height: int = 800) -> Optional[bytes]:
        try:
            query_formatted = query.replace(" ", ",")
            url = f"{self.loremflickr_base}/{width}/{height}/{query_formatted}"
            return await self.download_image(url)
        except asyncio.CancelledError:
            return None
        except Exception:
            return None

    async def get_random_tech_image(self, width: int = 1200, height: int = 800) -> Optional[bytes]:
        try:
            keyword = random.choice(config.IMAGE_SEARCH_KEYWORDS)
            image = await self.get_unsplash_image(keyword, width, height)
            if image:
                return image
            return await self.get_loremflickr_image(keyword, width, height)
        except (asyncio.CancelledError, asyncio.TimeoutError, Exception):
            return None

    def _generate_query_variants(self, query: str) -> list[str]:
        variants = [query]

        words = query.lower().split()

        if len(words) > 2:
            variants.append(" ".join(words[:2]))
        if len(words) > 1:
            variants.append(words[0])

        tech_synonyms = {
            "ai": "artificial intelligence",
            "processor": "computer chip",
            "chip": "computer processor",
            "code": "programming",
            "server": "data center",
            "network": "technology",
            "security": "cybersecurity",
            "phone": "smartphone",
            "computer": "technology",
            "privacy": "cybersecurity",
            "encryption": "digital security",
            "linux": "computer",
            "wine": "computer software",
            "virtual": "technology",
        }

        for word in words:
            if word in tech_synonyms:
                variants.append(tech_synonyms[word])

        return list(dict.fromkeys(variants[:4]))

    async def get_image_for_article(
        self, article_image_url: Optional[str], search_query: Optional[str] = None
    ) -> Optional[bytes]:
        try:
            if article_image_url:
                print(f"   📥 Загрузка изображения из статьи: {article_image_url[:50]}...")
                image = await self.download_image(article_image_url)
                if image and self.validate_image(image):
                    print("   ✅ Использовано изображение из статьи")
                    return image
                else:
                    print("   ❌ Изображение из статьи не валидно или не загрузилось")

            if search_query:
                print(f"   🔍 Поиск изображения по запросу: '{search_query}'")
                query_variants = self._generate_query_variants(search_query)
                print(f"   📋 Варианты запросов ({len(query_variants)}): {query_variants}")

                for variant in query_variants[:2]:
                    try:
                        image = await self.get_pixabay_image(variant)
                        if image and self.validate_image(image):
                            print(f"   ✅ Найдено через Pixabay: '{variant}'")
                            return image
                    except (asyncio.CancelledError, asyncio.TimeoutError):
                        continue
                    except Exception:
                        continue

                for variant in query_variants[:2]:
                    try:
                        image = await self.get_unsplash_image(variant)
                        if image and self.validate_image(image):
                            print(f"   ✅ Найдено через Unsplash: '{variant}'")
                            return image
                    except (asyncio.CancelledError, asyncio.TimeoutError):
                        continue
                    except Exception:
                        continue

                try:
                    image = await self.get_loremflickr_image(search_query)
                    if image and self.validate_image(image):
                        print(f"   ✅ Найдено через LoremFlickr: '{search_query}'")
                        return image
                except (asyncio.CancelledError, asyncio.TimeoutError):
                    pass
                except Exception:
                    pass
            else:
                print("   ⚠️ Запрос для поиска не указан")

            print("   ⚠️ Не найдено по запросу, используем случайное IT-изображение")
            fallback_keyword = random.choice(["technology", "computer chip", "programming", "server"])
            print(f"   🎲 Fallback: '{fallback_keyword}'")
            try:
                return await self.get_unsplash_image(fallback_keyword)
            except (asyncio.CancelledError, asyncio.TimeoutError, Exception):
                print("   ❌ Fallback также не сработал, возвращаем None")
                return None
        except asyncio.CancelledError:
            print("   ⚠️ Поиск изображения прерван")
            return None
        except Exception as e:
            print(f"   ⚠️ Ошибка при поиске изображения: {type(e).__name__}")
            return None

    def validate_image(self, image_data: bytes) -> bool:
        if len(image_data) < 1000:
            return False

        jpeg_signature = b"\xff\xd8\xff"
        png_signature = b"\x89PNG\r\n\x1a\n"
        gif_signature = b"GIF"
        webp_signature = b"RIFF"

        return (
            image_data.startswith(jpeg_signature)
            or image_data.startswith(png_signature)
            or image_data.startswith(gif_signature)
            or image_data[:4] == webp_signature
        )

