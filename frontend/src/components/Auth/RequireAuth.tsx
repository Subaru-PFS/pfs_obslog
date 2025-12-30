import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useGetStatusApiAuthStatusGetQuery } from '../../store/api/generatedApi'

interface RequireAuthProps {
  children: ReactNode
}

/**
 * 認証が必要なルートを保護するコンポーネント
 *
 * 未認証の場合はログインページにリダイレクトする。
 * リダイレクト時に現在のパスを state として渡すことで、
 * ログイン後に元のページに戻ることができる。
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const { data, isLoading, isError } = useGetStatusApiAuthStatusGetQuery()

  // 認証状態を確認中
  if (isLoading) {
    return <div>Loading...</div>
  }

  // エラーの場合または未認証の場合はログインページにリダイレクト
  if (isError || !data?.authenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}
