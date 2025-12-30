"""アプリケーション設定

pydantic-settingsを使用して環境変数から設定を読み込みます。
環境変数のプレフィックスは PFS_OBSLOG_ です。
"""

import secrets
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """アプリケーション設定"""

    model_config = SettingsConfigDict(
        env_prefix="PFS_OBSLOG_",
        case_sensitive=True,
    )

    # APIのルートパス（デフォルト: /obslog）
    root_path: str = "/obslog"

    # セッション用の秘密鍵
    # 本番環境では必ず環境変数 PFS_OBSLOG_session_secret_key で設定してください
    session_secret_key: str = secrets.token_hex(32)

    # セッションクッキーの設定
    session_https_only: bool = False  # 本番環境ではTrueを推奨

    # データベース接続設定
    # 開発用: postgresql://pfs@localhost:15432/opdb
    # 本番用: 環境変数 PFS_OBSLOG_database_url で設定
    database_url: str = "postgresql://pfs@localhost:15432/opdb"

    # SQLログ出力（開発用）
    database_echo: bool = False

    @property
    def api_prefix(self) -> str:
        """APIのプレフィックス（例: /obslog/api）"""
        return f"{self.root_path}/api"


@lru_cache
def get_settings() -> Settings:
    """設定を取得（キャッシュあり）"""
    return Settings()
