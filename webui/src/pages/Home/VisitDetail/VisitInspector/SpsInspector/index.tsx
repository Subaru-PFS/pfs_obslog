import { createMemo, For, Show } from 'solid-js'
import { apiUrl } from '~/api'
import { Icon, IconButton } from '~/components/Icon'
import { GridCellGroup, JustifyEnd, TriggerReflow } from '~/components/layout'
import { tippy } from '~/components/Tippy'
import gridStyles from '~/styles/grid.module.scss'
import { armName, decodeCameraId } from '~/utils/pfs'
import { useLocalStorage } from '~/utils/useStorage'
import { LazyImage } from '../../../../../components/LazyImage'
import { average } from '../../../../../utils/stats'
import { useVisitDetailContext } from '../../context'
import type { SpsExposureType, SpsImageType, VisitDetailType } from '../../types'
import { selected, settings } from '../styles.module.scss'
import styles from './styles.module.scss'
tippy



export function SpsInspector(props: { visit: VisitDetailType }) {
  const sps = createMemo(() => props.visit.sps!)
  const [imageType, setImageType] = useLocalStorage<SpsImageType>(`/SpsInspector/imageType`, 'raw')
  const [imageScale, setImageScale] = useLocalStorage(`/SpsInspector/imageScale`, 1)

  return (
    <div class={styles.spsInspector}>
      <div class={settings}>
        <div class={styles.summary} style={{ "grid-template-columns": 'repeat(3, 1fr)' }}>
          <GridCellGroup class={gridStyles.header}>
            <div>Type</div>
            <div use:tippy={{ content: 'Number of Exposures' }} ><Icon icon='tag' /></div>
            <div use:tippy={{ content: 'Average Exposure Time[s]' }} ><Icon icon='schedule' /></div>
          </GridCellGroup>
          <GridCellGroup class={gridStyles.data}>
            <div>{sps().exp_type}</div>
            <div>{sps().exposures.length}</div>
            <div>{average(sps().exposures.map(e => e.exptime)).toFixed(2)}</div>
          </GridCellGroup>
        </div>
        <dl>
          <dt>Image Type</dt>
          <dd>
            <label ><input type="radio" name='SpsImageType' checked={imageType() === 'raw'} onChange={e => setImageType(e.currentTarget.value as SpsImageType)} value={'raw'} />Raw</label>
            <label ><input type="radio" name='SpsImageType' checked={imageType() === 'calexp'} onChange={e => setImageType(e.currentTarget.value as SpsImageType)} value={'calexp'} />Calexp</label>
          </dd>
          <dt>Image Size</dt>
          <dd>
            <label ><input type="radio" name='SpsImageScale' checked={imageScale() === 0.5} onChange={e => setImageScale(Number(e.currentTarget.value))} value={0.5} />Small</label>
            <label ><input type="radio" name='SpsImageScale' checked={imageScale() === 1} onChange={e => setImageScale(Number(e.currentTarget.value))} value={1} />Medium</label>
            <label ><input type="radio" name='SpsImageScale' checked={imageScale() === 2} onChange={e => setImageScale(Number(e.currentTarget.value))} value={2} />Large</label>
          </dd>
        </dl>
      </div>

      <ul class={styles.exposures}>
        <For each={sps().exposures}>
          {exp => (
            <li>
              <SpsExposure exposure={exp} visit={props.visit} imageType={imageType()} scale={imageScale()} />
            </li>
          )}
        </For>
      </ul>
    </div>
  )
}


function SpsExposure(props: { exposure: SpsExposureType, visit: VisitDetailType, imageType: SpsImageType, scale: number }) {
  const height = 300
  const width = 300
  const url = createMemo(() => apiUrl('/api/fits/visits/{visit_id}/sps/{camera_id}.png').methods('get').create({
    visit_id: props.visit.id,
    camera_id: props.exposure.camera_id,
    height: props.scale * height,
    type: props.imageType,
  }))
  const { fitsId, setFitsId } = useVisitDetailContext()
  const fitsIdSelected = createMemo(() => {
    const id = fitsId()
    return id?.visit_id === props.visit.id && id?.type == 'sps' && id.fits_id === props.exposure.camera_id
  })

  return (
    <TriggerReflow class={styles.exposure} watch={() => props.scale} >
      <LazyImage src={url()} skeletonHeight={props.scale * height} skeletonWidth={props.scale * width} />
      <div class={styles.exposureTable} style={{ 'grid-template-columns': 'repeat(3, 1fr)' }}>
        <GridCellGroup class={gridStyles.header}>
          <div>ID</div>
          <div>Module</div>
          <div>Arm</div>
        </GridCellGroup>
        <GridCellGroup class={gridStyles.data}>
          <div>{props.exposure.camera_id}</div>
          <div>{decodeCameraId(props.exposure.camera_id).sm}</div>
          <div>{armName(props.exposure.camera_id)}</div>
        </GridCellGroup>
        <Show when={props.exposure.annotation.length > 0}>
          <GridCellGroup class={gridStyles.header}>
            <div style={{ 'grid-column': '1 / -1' }}>
              Annotations
            </div>
          </GridCellGroup>
          <GridCellGroup class={gridStyles.data}>
            <ul style={{ 'grid-column': '1 / -1' }}>
              <For each={props.exposure.annotation}>
                {a => a.notes}
              </For>
            </ul>
          </GridCellGroup>
        </Show>
      </div>
      <JustifyEnd>
        <IconButton
          classList={{ [selected]: fitsIdSelected() }}
          icon='view_column' tippy={{ content: 'Show FITS Header' }} onClick={() => {
            setFitsId({ visit_id: props.visit.id, type: 'sps', fits_id: props.exposure.camera_id })
          }}
        />
        <IconButton icon='file_download' tippy={{ content: 'Download Raw FITS file' }} onClick={() => {
          const url = apiUrl('/api/fits/visits/{visit_id}/sps/{camera_id}.fits').methods('get').create({
            visit_id: props.visit.id,
            camera_id: props.exposure.camera_id,
            type: 'raw',
          })
          location.href = url
        }} />
        <IconButton icon='file_download' tippy={{ content: 'Download Calexp FITS file' }} onClick={() => {
          const url = apiUrl('/api/fits/visits/{visit_id}/sps/{camera_id}.fits').methods('get').create({
            visit_id: props.visit.id,
            camera_id: props.exposure.camera_id,
            type: 'calexp',
          })
          location.href = url
        }} />
        <IconButton icon='visibility' tippy={{ content: 'Open Large Preview' }} onClick={() => {
          const url = apiUrl('/api/fits/visits/{visit_id}/sps/{camera_id}.png').methods('get').create({
            visit_id: props.visit.id,
            camera_id: props.exposure.camera_id,
            type: props.imageType,
          })
          window.open(url)
        }} />
      </JustifyEnd>
    </TriggerReflow>
  )
}
