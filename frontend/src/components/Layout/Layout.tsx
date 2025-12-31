import { Outlet } from 'react-router-dom'
import { Header } from '../Header'
import styles from './Layout.module.scss'

/**
 * Main application layout with header and content area
 * Used for authenticated pages
 */
export function Layout() {
  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
