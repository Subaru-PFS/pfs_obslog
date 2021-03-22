import { onCleanup, onMount, Show } from "solid-js"
import Split from 'split-grid'
import { Center } from "~/components/layout"
import { requireLogin } from "~/session"
import splitStyles from '~/styles/split.module.scss'
import { HomeContext } from "./context"
import { VisitDetail } from "./VisitDetail"
import { VisitSetList } from "./VisitSetList"


export const Home = requireLogin(() => {
  let gutter: HTMLDivElement | undefined
  onMount(() => {
    const split = Split({
      columnGutters: [{
        track: 1,
        element: gutter!,
      }],
    })
    onCleanup(() => {
      split.destroy()
    })
  })

  return (
    <HomeContext>
      {({ visitId }) => (
        <div class={splitStyles.horizontalPanes} style={{ "flex-grow": 1, "grid-template-columns": '1fr 8px 1fr' }}>
          <VisitSetList />
          <div ref={gutter} class={splitStyles.horizontalGutter} />
          <Show when={visitId()} fallback={<SelectVisit />}>
            <VisitDetail id={Number(visitId()!)} />
          </Show>
        </div>
      )}
    </HomeContext>
  )
})


function SelectVisit() {
  return (
    <Center>
      <h1>Select one visit from the left list</h1>
    </Center>
  )
}