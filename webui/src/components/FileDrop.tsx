import { defineComponent, PropType } from "vue"

export default defineComponent({
  setup($p, { slots }) {
    return () =>
      <div
        style={{ display: 'inline' }}
        onDragover={e => {
          if (!$p.disabled) {
            e.preventDefault()
            $p.onHoverChange?.(true)
          }
        }}
        onDrop={e => {
          if (!$p.disabled) {
            e.preventDefault()
            e.stopPropagation()
            if (e.dataTransfer) {
              $p.onDrop?.(e.dataTransfer.files)
            }
          }
          $p.onHoverChange?.(false)
        }}
        onDragleave={_ => {
          $p.onHoverChange?.(false)
        }}
      >
        {slots.default?.()}
      </div >
  },
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    onHoverChange: {
      type: Function as PropType<(hover: boolean) => void>,
    },
    onDrop: {
      type: Function as PropType<(files: FileList) => void>
    },
  },
})
