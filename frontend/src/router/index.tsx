import { createHashRouter, Navigate, Outlet } from 'react-router-dom'
import { Login } from '../pages/Login'
import { Home } from '../pages/Home'
import { RequireAuth } from '../components/Auth/RequireAuth'

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
        <Outlet />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Home />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
