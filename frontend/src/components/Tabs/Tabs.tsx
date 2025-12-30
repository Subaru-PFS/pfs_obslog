import { type ReactNode } from 'react'
import styles from './Tabs.module.scss'

interface TabsProps {
  /** アクティブなタブのインデックス */
  activeIndex: number
  /** タブ変更時のコールバック */
  onChange: (index: number) => void
  /** タブのラベル */
  tabs: string[]
  /** 子要素（TabPanel） */
  children: ReactNode
}

/**
 * タブコンポーネント
 */
export function Tabs({ activeIndex, onChange, tabs, children }: TabsProps) {
  return (
    <div className={styles.tabs}>
      <div className={styles.tabList} role="tablist">
        {tabs.map((label, index) => (
          <button
            key={label}
            className={`${styles.tab} ${index === activeIndex ? styles.active : ''}`}
            role="tab"
            aria-selected={index === activeIndex}
            onClick={() => onChange(index)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.tabPanels}>
        {children}
      </div>
    </div>
  )
}

interface TabPanelProps {
  /** アクティブかどうか */
  active: boolean
  /** 子要素 */
  children: ReactNode
}

/**
 * タブパネルコンポーネント
 */
export function TabPanel({ active, children }: TabPanelProps) {
  if (!active) return null

  return (
    <div className={styles.tabPanel} role="tabpanel">
      {children}
    </div>
  )
}
