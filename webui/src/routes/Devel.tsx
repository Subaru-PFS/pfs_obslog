import { defineComponent } from "@vue/runtime-core"

function range(end: number): number[] {
  const a: number[] = []
  for (let i = 0; i < end; ++i) {
    a.push(i)
  }
  return a
}

export default defineComponent({
  setup() {
    return () => <>
      <div style={{
        height: '100%', border: 'solid 1px red',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ border: 'solid 1px green;' }}>
          header
        </div>
        <div style={{ flexGrow: 1, display: 'flex', height: 0 }}>
          <div style={{ overflow: 'auto', backgroundColor: '#333' }}>
            {range(200).map(i => <div>hello-world-{i}</div>)}
          </div>
          <div style={{ flexGrow: 1 }}></div>
        </div>
        <div style={{ border: 'solid 1px green;' }}>
          footer
        </div>
      </div>
    </>
  }
})

