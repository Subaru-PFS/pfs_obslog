import { defineComponent, onBeforeUnmount, onMounted, PropType, ref, watch } from "vue"
import { CSSProperties } from "@vue/runtime-dom"
import { usePreferredDark } from "@vueuse/core"
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { RouterLink } from "vue-router"
import FileDrop from "~/components/FileDrop"
import FIleInput from "~/components/FIleInput"
import { $reactive } from "~/vue-utils/reactive"
import style from "./style.module.scss"

type MonacoEditorOptions = Parameters<typeof monaco.editor.create>[1]
export type MonacoEditorInstance = ReturnType<typeof monaco.editor.create>

// @ts-ignore
self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    return new EditorWorker()
  }
}

export default defineComponent({
  setup($p, { emit, slots }) {
    const root = ref<HTMLElement>()
    const $ = $reactive({
      dragHover: false,
      isDark: usePreferredDark(),
    })

    let editor: ReturnType<typeof monaco.editor.create> | undefined
    onMounted(() => {
      editor = monaco.editor.create(root.value as HTMLElement, {
        ...$p.editorOptions,
        ...{
          language: $p.language,
          value: $p.modelValue || '',
          theme: $.isDark ? 'vs-dark' : 'vs',
          scrollBeyondLastLine: false,
        },
      })
      editor.onDidChangeModelContent(e => {
        emit('update:modelValue', editor?.getValue())
      })
      editor.focus()
      emit('setup', editor)
    })
    onBeforeUnmount(() => {
      editor?.dispose()
      editor = undefined
    })
    watch(() => $.isDark, () => monaco.editor.setTheme($.isDark ? 'vs-dark' : 'vs'))
    const onHoverChange = (hover: boolean) => {
      $.dragHover = hover
    }
    const onFileSelect = (files: FileList) => {
      $p.onFileDrop?.(files)
    }

    return () =>
      <FileDrop onHoverChange={onHoverChange} onDrop={onFileSelect} disabled={!$p.onFileDrop}>
        <div class={style.wrapper} style={{ display: 'flex', flexDirection: 'column', ...$p.style }}>
          <div ref={root} style={{ flexGrow: 1 }}></div>
          <div class={style.statusline} style={{ display: 'flex' }}>
            {$p.onFileDrop &&
              <FIleInput onSelect={onFileSelect} style={{ flexGrow: 1 }}>
                <div style={{ position: 'relative' }}>
                  <div class={style.fileinput}>
                    Attach files by dragging &amp; dropping.
                  </div>
                  {$p.progress !== undefined &&
                    <div class={style.progress}>
                      <progress value={Number.isNaN($p.progress) ? undefined : $p.progress} />
                    </div>
                  }
                </div>
              </FIleInput>
            }
            {slots.statusline &&
              <div>{slots.statusline()}</div>
            }
          </div>
          <div class={style.hover} v-show={$.dragHover}></div>
        </div>
      </FileDrop>
  },
  props: {
    modelValue: {
      type: String,
    },
    onFileDrop: {
      type: Function as PropType<(file: FileList) => void>,
    },
    language: {
      type: String,
    },
    progress: {
      type: Number,
    },
    style: {
      type: Object as PropType<CSSProperties>,
      default: {},
    },
    editorOptions: {
      type: Object as PropType<MonacoEditorOptions>,
      default: {},
    },
  },
  emits: {
    setup(editor: MonacoEditorInstance) {
      return true
    },
    'update:modelValue'(body: string) {
      return true
    }
  },
})
