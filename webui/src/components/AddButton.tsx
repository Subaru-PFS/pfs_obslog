import { defineComponent, nextTick, PropType, reactive, ref } from "vue"
import { MI } from "~/components/MaterialIcon"


const AddButton = defineComponent({
  setup($$) {
    const $ = reactive({
      value: '',
      opened: false,
    })
    const open = () => {
      $.value = ''
      $.opened = true
      nextTick(() => inputEl.value?.focus())
    }
    const cancel = () => {
      $.opened = false
    }
    const submit = async (e: Event) => {
      e.preventDefault()
      if ($.value.length > 0 || $$.allowEmptry) {
        await $$.onSubmit($.value)
      }
      $.opened = false
    }
    const inputEl = ref<HTMLInputElement | null>(null)
    return () => <>
      <form style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {$.opened &&
          <input
            ref={inputEl}
            type="text"
            v-model={$.value}
            style={{ flexGrow: 1 }}
            onBlur={cancel}
          />
        }
        {$.opened ?
          <div onMousedown={e => e.preventDefault()}>
            {/* We cannot click buttons below withoutthe onMousedown above,
                because mousedown on `document` hide the buttons before click */}
            <button type="button" onClick={cancel}>{MI('cancel')}</button>
            <button onClick={submit}>{MI('check')}</button>
          </div>
          :
          <button onClick={open}>{MI('add')}</button>
        }
      </form>
    </>
  },
  props: {
    onSubmit: {
      type: Function as PropType<(value: string) => (void | Promise<void>)>,
      required: true,
    },
    allowEmptry: {
      type: Boolean,
      default: false,
    }
  }
})


export default AddButton