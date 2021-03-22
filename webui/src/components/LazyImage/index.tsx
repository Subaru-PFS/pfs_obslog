import { createEffect, createSignal, Match, on, onCleanup, Switch } from 'solid-js'
import { Loading } from '~/components/Loading'
import { useElementVisibility } from '../../utils/useElementVisibility'
import { Icon, IconButton } from '../Icon'
import { Flex, FlexColumn } from '../layout'
import styles from './styles.module.scss'

type LazyImageProps = {
  src: string
  alt?: string
  skeletonWidth: number
  skeletonHeight: number
  transparentBackground?: boolean
  pollingInterval?: number
}

type State = 'standby' | 'loading' | 'ready' | 'error'

export function LazyImage(props: LazyImageProps) {
  let el: HTMLElement | undefined = undefined
  const visible = useElementVisibility(() => el!, { pollingInterval: 500 })
  const [state, setState] = createSignal<State>('standby')
  const [readyClass, setReadyClass] = createSignal(false)

  const startLoading = () => {
    setState('loading')
    const src = props.src
    const img = new Image()
    img.addEventListener('load', () => {
      props.src === src && setState('ready')
    })
    img.addEventListener('error', () => {
      props.src === src && setState('error')
    })
    img.src = src
  }

  createEffect(on(visible, visible => {
    // when the element enters in the viewport first time
    if (visible && state() === 'standby') {
      startLoading()
    }
  }))

  createEffect(on(() => props.src, () => {
    if (visible()) {
      startLoading()
    }
    else {
      setState('standby')
    }
  }))

  createEffect(on(state, state => {
    if (state === 'ready') {
      let raf: undefined | ReturnType<typeof requestAnimationFrame> = requestAnimationFrame(() => {
        raf = undefined
        setReadyClass(true)
      })
      onCleanup(() => {
        raf && cancelAnimationFrame(raf)
      })
    }
    else {
      setReadyClass(false)
    }
  }))

  const loadAsJson = async () => {
    const detail = await (await fetch(props.src)).text()
    console.warn(detail)
    alert(detail)
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(props.src)
  }

  return (
    <div ref={el} class={styles.container} style={
      {
        width: `${props.skeletonWidth}px`,
        height: `${props.skeletonHeight}px`,
        ...(state() === 'ready' && props.transparentBackground ?
          { "background-color": 'transparent' } :
          {}
        )
      }
    }>
      <Switch>
        <Match when={state() === 'standby'}>
          <Loading />
        </Match>
        <Match when={state() === 'loading'}>
          <Loading />
        </Match>
        <Match when={state() === 'ready'}>
          <img class={styles.fadeIn} src={props.src} alt={props.alt} style={{
            "max-height": `${props.skeletonHeight}px`,
            "max-width": `${props.skeletonWidth}px`,
          }} classList={{ [styles.ready]: readyClass() }} />
        </Match>
        <Match when={state() === 'error'}>
          <FlexColumn>
            <Icon size={64} icon='error' />
            <Flex style={{ "align-items": 'baseline' }}>
              <IconButton size={32} icon='refresh' onClick={startLoading} tippy={{ content: 'Reload' }} />
              <IconButton size={24} icon='manage_search' onClick={loadAsJson} tippy={{ content: 'Error Detail' }} />
              <IconButton size={24} icon='content_copy' onClick={copyUrl} tippy={{ content: 'Copy URL to Clipboard' }} />
            </Flex>
          </FlexColumn>
        </Match>
      </Switch>
    </div >
  )
}
