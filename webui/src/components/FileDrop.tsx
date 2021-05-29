import { defineComponent, PropType } from "vue"

export default defineComponent({
  setup($$, { slots }) {
    return () =>
      <div
        style={{ display: 'inline' }}
        onDragover={e => {
          if (!$$.disabled) {
            e.preventDefault()
            $$.onHoverChange?.(true)
          }
        }}
        onDrop={e => {
          if (!$$.disabled) {
            e.preventDefault()
            e.stopPropagation()
            if (e.dataTransfer) {
              $$.onDrop?.(e.dataTransfer.files)
            }
          }
          $$.onHoverChange?.(false)
        }}
        onDragleave={_ => {
          $$.onHoverChange?.(false)
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
