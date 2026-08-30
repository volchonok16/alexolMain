from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://mailuser:mailpass@mail_postgres:5432/maildb"
    
    # MinIO
    # Hostname must be DNS-valid: MinIO rejects Host headers with underscores.
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "avatars"
    MINIO_SECURE: bool = False
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # SMTP Settings (для приёма писем)
    SMTP_HOST: str = "0.0.0.0"
    SMTP_PORT: int = 25
    SMTP_SUBMISSION_PORT: int = 587
    SMTP_SSL_PORT: int = 465
    # TLS для порта 587 (Submission). Если не заданы - генерируется self-signed для разработки.
    SMTP_TLS_CERT_FILE: Optional[str] = None  # путь к cert.pem
    SMTP_TLS_KEY_FILE: Optional[str] = None  # путь к key.pem
    # Sync DB URL для SMTP-auth (порт 587). Если не задан - из DATABASE_URL (postgresql вместо asyncpg).
    DATABASE_URL_SYNC: Optional[str] = None
    
    # SMTP Relay (для отправки на внешние адреса)
    SMTP_RELAY_ENABLED: bool = False
    SMTP_RELAY_HOST: Optional[str] = None  # например: smtp.sendgrid.net
    SMTP_RELAY_PORT: int = 587
    SMTP_RELAY_USER: Optional[str] = None
    SMTP_RELAY_PASSWORD: Optional[str] = None
    SMTP_RELAY_USE_TLS: bool = True
    # Использовать SendGrid HTTP API вместо SMTP (порт 443, не блокируется на сервере)
    SENDGRID_USE_API: bool = True
    
    # IMAP Settings
    IMAP_HOST: str = "0.0.0.0"
    IMAP_PORT: int = 143
    IMAP_SSL_PORT: int = 993

    # LDAP (Outlook Address Book / Check Names)
    LDAP_HOST: str = "0.0.0.0"
    LDAP_PORT: int = 389
    LDAP_SSL_PORT: int = 636
    
    # Domain
    MAIL_DOMAIN: str = "alexol.io"
    # Hostname advertised in SMTP/IMAP banners (обычно mail.MAIL_DOMAIN)
    MAIL_HOSTNAME: Optional[str] = None

    @property
    def smtp_hostname(self) -> str:
        return self.MAIL_HOSTNAME or f"mail.{self.MAIL_DOMAIN}"

    # DKIM (own signing; TXT at {selector}._domainkey.{MAIL_DOMAIN})
    DKIM_ENABLED: bool = True
    DKIM_SELECTOR: str = "default"
    # Path inside container, e.g. /etc/dkim/private.pem
    DKIM_PRIVATE_KEY_PATH: Optional[str] = "/etc/dkim/private.pem"
    # Or paste PEM in env (use \n for newlines). Path takes precedence if file exists.
    DKIM_PRIVATE_KEY: Optional[str] = None
    
    # Default Admin
    DEFAULT_ADMIN_EMAIL: str = "admin@alexol.io"
    DEFAULT_ADMIN_PASSWORD: str = "Gord078134Alexol!9256"

    # Sync with alexolMain admin (X-Mail-Sync-Key) + SSO ticket signing
    MAIL_SYNC_SECRET: Optional[str] = None

    # alexolMain backend URL for reverse sync (mail → admin users)
    # Docker: http://alexol_backend:3000  (shared network alexol_mail_sync)
    ALEXOL_API_URL: Optional[str] = None

    # Public base URL of mail web/API (avatars in outbound HTML / Unavatar fallbacks)
    MAIL_PUBLIC_URL: str = "https://mail.alexol.io"

    # Jitsi Meet (calendar join links + optional JWT identity)
    JITSI_PUBLIC_URL: str = "https://meet.alexol.io"
    JITSI_JWT_APP_ID: str = "alexol"
    JITSI_JWT_APP_SECRET: Optional[str] = None

    # Site admin panel URL (for UI redirects / docs)
    ADMIN_PUBLIC_URL: str = "https://admin.alexol.io"
    
    class Config:
        env_file = ".env"

settings = Settings()

