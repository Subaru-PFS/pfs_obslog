import { defineComponent, inject, provide } from "vue"
import MI from "~/components/MI"
import { $reactive } from "~/vue-utils/reactive"

const KEY = Symbol('folder')
const DEFAULT_LEVEL = 3

export default defineComponent({
  setup($p, { slots }) {
    const $ = $reactive({
      opened: $p.opened,
      get icon() {
        return $.opened ? 'expand_more' : 'chevron_right'
      },
      get level() {
        if ($p.level) {
          return $p.level
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
          {$p.title}
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
      default: true,
    },
    level: {
      type: Number,
    }
  },
})
