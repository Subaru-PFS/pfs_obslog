import { createHashRouter, Navigate } from 'react-router-dom'
import { Login } from '../pages/Login'
import { Home } from '../pages/Home'
import { SqlSyntaxHelp } from '../pages/SqlSyntaxHelp'
import { RequireAuth } from '../components/Auth/RequireAuth'
import { Layout } from '../components/Layout'

/**
 * ルート設定
 *
 * HashRouterを使用（URLは /#/path の形式になる）
 * 認証が必要なルートはRequireAuthでラップされている
 */
export const router = createHashRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'sql-syntax-help',
        element: <SqlSyntaxHelp />,
      },
      {
        path: 'designs',
        element: <div>Designs page (coming soon)</div>,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
