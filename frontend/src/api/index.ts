/**
 * API設定・ヘルパー
 */

// APIのベースURL（開発環境ではViteのプロキシを使用）
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * APIエンドポイントのURLを生成
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

// RTK Query generated API re-exports
export * from "../store/api/generatedApi";
