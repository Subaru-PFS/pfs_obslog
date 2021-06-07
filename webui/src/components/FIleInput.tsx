import { defineComponent, PropType, ref } from "vue"
import FileDrop from "./FileDrop"

export default defineComponent({
  setup($p, { slots }) {
    const form = ref<HTMLFormElement>()
    const onChange = (e: Event) => {
      const files: FileList = (e.target as any).files
      if (files.length > 0) {
        $p.onSelect?.(files)
      }
      form.value!.reset()
    }
    const onDrop = (files: FileList) => {
      $p.onSelect?.(files)
    }
    return () =>
      <form ref={form}>
        <label>
          <input type="file" onChange={onChange} multiple={$p.multiple} style={{ display: 'none' }} />
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
