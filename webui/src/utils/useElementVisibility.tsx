import { createContext, createSignal, JSX, onCleanup, onMount, useContext } from 'solid-js'


type Options = {
  pollingInterval?: number
}


export function useElementVisibility(el: () => HTMLElement, options: Options = {}) {
  const context = useOverflowParent()
  const target = context?.container() ?? document.documentElement
  const [visible, setVisible] = createSignal(false)
  onMount(() => {
    const onScroll = () => {
      setVisible(isVisible(el(), target))
    }
    onScroll()
    target.addEventListener('scroll', onScroll, { passive: true })
    onCleanup(() => {
      target.removeEventListener('scroll', onScroll)
    })
  })

  if (options.pollingInterval) {
    onMount(() => {
      const interval = setInterval(() => {
        setVisible(isVisible(el(), target))
      }, options.pollingInterval)
      onCleanup(() => {
        clearInterval(interval)
      })
    })
  }

  return visible
}


// https://htmldom.dev/check-if-an-element-is-visible-in-a-scrollable-container/
function isVisible(ele: HTMLElement, container: HTMLElement) {
  const { bottom, height, top } = ele.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return top <= containerRect.top ? containerRect.top - top <= height : bottom - containerRect.bottom <= height
}


type OverflowProps = JSX.HTMLAttributes<HTMLDivElement>


export function Overflow(props: OverflowProps) {
  let container: HTMLDivElement | undefined
  return (
    <OverflowContext.Provider value={{ container: () => container! }} >
      <div ref={container} {...props} />
    </OverflowContext.Provider>
  )
}

type OverflowContextType = {
  container: () => HTMLElement
}

const OverflowContext = createContext<OverflowContextType>()

export function useOverflowParent() {
  return useContext(OverflowContext)
}
