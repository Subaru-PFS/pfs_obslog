import { defineComponent, inject, provide, Ref, ref } from "@vue/runtime-core"
import { $reactive } from "~/vue-utils/reactive"
import MI from "~/components/MI"

const KEY = Symbol('folder')
const DEFAULT_LEVEL = 3

export default defineComponent({
  setup($$, { slots }) {
    const $ = $reactive({
      opened: $$.opened,
      get icon() {
        return $.opened ? 'expand_more' : 'chevron_right'
      },
      get level() {
        if ($$.level) {
          return $$.level
        }
        return inject(KEY, DEFAULT_LEVEL)
      }
    })

    provide(KEY, Math.min($.level + 1, 6))

    const render = () => {
      const H = `h${$.level}`
      return <>
        <H>
          <button onClick={() => $.opened = !$.opened}><MI icon={$.icon} /></button>{' '}
          {$$.title}
        </H>
        {$.opened &&
          <div style={{ marginLeft: '2em' }}>
            {slots.default?.()}
          </div>
        }
      </>
    }
    return render
  },
  props: {
    title: {
      type: String,
      required: true,
    },
    opened: {
      type: Boolean,
      // default: false,
      default: true,
    },
    level: {
      type: Number,
    }
  },
})