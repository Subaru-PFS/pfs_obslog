import { FormEvent, memo, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { layout } from "../style/layout"

export default memo(() => {
  const usernameEl = useRef<HTMLInputElement>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    usernameEl.current?.focus()
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    navigate('/')
    // api.createSession({
    //   username,
    //   password,
    // })
  }

  const navigate = useNavigate()

  return (
    <form className={layout.hCenter} onSubmit={onSubmit}>
      <div>
        <dl>
          <dt>Username:</dt>
          <dd>
            <input ref={usernameEl} type="text" value={username} onChange={e => setUsername(e.target.value)} />
          </dd>
          <dt>Password:</dt>
          <dd>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </dd>
        </dl>
        <div className={layout.hEnd}><input type="submit" value="Login" /></div>
      </div>
    </form>
  )
})
