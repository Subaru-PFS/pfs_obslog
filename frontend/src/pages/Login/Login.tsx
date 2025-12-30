import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLoginApiAuthLoginPostMutation } from '../../store/api/generatedApi'
import styles from './Login.module.scss'

/**
 * ログインページ
 */
export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const usernameRef = useRef<HTMLInputElement>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const [login, { isLoading }] = useLoginApiAuthLoginPostMutation()

  // ページロード時にユーザー名フィールドにフォーカス
  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await login({ loginRequest: { username, password } }).unwrap()
      // ログイン成功後、元のページまたはホームにリダイレクト
      const from = (location.state as { from?: string })?.from || '/'
      navigate(from, { replace: true })
    } catch {
      // APIエラーの場合
      setError('ユーザー名またはパスワードが正しくありません')
    }
  }

  return (
    <div className={styles.loginContainer}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1>PFS Obslog</h1>
        {error && <div className={styles.error}>{error}</div>}
        <dl>
          <dt>STN Account:</dt>
          <dd>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              ref={usernameRef}
              disabled={isLoading}
            />
          </dd>
          <dt>Password:</dt>
          <dd>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isLoading}
            />
          </dd>
        </dl>
        <div className={styles.submitContainer}>
          <input type="submit" value={isLoading ? 'ログイン中...' : 'Log In'} disabled={isLoading} />
        </div>
      </form>
    </div>
  )
}
