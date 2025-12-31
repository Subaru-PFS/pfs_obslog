/**
 * Designs ページ - PFS Design Viewer
 */
import { DesignsProvider } from './DesignsContext'
import { DesignList } from './DesignList'
import { SkyViewer } from './SkyViewer'
import { DesignDetail } from './DesignDetail'
import styles from './Designs.module.scss'

export function Designs() {
  return (
    <DesignsProvider>
      <div className={styles.designsPage}>
        <DesignList />
        <div className={styles.mainArea}>
          <SkyViewer />
          <DesignDetail />
        </div>
      </div>
    </DesignsProvider>
  )
}
