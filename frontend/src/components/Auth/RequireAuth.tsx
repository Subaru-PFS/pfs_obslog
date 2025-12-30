import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useGetStatusApiAuthStatusGetQuery } from '../../store/api/apiSlice'
import { LoadingSpinner } from '../LoadingSpinner'

interface RequireAuthProps {
  children: ReactNode
}

/**
 * Component that protects routes requiring authentication
 *
 * Redirects to login page if not authenticated.
 * Passes current path as state so users can return to the original page after login.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const { data, isLoading, isError } = useGetStatusApiAuthStatusGetQuery()

  // Checking authentication status
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LoadingSpinner />
      </div>
    )
  }

  // Redirect to login page on error or if not authenticated
  if (isError || !data?.authenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}
