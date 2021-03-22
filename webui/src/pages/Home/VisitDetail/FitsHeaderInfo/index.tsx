import { createEffect, createMemo, createResource, ErrorBoundary, For, Show } from 'solid-js'
import { fetcher } from '~/api'
import { Block } from '~/components/Loading'
import { tippy } from '~/components/Tippy'
import { useLocalStorage } from '~/utils/useStorage'
import { useHomeContext } from '../../context'
import { useVisitDetailContext } from '../context'
import { FitsMeta } from '../types'
import { settings } from '../VisitInspector/styles.module.scss'
import { safeRegexpCompile } from '../../../../utils/safeRegexpCompile'
import styles from './styles.module.scss'
tippy


const nonFitsId: any = {}
const api = fetcher.path('/api/fits/visits/{visit_id}/{exposure_type}/{fits_id}/meta').method('get').create()

export function FitsHeaderInfo() {
  const { fitsId } = useVisitDetailContext()
  const { visitId } = useHomeContext()

  const [meta,] = createResource(() => fitsId() ?? nonFitsId, async id => {
    if (id === nonFitsId) {
      return
    } else {
      const { fits_id, type, visit_id } = id
      return (await api({ visit_id, fits_id, exposure_type: type }).catch(() => undefined))?.data
    }
  })

  return (
    <div class={styles.root}>
      <Block when={meta.loading || fitsId() !== undefined && fitsId()?.visit_id !== visitId()} style={{ height: '100%' }}>
        <Show when={meta()}>
          <FitsMetaViewer meta={meta()!} />
        </Show>
      </Block>
    </div>
  )
}


type FitsMetaViewerProps = {
  meta: FitsMeta
}


function FitsMetaViewer(props: FitsMetaViewerProps) {
  const [hduIndex, setHduIndex] = useLocalStorage(`/FitsHeaderInfo/hduIndex`, 0)
  const [searchKey, setSearchKey] = useLocalStorage(`/FitsHeaderInfo/searchKey`, '')
  const [searchValue, setSearchValue] = useLocalStorage(`/FitsHeaderInfo/searchValue`, '')
  const [searchComment, setSearchComment] = useLocalStorage(`/FitsHeaderInfo/searchComment`, '')

  createEffect(() => {
    if (hduIndex() >= props.meta.hdul.length) {
      setHduIndex(0)
    }
  })

  const cards = createMemo(() => {
    const keyReg = safeRegexpCompile(searchKey(), 'i')
    const valueReg = safeRegexpCompile(searchValue(), 'i')
    const commentReg = safeRegexpCompile(searchComment(), 'i')

    if (props.meta.hdul.length <= hduIndex()) {
      return []
    }

    return props.meta.hdul[hduIndex()].header.cards.filter(card =>
      keyReg.test(card[0]) &&
      valueReg.test(String(card[1])) &&
      commentReg.test(card[2])
    )
  })

  return (
    <div class={styles.root}>
      <div class={`${settings} ${styles.info}`}>
        <div class={styles.filename}>{props.meta.filename}</div>
        <div>
          <For each={props.meta.hdul}>
            {
              (_, index) => (
                <button
                  classList={{ [styles.selected]: index() === hduIndex() }}
                  onClick={() => {
                    setHduIndex(index())
                  }}
                >{index()}</button>
              )
            }
          </For>
        </div>
      </div>
      <div class={styles.scrollable}>
        <table class={styles.cards}>
          <thead>
            <tr>
              <th>
                <div>Key</div>
                <input type="search" value={searchKey()} onInput={e => setSearchKey(e.currentTarget.value)} />
              </th>
              <th>
                <div>Value</div>
                <input type="search" value={searchValue()} onInput={e => setSearchValue(e.currentTarget.value)} />
              </th>
              <th>
                <div>Comment</div>
                <input type="search" value={searchComment()} onInput={e => setSearchComment(e.currentTarget.value)} />
              </th>
            </tr>
          </thead>
          <tbody>
            <For each={cards()}>
              {card => (
                <tr>
                  <Show when={card[0] !== 'COMMENT'} fallback={
                    <>
                      <th class={styles.comment}>{card[0]}</th>
                      <td class={styles.comment} colspan={2}>{String(card[1])}</td>
                    </>
                  }>
                    <th use:tippy={{ content: card[0] }}>{card[0]}</th>
                    <td use:tippy={{ content: String(card[1]) }}>{String(card[1])}</td>
                    <td use:tippy={{ content: String(card[2]) }} class={styles.comment} >{card[2]}</td>
                  </Show>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  )
}


export function regexpEscape(pattern: string) {
  return pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}
