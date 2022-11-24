import { createDebouncedMemo } from '@solid-primitives/memo'
import { angle, easing, SkyCoord } from '@stellar-globe/stellar-globe'
import { createEffect, createMemo, createSignal, For } from "solid-js"
import { apiUrl } from '~/api'
import { IconButton } from '~/components/Icon'
import { Flex, FlexColumn } from '~/components/layout'
import { Block } from '~/components/Loading'
import { tippy } from '~/components/Tippy'
import { safeRegexpCompile } from '~/utils/safeRegexpCompile'
import { useLocalStorage } from '~/utils/useStorage'
import { designCrossMatchCosine, useDesignContext } from "../context"
import { PfsDesignEntry } from "../types"
import styles from './styles.module.scss'
tippy


export function DesignList() {
  const { designs, zenithSkyCoord, focusedDesign } = useDesignContext()
  const [idFormat, setIdFormat] = useLocalStorage<'decimal' | 'hex'>('/DesignList/idFormat', 'hex')
  const [searchText, setSearchText] = createSignal('')

  const throttledZenithSkyCoord = createDebouncedMemo(() => zenithSkyCoord(), 100)

  const cosineCenter = (design: PfsDesignEntry) => {
    const { ra, dec } = design
    const center = SkyCoord.fromDeg(ra, dec)
    return throttledZenithSkyCoord().cosine(center)
  }

  const saerchRegexp = createMemo(() => safeRegexpCompile(searchText(), 'i'))

  const formattedIds = createMemo(() => new Map(
    designs.store.list.map(d => [d, formattedId(d, idFormat())])
  ))

  const filteredDesigns = createMemo(() => {
    return designs.store.list.filter(d => {
      return (
        (saerchRegexp().test(d.name) || saerchRegexp().test(formattedIds().get(d)!))
      )
    })
  })

  const designsSortedByAltitude = createMemo(() =>
    filteredDesigns().slice().sort((aEntry, bEntry) => {
      const a = cosineCenter(aEntry)
      const b = cosineCenter(bEntry)
      if (Number.isNaN(a) && Number.isNaN(b)) {
        return aEntry.id.localeCompare(bEntry.id)
      }
      if (Number.isNaN(a)) {
        return 1
      }
      if (Number.isNaN(b)) {
        return -1
      }
      return b - a
    })
  )

  const groupedDesigns = createMemo(() => {
    const groups: PfsDesignEntry[][] = []
    for (const d of designsSortedByAltitude()) {
      const g: (PfsDesignEntry[] | undefined) = groups[groups.length - 1]
      const d0 = g?.[0]
      if (d0 && SkyCoord.fromDeg(d.ra, d.dec).cosine(SkyCoord.fromDeg(d0.ra, d0.dec)) >= designCrossMatchCosine) {
        g.push(d)
      }
      else {
        groups.push([d])
      }
    }
    return groups
  })

  createEffect(() => {
    const design = focusedDesign()
    if (design) {
      document.querySelector(`[data-design-id="${design.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  })

  return (
    <FlexColumn >
      <FlexColumn class={styles.listHeader}>
        <Flex>
          <input autocomplete='off' type="search" style={{ "flex-grow": 1 }} value={searchText()} onInput={e => setSearchText(e.currentTarget.value)} />
          <IconButton icon='refresh' onClick={designs.refetch} />
        </Flex>
        <FlexColumn>
          <Flex class={styles.idFormat}>
            ID Format:&nbsp;
            <label>
              <input type="radio" checked={idFormat() === 'hex'} onChange={e => e.currentTarget.checked && setIdFormat('hex')} />
              Hex
            </label>
            <label>
              <input type="radio" checked={idFormat() === 'decimal'} onChange={e => e.currentTarget.checked && setIdFormat('decimal')} />
              Decimal
            </label>
          </Flex>
        </FlexColumn>
      </FlexColumn>
      <Block when={designs.loading} style={{ "flex-grow": 1, height: 0 }}>
        <div class={styles.list} style={{ height: '100%', "overflow-y": 'auto' }}>
          <For each={groupedDesigns()}>{
            group => (
              <div class={styles.entryGroup}>
                <For each={group}>{
                  entry => <Entry entry={entry} zenith={throttledZenithSkyCoord()} idFormat={idFormat()} />
                }
                </For>
              </div>
            )
          }</For>
        </div>
      </Block>
    </FlexColumn>
  )
}


function formattedId(e: PfsDesignEntry, idFormat: 'hex' | 'decimal') {
  return idFormat === 'hex' ? e.id : String(BigInt(`0x${e.id}`))
}


type EntryProps = {
  entry: PfsDesignEntry
  zenith: SkyCoord
  idFormat: 'hex' | 'decimal'
}


function Entry(props: EntryProps) {
  const { jumpTo, selectedDesign, setSelectedDesign, setFocusedDesign, focusedDesign } = useDesignContext()
  const selected = createMemo(() => selectedDesign() === props.entry)
  const cssClass = createMemo(() => {
    const s = selected()
    const h = focusedDesign() === props.entry
    return {
      [styles.entrySelectedHover]: s && h,
      [styles.entrySelected]: s && !h,
      [styles.entryHover]: h && !s,
    }
  })

  const goThere = () => {
    const { ra, dec } = props.entry
    const coord = SkyCoord.fromDeg(ra, dec)
    jumpTo({ fovy: angle.deg2rad(0.8) }, { coord, easingFunction: easing.slowStartStop4, duration: 1000 })
  }

  return (
    <Flex
      class={styles.entry}
      classList={cssClass()}
      onClick={() => {
        setSelectedDesign(props.entry)
        goThere()
      }}
      onMouseEnter={() => setFocusedDesign(props.entry)}
      onMouseLeave={() => setFocusedDesign(undefined)}
    >
      <Flex style={{ "flex-grow": 1, "flex-shrink": 1 }}>
        <div
          class={styles.entryInfo}
          data-design-id={props.entry.id}
        >
          <div class={styles.entryName}>{props.entry.name || '-'}</div>
          <div class={styles.entryId}>{formattedId(props.entry, props.idFormat)}</div>
          {/* <div class={styles.entryDate}> {props.entry.date_modified} </div> */}
          <div class={styles.entryDate}>
            <span use:tippy={{ content: 'Number of Science Fibers' }}>
              {props.entry.design_rows.science}
            </span> / <span use:tippy={{ content: 'Number of Sky Fibers' }}>
              {props.entry.design_rows.sky}
            </span> / <span use:tippy={{ content: 'Number of FluxSTD Fibers' }}>
              {props.entry.design_rows.fluxstd}
            </span> / <span use:tippy={{ content: 'Number of Photometries' }}>
              {props.entry.num_photometry_rows}
            </span> / <span use:tippy={{ content: 'Number of Guide Stars' }}>
              {props.entry.num_guidestar_rows}
            </span>
          </div>
          <div>
            &alpha;={Number(props.entry.ra).toFixed(2)}&deg;, &delta;={Number(props.entry.dec).toFixed(2)}&deg;,
            Alt.={(90 - props.zenith.angle(SkyCoord.fromDeg(props.entry.ra, props.entry.dec)).deg).toFixed(2)}&deg;
          </div>
        </div>
      </Flex>
      <div class={styles.entryButtons} style={{ "flex-shrink": 0 }}>
        <IconButton
          icon="download"
          tippy={{ content: "Download" }}
          onClick={(e) => {
            e.stopPropagation()
            const url = apiUrl('/api/pfs_designs/{id_hex}.fits').methods('get').create({ id_hex: props.entry.id })
            location.href = url
          }} />
        <IconButton
          icon="content_copy"
          tippy={{ content: "Copy ID to Clipboard" }}
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard.writeText(formattedId(props.entry, props.idFormat))
          }} />
      </div>
    </Flex>
  )
}
