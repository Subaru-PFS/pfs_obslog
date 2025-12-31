import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLoginApiAuthLoginPostMutation } from '../../store/api/apiSlice'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import styles from './Login.module.scss'

interface LoginFormData {
  username: string
  password: string
}

/**
 * Login page
 */
export function Login() {
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<LoginFormData>()

  const [error, setError] = React.useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [login, { isLoading }] = useLoginApiAuthLoginPostMutation()

  // Focus username field on page load
  useEffect(() => {
    setFocus('username')
  }, [setFocus])

  const onSubmit = async (data: LoginFormData) => {
    setError(null)

    try {
      await login({ loginRequest: data }).unwrap()
      // Redirect to original page or home after successful login
      const from = (location.state as { from?: string })?.from || '/'
      navigate(from, { replace: true })
    } catch {
      // API error
      setError('Invalid username or password')
    }
  }

  return (
    <div className={styles.loginContainer}>
      <LoadingOverlay isLoading={isLoading} fullScreen />
      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        <h1>PFS Obslog</h1>
        {error && <div className={styles.error}>{error}</div>}
        <dl>
          <dt>STN Account:</dt>
          <dd>
            <input
              type="text"
              autoComplete="username"
              disabled={isLoading}
              {...register('username', { required: 'Username is required' })}
            />
            {errors.username && (
              <span className={styles.fieldError}>{errors.username.message}</span>
            )}
          </dd>
          <dt>Password:</dt>
          <dd>
            <input
              type="password"
              autoComplete="current-password"
              disabled={isLoading}
              {...register('password', { required: 'Password is required' })}
            />
            {errors.password && (
              <span className={styles.fieldError}>{errors.password.message}</span>
            )}
          </dd>
        </dl>
        <div className={styles.submitContainer}>
          <input type="submit" value={isLoading ? 'Logging in...' : 'Log In'} disabled={isLoading} />
        </div>
      </form>
    </div>
  )
}
