/**
 * アプリケーション設定
 *
 * 環境変数から設定を読み込みます。
 * VITE_ROOT_PATH: APIのルートパス（デフォルト: '' 空文字列）
 */

/** APIのルートパス */
export const ROOT_PATH = import.meta.env.VITE_ROOT_PATH || ''

/** APIのベースURL（OpenAPIスキーマのパスは /api で始まるので、ここでは /api を含めない） */
export const API_BASE_URL = ROOT_PATH
