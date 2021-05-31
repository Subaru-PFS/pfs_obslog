import { defineComponent, PropType } from "vue"
import MarkdownEditor from "~/components/MarkdownEditor"
import MarkdownViewer from "~/components/MarkdownViewer"
import MI from "~/components/MI"
import { $g, User } from "~/global"
import { $reactive } from "~/vue-utils/reactive"
import { noteOnFileDrop } from './NewNote'


export default defineComponent({
  setup($$) {
    const $ = $reactive({
      editing: false,
      get disabled() {
        return $g.session?.user.id !== $$.user.id
      }
    })

    const onSubmit = async (body: string) => {
      try {
        await $$.onSubmit?.(body)
      }
      finally {
        $.editing = false
      }
    }

    return () =>
      $.editing ?
        <MarkdownEditor
          onSubmit={onSubmit}
          onFileDrop={noteOnFileDrop}
          onCancel={() => $.editing = false}
          body={$$.body}
        />
        :
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <MarkdownViewer style={{ flexGrow: 1 }} source={$$.body} />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div class="username">{$$.user.account_name}</div>
            <button
              onClick={_ => $.editing = true}
              disabled={$.disabled}
            > <MI icon='edit' /></button>
            <button
              onClick={_ => $$.onDelete?.()}
              disabled={$.disabled}
            > <MI icon='delete_forever' /></button>
          </div>
        </div>
  },
  props: {
    body: {
      type: String,
      required: true,
    },
    user: {
      type: Object as PropType<User>,
      required: true,
    },
    onSubmit: {
      type: Function as PropType<(body: string) => Promise<void>>,
      required: true,
    },
    onDelete: {
      type: Function as PropType<() => Promise<void>>,
    },
  },
})
