import { defineComponent } from "@vue/runtime-core"
import PfsFoculPlane from '~/components/PfsFoculPlane'

export default defineComponent({
  setup() {
    const render = () => (
      <>
        <div>Devel</div>
        <PfsFoculPlane />
      </>
    )

    return render
  },
})


function range(end: number): number[] {
  const a: number[] = []
  for (let i = 0; i < end; ++i) {
    a.push(i)
  }
  return a
}
