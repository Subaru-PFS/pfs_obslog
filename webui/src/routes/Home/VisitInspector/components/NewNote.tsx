import { defineComponent, onMounted, PropType, reactive, ref } from "vue"
import { apiNoSpinner } from "~/api"
import { suffix } from "~/utils/string"
import { $reactive } from "~/vue-utils/reactive"
import MarkdownEditor from "~/components/MarkdownEditor"
import MI from "~/components/MI"


export default defineComponent({
  setup($$) {
    const $ = $reactive({
      mode: 'folded' as 'folded' | 'markdowneditor' | 'simpleeditor',
    })

    const onSubmit = async (body: string) => {
      try {
        await $$.onSubmit?.(body)
      }
      finally {
        $.mode = 'folded'
      }
    }

    return () =>
      <>
        {$.mode === 'markdowneditor' &&
          <MarkdownEditor
            onSubmit={onSubmit}
            onFileDrop={onFileDrop}
            onCancel={() => $.mode = 'folded'}
          />
        }
        {
          $.mode === 'simpleeditor' &&
          <SimpleEditor onSubmit={onSubmit} onCancel={() => $.mode = 'folded'} />
        }
        {$.mode === 'folded' &&
          <div class="end-h">
            <button onClick={() => $.mode = 'simpleeditor'}><MI icon='bolt' title="Quick" /></button>
            <button onClick={_ => $.mode = 'markdowneditor'} ><MI icon='add' /></button>
          </div>
        }
      </>
  },
  props: {
    onSubmit: {
      type: Function as PropType<(body: string) => Promise<void>>
    },
  },
})


const onFileDrop = async (file: File, setProgress: (value?: number) => void, insertMarker: (marker: string) => void) => {
  try {
    const res = await apiNoSpinner.createAttachment(file, {
      onUploadProgress: (e: ProgressEvent) => setProgress(e.loaded / e.total),
    })
    const suf = suffix(file.name)
    const link = `./api/attachments/${res.data.id}.${suf}?filename=${encodeURIComponent(file.name)}`
    const marker = file.type.match(/image\//) ?
      `![${file.name}](${link})\n` :
      `[${file.name}](${link})\n`
    insertMarker(marker)
  }
  finally {
    setProgress(undefined)
  }
}

export { onFileDrop as noteOnFileDrop }


const SimpleEditor = defineComponent({
  setup($$) {
    const inputEl = ref<HTMLInputElement>()
    const $ = reactive({
      value: '',
    })
    const onSubmit = (e: Event) => {
      e.preventDefault()
      $$.onSubmit?.($.value)
    }
    const cancel = () => {
      $$.onCancel?.()
    }
    onMounted(() => {
      inputEl.value?.focus?.()
    })
    return () =>
      <form onSubmit={onSubmit} style={{ display: 'flex' }}>
        <input
          ref={inputEl}
          type="text"
          v-model={$.value}
          style={{ flexGrow: 1 }}
          onBlur={cancel}
        />
        <div onMousedown={e => e.preventDefault()}>
          {/* We cannot click buttons below withoutthe onMousedown above,
            because mousedown on `document` hide the buttons before click */}
          <button type="button" onClick={cancel}><MI icon='cancel' /></button>
          <button onClick={onSubmit}><MI icon='check' /></button>
        </div>
      </form >
  },
  props: {
    onSubmit: {
      type: Function as PropType<(body: string) => Promise<void>>,
    },
    onCancel: {
      type: Function as PropType<() => void>,
    },
  },
})
