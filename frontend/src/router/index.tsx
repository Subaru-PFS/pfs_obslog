import { createHashRouter, Navigate, Outlet } from 'react-router-dom'
import App from '../App'
import { Login } from '../pages/Login'
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
        element: <App />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
