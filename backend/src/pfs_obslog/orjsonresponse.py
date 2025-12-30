"""ORJSONResponseクラス

orjsonを使用したJSONレスポンス。
標準のjsonモジュールと異なり、NaN/Infinityを適切に処理できる。
"""

from typing import Any

import orjson
from fastapi.responses import JSONResponse


class ORJSONResponse(JSONResponse):
    """orjsonを使用したJSONResponse

    orjsonは以下の利点がある:
    - NaN, Infinity を null に変換（標準jsonはエラーになる）
    - より高速なシリアライズ
    - datetimeなどの型のネイティブサポート
    """

    media_type = "application/json"

    def render(self, content: Any) -> bytes:
        return orjson.dumps(content)
