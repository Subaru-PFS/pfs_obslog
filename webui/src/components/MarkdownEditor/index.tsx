import { StatusCodes } from "http-status-codes"
import { defineComponent, PropType } from "vue"
import { isAxiosError } from "~/api"
import { $reactive } from "~/vue-utils/reactive"
import MarkdownViewer from "../MarkdownViewer"
import MI from "../MI"
import MonacoEditor from "../MonacoEditor"
import { MonacoEditorInstance } from "../MonacoEditor/impl"
import style from './style.module.scss'


export default defineComponent({
  setup($p) {
    const $ = $reactive({
      preview: true,
      body: $p.body ?? '',
      progress: undefined as number | undefined,
    })
    const onFileDrop = async (files: FileList) => {
      for (const file of Array.from(files)) {
        try {
          await $p.onFileDrop?.(
            file,
            (value) => $.progress = value,
            (marker) => {
              const range = editor!.getSelection()!
              const text = marker
              const op2: Parameters<MonacoEditorInstance["executeEdits"]>[1] = [{
                text, range, forceMoveMarkers: true,
              }]
              editor!.executeEdits(null, op2)
            })
        }
        catch (e) {
          if (isAxiosError(e)) {
            switch (e.response?.status) {
              case StatusCodes.UNPROCESSABLE_ENTITY:
                alert(
                  e.response?.data?.detail ??
                  JSON.stringify(e.response.data))
                break
              case StatusCodes.REQUEST_TOO_LONG:
                alert('The file is too large')
                break
              default:
                alert(`${e.response?.statusText}: ${JSON.stringify(e.response?.data, null, 2)}`)
                break
            }
          }
        }
      }
    }
    const onSubmit = async () => {
      await $p.onSubmit?.($.body)
    }

    let editor: MonacoEditorInstance | undefined = undefined

    return () =>
      <>
        <div class={style.editing}>
          <MonacoEditor
            v-model={$.body}
            language="markdown"
            onFileDrop={$p.onFileDrop && onFileDrop}
            editorOptions={{ wordWrap: 'on', minimap: { enabled: false } }}
            style={{ height: '150px' }}
            v-slots={{
              statusline: () =>
                <div class="end-h" style={{ alignItems: 'baseline' }}>
                  <a href="https://www.markdownguide.org/basic-syntax/" target="_blank" rel="noopener">
                    Markdown Basic Syntax
                    </a>
                </div>
            }}
            progress={$.progress}
            {...{ onSetup: (ed: MonacoEditorInstance) => editor = ed } as any}
          />
          <div class="end-h" style={{ alignItems: 'baseline' }}>
            <label style={{ flexGrow: 1 }} >
              <input type="checkbox" v-model={$.preview} />
              Preview
            </label>
            <button onClick={() => $p.onCancel?.()} ><MI icon="cancel" /></button>
            <button onClick={onSubmit}><MI icon="check" /></button>
          </div>
          {$.preview &&
            <div class={style.preview}>
              <MarkdownViewer source={$.body} />
            </div>
          }
        </div>
      </>
  },
  props: {
    body: {
      type: String,
    },
    onSubmit: {
      type: Function as PropType<(body: string) => (Promise<void> | void)>,
    },
    onFileDrop: {
      type: Function as PropType<(
        file: File,
        setProgress: (value?: number) => void,
        insertMarker: (marker: string) => void,
      ) => Promise<void>>
    },
    onCancel: {
      type: Function as PropType<() => void>,
    },
  },
})
