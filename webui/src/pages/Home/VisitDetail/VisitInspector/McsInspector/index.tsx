import { createMemo, For, Show } from 'solid-js'
import { apiUrl } from '~/api'
import { Icon, IconButton } from '~/components/Icon'
import { Flex, GridCellGroup, JustifyEnd, TriggerReflow } from '~/components/layout'
import { LazyImage } from '~/components/LazyImage'
import { tippy } from '~/components/Tippy'
import gridStyles from '~/styles/grid.module.scss'
import { average } from '~/utils/stats'
import { Overflow } from '~/utils/useElementVisibility'
import { useLocalStorage } from '~/utils/useStorage'
import { useVisitDetailContext } from '../../context'
import { McsExposureType, VisitDetailType } from '../../types'
import { selected, settings } from '../styles.module.scss'
import styles from './styles.module.scss'

tippy


type McsInspectorProps = {
  visit: VisitDetailType
}


export function McsInspector(props: McsInspectorProps) {
  const [showPlot, setShwoPlot] = useLocalStorage('/McsInspector/showPlot', true)
  const [showRaw, setShwoRaw] = useLocalStorage('/McsInspector/showRaw', false)
  const [imageScale, setImageScale] = useLocalStorage(`/McsInspector/imageScale`, 1)
  const mcs = createMemo(() => props.visit.mcs!)
  return (
    <div class={styles.mcsInspector} >
      <div class={settings}>
        <div class={styles.summary} style={{ "grid-template-columns": 'repeat(2, auto)' }}>
          <GridCellGroup class={gridStyles.header} >
            <div use:tippy={{ content: 'Number of Exposures' }} ><Icon icon='tag' /></div>
            <div use:tippy={{ content: 'Average Exposure Time[s]' }}><Icon icon='schedule' /></div>
          </GridCellGroup>
          <GridCellGroup class={gridStyles.data}>
            <div>{mcs().exposures.length}</div>
            <div>
              {average(mcs().exposures.map(e => e.exptime).filter(t => !!t) as number[]).toFixed(2)}
            </div>
          </GridCellGroup>
        </div>
        <dl>
          <dt>Image Type</dt>
          <dd>
            <label ><input type="checkbox" checked={showPlot()} onChange={e => setShwoPlot(e.currentTarget.checked)} />Plot</label>
            <label ><input type="checkbox" checked={showRaw()} onChange={e => setShwoRaw(e.currentTarget.checked)} />Raw</label>
          </dd>
          <dt>Image Size</dt>
          <dd>
            <label ><input type="radio" name='SpsImageScale' checked={imageScale() === 0.75} onChange={e => setImageScale(Number(e.currentTarget.value))} value={0.75} />Small</label>
            <label ><input type="radio" name='SpsImageScale' checked={imageScale() === 1} onChange={e => setImageScale(Number(e.currentTarget.value))} value={1} />Medium</label>
            <label ><input type="radio" name='SpsImageScale' checked={imageScale() === 2} onChange={e => setImageScale(Number(e.currentTarget.value))} value={2} />Large</label>
          </dd>
        </dl>
      </div>

      <div style={{ "flex-grow": 1, position: 'relative' }}>
        <Overflow class={styles.exposures} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, overflow: 'auto' }}>
          <ul>
            <For each={mcs().exposures}>
              {exp => (
                <li>
                  <Exposure exposure={exp} visit={props.visit} showPlot={showPlot()} showRaw={showRaw()} scale={imageScale()} />
                </li>
              )}
            </For>
          </ul>
        </Overflow>
      </div>
    </div>
  )
}


type ExposureProps = {
  exposure: McsExposureType
  visit: VisitDetailType
  showPlot: boolean
  showRaw: boolean
  scale: number
}


function Exposure(props: ExposureProps) {
  const plotSize = {
    width: 300,
    height: 214,
  }
  const rawSize = {
    width: 332,
    height: 214,
  }

  const url = createMemo(() => {
    const visit_id = props.visit.id
    const frame_id = props.exposure.frame_id
    return {
      'raw': apiUrl('/api/fits/visits/{visit_id}/mcs/{frame_id}.png').methods('get').create({
        visit_id,
        frame_id,
        width: Math.floor(props.scale * rawSize.width),
        height: Math.floor(props.scale * rawSize.height),
      }),
      'plot': apiUrl('/api/mcs_data/{frame_id}.png').methods('get').create({
        frame_id,
        width: Math.floor(props.scale * plotSize.width),
        height: Math.floor(props.scale * plotSize.height),
      })
    } as const
  })

  let details: HTMLPreElement | undefined

  const { fitsId, setFitsId } = useVisitDetailContext()
  const fitsIdSelected = createMemo(() => {
    const id = fitsId()
    return id?.visit_id === props.visit.id && id?.type == 'mcs' && id.fits_id === props.exposure.frame_id
  })

  return (
    <TriggerReflow watch={() => props.scale} class={styles.exposure}>
      Frame ID = {props.exposure.frame_id}
      <Flex style={{ "flex-wrap": 'wrap', "align-items": 'center' }}>
        <Show when={props.showPlot}>
          <LazyImage src={url().plot} skeletonHeight={props.scale * plotSize.height} skeletonWidth={props.scale * plotSize.width} transparentBackground={true} />
        </Show>
        <Show when={props.showRaw}>
          <LazyImage src={url().raw} skeletonHeight={props.scale * rawSize.height} skeletonWidth={props.scale * rawSize.width} />
        </Show>
      </Flex>
      <JustifyEnd>
        <IconButton
          classList={{ [selected]: fitsIdSelected() }}
          icon='view_column' tippy={{ content: 'Show FITS Header' }} onClick={() => {
            setFitsId({ visit_id: props.visit.id, type: 'mcs', fits_id: props.exposure.frame_id })
          }}
        />
        <IconButton icon='file_download' tippy={{ content: 'Download Raw FITS file' }} onClick={() => {
          const url = apiUrl('/api/fits/visits/{visit_id}/mcs/{frame_id}.fits').methods('get').create({
            visit_id: props.visit.id,
            frame_id: props.exposure.frame_id,
          })
          location.href = url
        }} />
        <pre ref={details}><code>{JSON.stringify(props.exposure, null, 2)}</code></pre>
        <IconButton icon='visibility' tippy={{ content: 'Open Large Preview' }} onClick={() => {
          const url = apiUrl('/api/fits/visits/{visit_id}/mcs/{frame_id}.png').methods('get').create({
            visit_id: props.visit.id,
            frame_id: props.exposure.frame_id,
          })
          window.open(url)
        }} />
        <IconButton icon='data_object' tippy={{ content: details! }} />
      </JustifyEnd>
    </TriggerReflow>
  )
}