import { For, JSX, splitProps } from 'solid-js'
import styles from './styles.module.scss'


type TabProps = {
  title: JSX.Element
  contents?: () => JSX.Element
}


type DivProps = JSX.HTMLAttributes<HTMLDivElement>


type TabsProps = {
  activeTabIndex: number
  onActiveTabIndexChange?: (index: number) => unknown
  tabs: TabProps[]
} & DivProps


export function Tabs(props: TabsProps) {
  const [local, others] = splitProps(props, ["activeTabIndex", "onActiveTabIndexChange", "tabs", "classList"])
  return (
    <div classList={{ [styles.tabs]: true, ...local.classList }} {...others}>
      <ul class={styles.tabBar}>
        <For each={local.tabs}>
          {({ title, contents }, index) => (
            <li>
              <label >
                <button
                  class={styles.title} classList={{ [styles.selected]: local.activeTabIndex == index() }} onClick={() => local.onActiveTabIndexChange?.(index())}
                  disabled={!contents}
                >
                  {title}
                </button>
              </label>
            </li>
          )}
        </For>
      </ul>
      <div class={styles.gutter} />
      <div class={styles.tabContents}>
        {local.tabs[local.activeTabIndex].contents?.()}
      </div>
    </div>
  )
}
