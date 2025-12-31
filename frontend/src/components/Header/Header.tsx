import { useLocation, useNavigate } from 'react-router-dom'
import { IconButton } from '../Icon'
import {
  useGetStatusApiAuthStatusGetQuery,
  useLogoutApiAuthLogoutPostMutation,
} from '../../store/api/enhancedApi'
import styles from './Header.module.scss'

/**
 * Application header with navigation and user info
 *
 * Provides:
 * - Logo/home link
 * - User account name display
 * - Navigation buttons (Visits, Designs)
 * - Logout button
 */
export function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: authStatus } = useGetStatusApiAuthStatusGetQuery()
  const [logout] = useLogoutApiAuthLogoutPostMutation()

  const handleLogout = async () => {
    try {
      await logout().unwrap()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const isVisitsActive = location.pathname === '/' || location.pathname.startsWith('/visits')
  const isDesignsActive = location.pathname.startsWith('/designs')

  return (
    <header className={styles.header}>
      <div className={styles.logo} onClick={() => navigate('/')}>
        PFS-OBSLOG
      </div>

      {authStatus?.authenticated && authStatus.user && (
        <div className={styles.user}>{authStatus.user.account_name}</div>
      )}

      <div className={styles.spacer} />

      <div className={styles.buttons}>
        <IconButton
          icon="camera"
          onClick={() => navigate('/')}
          disabled={isVisitsActive}
          tooltip="Visits"
        />
        <IconButton
          icon="design_services"
          onClick={() => navigate('/designs')}
          disabled={isDesignsActive}
          tooltip="PFS Designs"
        />
        <IconButton icon="logout" onClick={handleLogout} tooltip="Logout" />
      </div>
    </header>
  )
}
