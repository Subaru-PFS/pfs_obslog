import { memo } from "react"
import { useNavigate } from "react-router-dom"

export default memo(() => {
  const navigate = useNavigate()

  return (
    <button onClick={_ => navigate('/login')}>Logout</button>
  )
})
