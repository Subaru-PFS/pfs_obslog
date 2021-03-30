import { defineComponent } from "@vue/runtime-core"

export default defineComponent({
  setup($$, { slots }) {
    return () => (
      <div style={{ flexGrow: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'auto' }}>
          {slots.default?.()}
        </div>
      </div>
    )
  }
})