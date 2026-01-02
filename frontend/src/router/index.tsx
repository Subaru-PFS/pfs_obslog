import { createHashRouter, Navigate } from 'react-router-dom'
import { Login } from '../pages/Login'
import { VisitsBrowser } from '../pages/VisitsBrowser'
import { SqlSyntaxHelp } from '../pages/SqlSyntaxHelp'
import { Designs } from '../pages/Designs'
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
        element: <Navigate to="/visits" replace />,
      },
      {
        path: 'visits',
        element: <VisitsBrowser />,
      },
      {
        path: 'visits/:visitId',
        element: <VisitsBrowser />,
      },
      {
        path: 'sql-syntax-help',
        element: <SqlSyntaxHelp />,
      },
      {
        path: 'designs',
        element: <Designs />,
      },
      {
        path: 'designs/:designId',
        element: <Designs />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/visits" replace />,
  },
])
