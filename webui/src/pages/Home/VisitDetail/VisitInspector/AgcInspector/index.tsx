import { createEffect, createMemo, createSignal, For, Index, on, Show } from 'solid-js'
import { apiUrl } from '~/api'
import { Icon, IconButton } from '~/components/Icon'
import { Flex, FlexColumn, GridCellGroup, JustifyEnd, TriggerReflow } from '~/components/layout'
import { LazyImage } from '~/components/LazyImage'
import { tippy } from '~/components/Tippy'
import gridStyles from '~/styles/grid.module.scss'
import { range } from '~/utils/range'
import { average } from '~/utils/stats'
import { Overflow } from '~/utils/useElementVisibility'
import { useLocalStorage } from '~/utils/useStorage'
import { useVisitDetailContext } from '../../context'
import { AgcExposureType, VisitDetailType } from "../../types"
import { selected, settings } from '../styles.module.scss'
import styles from './styles.module.scss'
tippy


type AgcInspectorProps = {
  visit: VisitDetailType
}

export function AgcInspector(props: AgcInspectorProps) {
  const agc = createMemo(() => props.visit.agc!)
  const perPage = 20
  const [page, setPage] = createSignal(0)
  const pagedExposures = createMemo(() => agc().exposures.slice(page() * perPage, (page() + 1) * perPage))
  const [imageScale, setImageScale] = useLocalStorage(`/AgcInspector/imageScale`, 1)
  const scales = [0.5, 0.67, 1]
  let scrollElement: HTMLDivElement | undefined

  createEffect(on(page, _ => {
    scrollElement?.scrollTo({ top: 0, left: 0 })
  }))

  return (
    <FlexColumn style={{ height: '100%' }}>
      <div class={settings}>
        <div class={styles.summary} style={{ "grid-template-columns": 'repeat(2, 1fr)' }}>
          <GridCellGroup class={gridStyles.header} >
            <div use:tippy={{ content: 'Number of Exposures' }} ><Icon icon='tag' /></div>
            <div use:tippy={{ content: 'Average Exposure Time[s]' }}><Icon icon='schedule' /></div>
          </GridCellGroup>
          <GridCellGroup class={gridStyles.data}>
            <div>{agc().exposures.length}</div>
            <div>
              {average(agc().exposures.map(e => e.exptime).filter(t => !!t) as number[]).toFixed(2)}
            </div>
          </GridCellGroup>
        </div>
        <dl>
          <dd>
            <label ><input type="radio" name='AgcImageScale' checked={imageScale() === scales[0]} onChange={e => setImageScale(Number(e.currentTarget.value))} value={scales[0]} />Small</label>
            <label ><input type="radio" name='AgcImageScale' checked={imageScale() === scales[1]} onChange={e => setImageScale(Number(e.currentTarget.value))} value={scales[1]} />Medium</label>
            <label ><input type="radio" name='AgcImageScale' checked={imageScale() === scales[2]} onChange={e => setImageScale(Number(e.currentTarget.value))} value={scales[2]} />Large</label>
          </dd>
        </dl>
      </div>
      <Flex style={{ "flex-grow": 1 }}>
        <Show when={agc().exposures.length >= perPage}>
          <TriggerReflow watch={() => props.visit}>
            <select class={styles.pageList} size={2} value={String(page())} onChange={(e) => setPage(Number(e.currentTarget.value))}>
              <Index each={range(Math.floor((agc().exposures.length - 1) / perPage) + 1)}>
                {pageIndex => (
                  <option
                    value={String(pageIndex())}
                  >
                    {pageIndex() * perPage + 1} &#x2013; {Math.min(agc().exposures.length, (pageIndex() + 1) * perPage)}
                  </option>
                )}
              </Index>
            </select>
          </TriggerReflow>
        </Show>
        <div style={{ position: 'relative', "flex-grow": 1 }}>
          <Overflow capture={el => scrollElement = el} class={styles.exposures} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
            <ul>
              <For each={pagedExposures()}>
                {exp => (
                  <li>
                    <Exposure exposure={exp} visit={props.visit} scale={imageScale()} />
                  </li>
                )}
              </For>
            </ul>
          </Overflow>
        </div>
      </Flex>
    </FlexColumn >
  )
}


type ExposureProps = {
  exposure: AgcExposureType
  visit: VisitDetailType
  scale: number
}


function Exposure(props: ExposureProps) {
  let details: HTMLPreElement | undefined
  const { fitsId, setFitsId } = useVisitDetailContext()
  const fitsIdSelected = createMemo(() => {
    const id = fitsId()
    return id?.visit_id === props.visit.id && id?.type == 'agc' && id.fits_id === props.exposure.id
  })
  return (
    <div class={styles.exposure}>
      <div>Exposure ID = {props.exposure.id}</div>
      <div class={styles.cameras}>
        <Index each={range(6)}>
          {index => (
            <Camera
              hduIndex={index() + 1}
              exposure={props.exposure}
              visit={props.visit}
              scale={props.scale}
            />
          )}
        </Index>
        <JustifyEnd style={{ "flex-basis": '100%' }}>
          <IconButton
            classList={{ [selected]: fitsIdSelected() }}
            icon='view_column' tippy={{ content: 'Show FITS Header' }} onClick={() => {
              setFitsId({ visit_id: props.visit.id, type: 'agc', fits_id: props.exposure.id })
            }}
          />
          <IconButton icon='file_download' tippy={{ content: 'Download Raw FITS file' }} onClick={() => {
            const url = apiUrl('/api/fits/visits/{visit_id}/agc/{exposure_id}.fits').methods('get').create({
              visit_id: props.visit.id,
              exposure_id: props.exposure.id,
            })
            location.href = url
          }} />
          <pre ref={details}><code>{JSON.stringify(props.exposure, null, 2)}</code></pre>
          <IconButton icon='data_object' tippy={{ content: details! }} />
        </JustifyEnd>
      </div>
    </div>
  )
}


type CameraProps = {
  visit: VisitDetailType
  exposure: AgcExposureType
  hduIndex: number
  scale: number
}


function Camera(props: CameraProps) {
  const width = 358
  const height = 345

  const url = createMemo(() => apiUrl('/api/fits/visits/{visit_id}/agc/{exposure_id}-{hdu_index}.png').methods('get').create({
    visit_id: props.visit.id,
    exposure_id: props.exposure.id,
    hdu_index: props.hduIndex,
    width: Math.floor(props.scale * width),
    height: Math.floor(props.scale * height),
  }))
  const largeImageUrl = apiUrl('/api/fits/visits/{visit_id}/agc/{exposure_id}-{hdu_index}.png').methods('get').create({
    visit_id: props.visit.id,
    exposure_id: props.exposure.id,
    hdu_index: props.hduIndex,
  })
  return (
    <div class={styles.camera} >
      <LazyImage
        src={url()}
        skeletonHeight={props.scale * height}
        skeletonWidth={props.scale * width}
      />
      <a target="_blank" rel="noopener noreferrer" href={largeImageUrl}>[{props.hduIndex}]</a>
    </div>
  )
}
