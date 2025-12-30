import { type ReactNode } from 'react'
import styles from './Tabs.module.scss'

export interface TabItem {
  /** タブのラベル */
  label: string
  /** タブが無効かどうか */
  disabled?: boolean
}

interface TabsProps {
  /** アクティブなタブのインデックス */
  activeIndex: number
  /** タブ変更時のコールバック */
  onChange: (index: number) => void
  /** タブ情報の配列 */
  tabs: (string | TabItem)[]
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
        {tabs.map((tab, index) => {
          const label = typeof tab === 'string' ? tab : tab.label
          const disabled = typeof tab === 'string' ? false : (tab.disabled ?? false)
          return (
            <button
              key={label}
              className={`${styles.tab} ${index === activeIndex ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
              role="tab"
              aria-selected={index === activeIndex}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => !disabled && onChange(index)}
            >
              {label}
            </button>
          )
        })}
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
