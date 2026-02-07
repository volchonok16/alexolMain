import httpx
from typing import Optional
from io import BytesIO

import config


class VKPublisher:
    def __init__(self):
        self.access_token = config.VK_ACCESS_TOKEN
        self.group_id = config.VK_GROUP_ID
        self.api_version = "5.199"
        self.base_url = "https://api.vk.com/method"

    async def _upload_photo(self, image_data: bytes) -> Optional[str]:
        """Загружает фото на сервер VK и возвращает photo_id"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/photos.getWallUploadServer",
                    params={
                        "access_token": self.access_token,
                        "group_id": abs(int(self.group_id)),
                        "v": self.api_version,
                    },
                )

                if response.status_code != 200:
                    print(f"   ❌ Ошибка получения upload URL: {response.status_code}")
                    return None

                data = response.json()
                if "error" in data:
                    print(f"   ❌ VK API ошибка: {data['error']}")
                    return None

                upload_url = data["response"]["upload_url"]

                image_bytes = BytesIO(image_data)
                files = {"photo": ("photo.jpg", image_bytes, "image/jpeg")}
                upload_response = await client.post(upload_url, files=files)

                if upload_response.status_code != 200:
                    print(f"   ❌ Ошибка загрузки фото: {upload_response.status_code}")
                    return None

                upload_data = upload_response.json()
                if "error" in upload_data:
                    print(f"   ❌ Ошибка загрузки: {upload_data['error']}")
                    return None

                save_response = await client.get(
                    f"{self.base_url}/photos.saveWallPhoto",
                    params={
                        "access_token": self.access_token,
                        "group_id": abs(int(self.group_id)),
                        "photo": upload_data["photo"],
                        "server": upload_data["server"],
                        "hash": upload_data["hash"],
                        "v": self.api_version,
                    },
                )

                if save_response.status_code != 200:
                    print(f"   ❌ Ошибка сохранения фото: {save_response.status_code}")
                    return None

                save_data = save_response.json()
                if "error" in save_data:
                    print(f"   ❌ VK API ошибка при сохранении: {save_data['error']}")
                    return None

                photo = save_data["response"][0]
                return f"photo{photo['owner_id']}_{photo['id']}"

        except Exception as e:
            print(f"   ❌ Ошибка загрузки фото в VK: {e}")
            return None

    async def publish_post(self, text: str, image_data: Optional[bytes] = None) -> bool:
        """Публикует пост в VK группу/страницу"""
        try:
            if not text or len(text.strip()) == 0:
                print("   ❌ Текст пустой")
                return False

            clean_text = text.strip()

            if len(clean_text) > 4096:
                clean_text = clean_text[:4093] + "..."
                print("   ⚠️ Текст обрезан до 4096 символов")

            params = {
                "access_token": self.access_token,
                "owner_id": f"-{abs(int(self.group_id))}",  # Отрицательное для группы
                "message": clean_text,
                "v": self.api_version,
            }

            if image_data and len(image_data) > 1000:
                print("   📷 Загрузка изображения в VK...")
                photo_id = await self._upload_photo(image_data)
                if photo_id:
                    params["attachments"] = photo_id
                    print(f"   ✅ Изображение загружено: {photo_id}")
                else:
                    print("   ⚠️ Не удалось загрузить изображение, публикуем без фото")

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.base_url}/wall.post", params=params)

                if response.status_code != 200:
                    print(f"   ❌ Ошибка публикации: HTTP {response.status_code}")
                    return False

                data = response.json()
                if "error" in data:
                    print(
                        f"   ❌ VK API ошибка: {data['error']['error_msg']} (код: {data['error']['error_code']})"
                    )
                    return False

                post_id = data["response"]["post_id"]
                print(f"   ✅ Пост успешно опубликован в VK (ID: {post_id})")
                return True

        except Exception as e:
            print(f"   ❌ Ошибка публикации в VK: {e}")
            return False

    async def test_connection(self) -> bool:
        """Проверяет подключение к VK API"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/groups.getById",
                    params={
                        "access_token": self.access_token,
                        "group_id": abs(int(self.group_id)),
                        "v": self.api_version,
                    },
                )

                if response.status_code != 200:
                    return False

                data = response.json()
                if "error" in data:
                    return False

                return True
        except Exception:
            return False

