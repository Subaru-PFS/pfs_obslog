import { defineComponent, ref } from "vue"
import MI from "~/components/MI"
import { $reactive } from "~/vue-utils/reactive"
import { homeContext } from "./homeContext"
import style from './style.module.scss'

export default defineComponent({
  setup() {
    const searchRef = ref<HTMLInputElement>()

    const $c = homeContext.inject()

    const $ = $reactive({
      keywords: $c.$.query.searchBox,
      get isSql() {
        return $.keywords.match(/where\s/i)
      }
    })

    $c.keyboardShortcuts.add({
      '/': () => searchRef.value?.focus(),
    })

    const onSubmit = async (e: Event) => {
      e.preventDefault()
      $c.$.query.searchBox = $.keywords
      await $c.refresh()
    }

    return () =>
      <form
        class={style.SearchBox}
        onSubmit={onSubmit}
        style={{ display: 'flex', padding: '2px' }}
      >
        <MI style={{ alignSelf: 'center' }} icon="search" />
        <input
          type="text"
          ref={searchRef}
          v-model={$.keywords}
          placeholder='Search'
          style={{
            flexGrow: 1,
            borderRadius: '8px',
            padding: '2px 4px',
            margin: 0,
          }}
          class={{ sql: $.isSql }}
        />
      </form >
  }
})
