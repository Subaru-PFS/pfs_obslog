import { createEffect, createResource, on, onCleanup, onMount, Show, startTransition, Suspense, useTransition } from "solid-js"
import Split from 'split-grid'
import { fetcher } from '~/api'
import { Block } from '~/components/Loading'
import splitStyles from '~/styles/split.module.scss'
import { wrapSignalInTransaction } from "../../../utils/wrapSignalInTransaction"
import { useHomeContext } from '../context'
import { VisitDetailContext } from "./context"
import { FitsHeaderInfo } from './FitsHeaderInfo'
import { VisitInspector } from './VisitInspector'


type VisitDetailProps = {
  id: number
}


export function VisitDetail(props: VisitDetailProps) {
  let gutter: HTMLDivElement | undefined

  const api = fetcher.path('/api/visits/{id}').method('get').create()
  const [detail, { refetch }] = createResource(wrapSignalInTransaction(() => props.id), async id => (await api({ id })).data)
  const { refreshHomeSignal } = useHomeContext()

  createEffect(on(refreshHomeSignal, params => {
    params.detail && startTransition(refetch)
  }, { defer: true }))

  const [isLoading,] = useTransition()

  // setup split
  onMount(() => {
    const split = Split({
      rowGutters: [{
        track: 1,
        element: gutter!,
      }],
    })
    onCleanup(() => {
      split.destroy()
    })
  })

  return (
    <VisitDetailContext>
      <div class={splitStyles.verticalPanes} style={{ height: '100%', "grid-template-rows": '1fr 8px 250px' }}>
        <Block when={isLoading() || !detail()}>
          <Suspense>
            <Show when={!!detail()}>
              <VisitInspector visit={detail()!} />
            </Show>
          </Suspense>
        </Block>
        <div ref={gutter} class={splitStyles.verticalGutter} />
        <FitsHeaderInfo />
      </div>
    </VisitDetailContext>
  )
}
