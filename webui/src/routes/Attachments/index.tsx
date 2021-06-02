import { defineComponent, PropType } from "vue"
import { api } from "~/api"
import { AttachmentEntry } from "~/api-client"
import AsyncButton from "~/components/AsyncButton"
import LazyImage from "~/components/LazyImage"
import MI from "~/components/MI"
import { router } from "~/router"
import { makeContext } from "~/vue-utils/context"
import { $reactive } from "~/vue-utils/reactive"
import style from './style.module.scss'

const attachmentsContext = makeContext('attachment', () => {
  const $ = $reactive({
    start: 1,
    count: 0,
    perPage: 1000,
    entries: [] as AttachmentEntry[],
    filter: '',
    get filterRegex() {
      return new RegExp($.filter, 'i')
    }
  })

  const refresh = async () => {
    const res = await api.attachmentList($.start, $.perPage + 1)
    $.entries = res.data.entries
    $.count = res.data.count
  }

  refresh()

  return {
    $,
    refresh,
  }
})

export default defineComponent({
  setup() {
    const $ctx = attachmentsContext.provide()

    return () =>
      <div>
        <h1>Attachments</h1>
        <div>
          <button onClick={_ => router.push('/')}>
            <MI icon="home" />
          </button>
          <AsyncButton onClick={$ctx.refresh} ><MI icon="refresh" /></AsyncButton>
          <AsyncButton
            onClick={async () => { $ctx.$.start = 1; await $ctx.refresh() }}
            disabled={$ctx.$.start === 1}
          ><MI icon="first_page" /></AsyncButton>
          <AsyncButton
            onClick={async () => { $ctx.$.start -= $ctx.$.perPage; await $ctx.refresh() }}
            disabled={$ctx.$.start === 1}
          ><MI icon="arrow_back" /></AsyncButton>
          <AsyncButton
            onClick={async () => { $ctx.$.start += $ctx.$.perPage; await $ctx.refresh() }}
            disabled={$ctx.$.entries.slice(-1)[0]?.id === 1}
          ><MI icon="arrow_forward" /></AsyncButton>
        </div>
        <div style={{ display: 'flex' }}>
          <MI icon="filter_list" />
          <input type="search" placeholder="Filter" v-model={$ctx.$.filter} style={{ flexGrow: 1 }} />
        </div>
        <table class={`compact-table ${style.mainTable}`} style={{ marginTop: '1em' }}>
          <thead>
            <th>ID</th>
            <th>Name</th>
            <th>Type</th>
            <th></th>
          </thead>
          <tbody>
            {$ctx.$.entries
              .filter(e => e.name.match($ctx.$.filterRegex) || e.media_type.match($ctx.$.filterRegex))
              .map(e => <EntryComponent entry={e} />)}
          </tbody>
        </table>
      </div>
  },
})

const EntryComponent = defineComponent({
  setup($$) {
    const $c = attachmentsContext.inject()

    const $ = $reactive({
      get link() {
        return `./api/attachments/${$$.entry.path}`
      },
    })

    const deleteFile = async () => {
      if (confirm('Are you sure to delete this file?')) {
        await api.deleteAttachment($$.entry.id)
        await $c.refresh()
      }
    }

    return () =>
      <tr>
        <td>{$$.entry.id}</td>
        <td>{$$.entry.name}</td>
        <td>{$$.entry.media_type}</td>
        <td>
          {$$.entry.media_type.match(/^image\//) && $$.entry.exists &&
            <>
              <img src={$.link} />
            </>
          }
          <>
            {$$.entry.exists ?
              <>
                <button onClick={deleteFile} ><MI icon="delete_forever" /></button>
                <button onClick={() => location.href = $.link} ><MI icon="download" /></button>
              </>
              :
              <div class={style.deleted}>Deleted</div>
            }
          </>
        </td>
      </tr>
  },
  props: {
    entry: {
      type: Object as PropType<AttachmentEntry>,
      required: true,
    }
  },
})
