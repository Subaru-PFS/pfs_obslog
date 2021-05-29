import { defineComponent, PropType, ref } from "vue"
import FileDrop from "./FileDrop"

export default defineComponent({
  setup($$, { slots }) {
    const form = ref<HTMLFormElement>()
    const onChange = (e: Event) => {
      const files: FileList = (e.target as any).files
      if (files.length > 0) {
        $$.onSelect?.(files)
      }
      form.value!.reset()
    }
    const onDrop = (files: FileList) => {
      $$.onSelect?.(files)
    }
    return () =>
      <form ref={form} style={{ display: 'inline', margin: 0, padding: 0 }} >
        <label style={{ cursor: 'pointer' }}>
          <input type="file" onChange={onChange} multiple={$$.multiple} style={{ display: 'none' }} />
          <FileDrop onDrop={onDrop}>
            {slots.default?.()}
          </FileDrop>
        </label>
      </form>
  },
  props: {
    multiple: {
      type: Boolean,
      default: false,
    },
    onSelect: {
      type: Function as PropType<(files: FileList) => void>,
    },
  },
})
