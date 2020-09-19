import { defineComponent, onMounted } from "vue"
import { openDialog } from "/src/components/Dialog"

const MyAlert = defineComponent({
  emits: ['resolve', 'reject'],
  props: {
    nLines: { type: Number, required: true },
  },
  setup($p, { emit }) {
    return () => (
      <div>
        MyAlert
        <button onClick={() => emit('resolve', $p.nLines)}>Resolve</button>
        <button onClick={(n) => testDialog($p.nLines - 1)}>Open</button>
        <input type="text" />
        <input type="checkbox" />
        <ul>
          {[...Array($p.nLines).keys()].map(i => (
            <li>{i}</li>
          ))}
        </ul>
      </div>
    )
  }
})

const testDialog = async (n: number) => {
  const nLines = await openDialog<number>(MyAlert, { props: { nLines: n } })
  console.log({ nLines })
}

export default defineComponent({
  setup() {

    onMounted(() => {
      testDialog(10)
    })

    return () => (
      <div>
        <button onClick={() => testDialog(10)}>Test</button>
      </div>
    )
  }
})
