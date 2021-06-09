import { defineComponent, onMounted, PropType, reactive, ref } from "vue"
import { apiNoSpinner } from "~/api"
import { suffix } from "~/utils/string"
import { $reactive } from "~/vue-utils/reactive"
import MarkdownEditor from "~/components/MarkdownEditor"
import MI from "~/components/MI"


export default defineComponent({
  setup($p) {
    const $ = $reactive({
      mode: 'folded' as 'folded' | 'markdowneditor' | 'simpleeditor',
    })

    const onSubmit = async (body: string) => {
      try {
        await $p.onSubmit?.(body)
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
            <button data-tooltip="Oneline Note" onClick={() => $.mode = 'simpleeditor'}><MI icon='bolt' /></button>
            <button data-tooltip="Markdown Note" onClick={_ => $.mode = 'markdowneditor'} ><MI icon='add' /></button>
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
    const link = `./api/attachments/${res.data.path}`
    const marker = file.type.match(/image\//) ?
      `![${file.name}](${link})\n` :
      `[${file.name}](${link}?filename=${encodeURIComponent(file.name)})\n`
    insertMarker(marker)
  }
  finally {
    setProgress(undefined)
  }
}

export { onFileDrop as noteOnFileDrop }


const SimpleEditor = defineComponent({
  setup($p) {
    const inputEl = ref<HTMLInputElement>()
    const $ = reactive({
      value: '',
    })
    const onSubmit = (e: Event) => {
      e.preventDefault()
      $p.onSubmit?.($.value)
    }
    const cancel = () => {
      $p.onCancel?.()
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
