import { Accessor, createContext, createMemo, createSignal, JSX, Show, splitProps, useContext } from "solid-js"
import { Portal } from "solid-js/web"
import { Center } from "../layout"
import styles from './styles.module.scss'


type DivProps = JSX.HTMLAttributes<HTMLDivElement>


export function Loading(props: DivProps) {
  const [local, others] = splitProps(props, ["classList"])
  return (
    <div classList={{ [styles.loader]: true, ...local.classList }} {...others} />
  )
}


function makeContext() {
  const [isLoading, start] = useLoading()
  return {
    isLoading,
    start,
  }
}


const ModalLoadingContext = createContext<ReturnType<typeof makeContext>>()


export function ModalLoadingProvider(props: { children: any }) {
  const context = makeContext()
  const { isLoading } = context
  return (
    <ModalLoadingContext.Provider value={context}>
      {props.children}
      <Show when={isLoading()}>
        <Portal>
          <div class={styles.modal}>
            <Loading />
          </div>
        </Portal>
      </Show>
    </ModalLoadingContext.Provider>
  )
}


export function useModelLoading() {
  const context = useContext(ModalLoadingContext)!
  if (context === undefined) {
    throw new Error('useModelLoading must be used within a ModalLoadingProvider')
  }
  const { start } = context
  return start
}


type UseLoadingProps = {
  showLoader?: boolean
}


export function useLoading() {
  const [count, setCount] = createSignal(0)
  const startLoading = async <T,>(cb: () => Promise<T>, options: UseLoadingProps = {}) => {
    const showLoader = options.showLoader ?? true
    if (showLoader) {
      setCount(count() + 1)
      try {
        return await cb()
      }
      finally {
        setCount(count() - 1)
      }
    } else {
      return await cb()
    }
  }
  const isLoading = createMemo(() => count() > 0)
  return [isLoading, startLoading] as [typeof isLoading, typeof startLoading]
}



export function Block(props: DivProps & { children: any, when: boolean }) {
  const [local, others] = splitProps(props, ["classList", "children", "when"])
  return (
    <div classList={{ [styles.blockWrapper]: true, ...local.classList }} {...others} >
      {local.children}
      <Show when={local.when}>
        <Center class={styles.blockLoading}><Loading /></Center>
      </Show>
    </div>
  )
}
