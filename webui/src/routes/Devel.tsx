import { defineComponent, reactive } from "@vue/runtime-core"
import MonacoEditor from "~/components/MonacoEditor"
import 'highlight.js/styles/monokai.css'
// @ts-ignore
import VueMarkdownIt from "vue3-markdown-it"


export default defineComponent({
  setup() {
    const $ = reactive({
      md: '# MarkDown',
    })

    const onFileDrop = (files: FileList) => {
      console.log(files)
    }

    return () =>
      <>
        <div style={{ display: 'flex' }}>
          <div style={{ flexBasis: '50%' }}>
            <MonacoEditor
              language="markdown"
              v-model={$.md}
              onFileDrop={onFileDrop}
              style={{ height: '400px' }} />
          </div>
          <div style={{ flexBasis: '50%' }}>
            <VueMarkdownIt source={$.md} />
          </div>
        </div>
      </>
  },
})
