// @ts-ignore
import { OpReturnType } from 'openapi-typescript-fetch'
import { createEffect, createMemo, createSignal, For, on, Show } from 'solid-js'
import { paths } from '~/api/schema'
import { Flex, FlexColumn } from '~/components/layout'
import { Block } from '~/components/Loading'
import { Cobra, FocalPlane } from "~/components/pfs/FocalPlane"
import { tippy } from '~/components/Tippy'
import { useRefresh } from '../../../utils/useRefresh'
import { useDesignContext } from '../context'
import { fiberStatusColors, targetTypeColors } from '../legend'
import styles from './styles.module.scss'
tippy


type ColorFuncName = "targetType" | "fiberStatus"
type DesignDetailType = OpReturnType<paths["/api/pfs_designs/{id_hex}"]["get"]>

const blankColor = '#555'

export function DesignDetail() {
  const { designDetail } = useDesignContext()
  const id2index = createMemo(() => makeId2IndexMap(designDetail()?.design_data.fiberId ?? []))
  const [focusedCobra, setFocusedCobra] = createSignal<Cobra>()
  const [colorFuncName, setColorFuncName] = createSignal<ColorFuncName>('targetType')

  const colorFunc = (cobra: Cobra) => {
    const f = colorFuncs[colorFuncName()]
    const index = id2index().get(cobra.fiberId)
    return index === undefined ? blankColor : f(designDetail()!, index[0])
  }

  const [refreshSignal, refresh] = useRefresh()

  createEffect(on([designDetail, colorFuncName], () => {
    refresh()
  }))

  return (
    <Block when={designDetail.loading}>
      <Flex>
        <FlexColumn>
          <FocalPlane
            size={250}
            colorFunc={colorFunc}
            onPointerEnter={setFocusedCobra}
            refreshSignal={refreshSignal}
          />
          <div>
            <select value={colorFuncName()} onChange={e => setColorFuncName(e.currentTarget.value as ColorFuncName)}>
              <option value="targetType">Target Type</option>
              <option value="fiberStatus">Fiber Status</option>
            </select>
            <Legend colorFuncName={colorFuncName()} />
          </div>
        </FlexColumn>
        <Show when={!!designDetail() && !!focusedCobra()}>
          <FiberDetail design={designDetail()!} cobra={focusedCobra()!} />
        </Show>
        <Show when={!!designDetail() && !focusedCobra()}>
          <DesignSummary design={designDetail()!} />
        </Show>
      </Flex>
    </Block>
  )
}


function makeId2IndexMap(idList: number[]) {
  const m = new Map<number, number[]>()
  idList.forEach((id, index) => {
    m.has(id) ? m.get(id)!.push(index) : m.set(id, [index])
  })
  return m
}


function FiberDetail(props: { design: DesignDetailType, cobra: Cobra }) {
  const Tr = (props2: { key: any, values: any[] }) => {
    return (
      <tr>
        <th innerHTML={props2.key} />
        <For each={props2.values}>
          {value => <td>{value}</td>}
        </For>
      </tr>
    )
  }

  const id2desingIndex = createMemo(() => makeId2IndexMap(props.design.design_data.fiberId))
  const id2photometryIndex = createMemo(() => makeId2IndexMap(props.design.photometry_data.fiberId))

  function pickDesign<T>(list: T[], filter?: (item: T) => unknown) {
    const fiberId = props.cobra!.fiberId
    const indices = id2desingIndex().get(fiberId)
    if (indices === undefined) {
      return
    }
    const raw = list[indices[0]]
    return filter?.(raw) ?? raw
  }

  function pickPhotometry<T>(list: T[], filter?: (item: T) => unknown) {
    const fiberId = props.cobra!.fiberId
    const indices = id2photometryIndex().get(fiberId)
    if (indices === undefined) {
      return []
    }
    const raws = indices.map(index => list[index])
    return filter ? raws.map(filter) : raws
  }

  return (
    <div class={styles.detailTable}>
      <details open>
        <summary>Fiber {props.cobra.fiberId}</summary>
        <table class={styles.matrixColumnar}>
          <tbody>
            <Tr key='Cobra Id' values={[props.cobra!.id]} />
            <Tr key='Fiber Id' values={[props.cobra!.fiberId]} />
            <Tr key='Module ID' values={[props.cobra!.moduleId]} />
            <Tr key='Sector ID' values={[props.cobra!.fieldId]} />
          </tbody>
        </table>
      </details>
      <details open>
        <summary>Design</summary>
        <table class={styles.matrixColumnar}>
          <tbody>
            <Tr key="catId" values={[pickDesign(props.design.design_data.catId) ?? '-']} />
            <Tr key="Tract/Patch" values={[
              (pickDesign(props.design.design_data.tract) ?? '-') + '/' +
              (pickDesign(props.design.design_data.patch) ?? '-')
            ]} />
            <Tr key="objId" values={[pickDesign(props.design.design_data.objId) ?? '-']} />
            <Tr key="&alpha;" values={[pickDesign(props.design.design_data.ra) ?? '-']} />
            <Tr key="&delta;" values={[pickDesign(props.design.design_data.dec) ?? '-']} />
            <Tr key="Target Type;" values={[pickDesign(props.design.design_data.targetType, type => targetTypeColors[type]?.name) ?? '-']} />
            <Tr key="Fiber Status" values={[pickDesign(props.design.design_data.fiberStatus, status => fiberStatusColors[status]?.name) ?? '-']} />
            <Tr key="pfiNominal" values={[pickDesign(props.design.design_data.pfiNominal, JSON.stringify) ?? '-']} />
          </tbody>
        </table>
      </details>
      <details open>
        <summary>Photometry</summary>
        <table class={styles.matrixColumnar}>
          <tbody>
            <tr>
              <Tr key='filterName' values={pickPhotometry(props.design.photometry_data.filterName)} />
              <Tr key='fiberFlux [nJy]' values={pickPhotometry(props.design.photometry_data.fiberFlux)} />
              <Tr key='fiberFluxErr [nJy]' values={pickPhotometry(props.design.photometry_data.fiberFluxErr)} />
              <Tr key='psfFlux [nJy]' values={pickPhotometry(props.design.photometry_data.psfFlux)} />
              <Tr key='psfFluxErr [nJy]' values={pickPhotometry(props.design.photometry_data.psfFluxErr)} />
              <Tr key='totalFlux [nJy]' values={pickPhotometry(props.design.photometry_data.totalFlux)} />
              <Tr key='totalFluxErr [nJy]' values={pickPhotometry(props.design.photometry_data.totalFluxErr)} />
            </tr>
          </tbody>
        </table>
      </details>
    </div >
  )
}


function DesignSummary(props: { design: DesignDetailType }) {
  const pickCard = (key: string, hduIndex: number) => {
    const value = props.design.fits_meta.hdul[hduIndex].header.cards.find(card => card[0] === key)?.[1]
    return value
  }

  const Tr = (props: { key: string, value: any }) => {
    return (
      <tr>
        <th innerHTML={props.key} />
        <td style={{ "font-family": 'monospace' }}>{props.value}</td>
      </tr>
    )
  }

  return (
    <table class={styles.matrixColumnar} style={{ "align-self": "flex-start" }}>
      <tbody>
        {/* <Tr key='File' value={props.design.fits_meta.filename} /> */}
        <Tr key='Name' value={pickCard('DSGN_NAM', 0)} />
        <Tr key='Modified' value={props.design.date_modified} />
        <Tr key="&alpha;" value={pickCard('RA', 0)} />
        <Tr key="&delta;" value={pickCard('DEC', 0)} />
        <Tr key="Position Angle" value={pickCard('POSANG', 0)} />
        <Tr key="Arms" value={pickCard('ARMS', 0)} />
      </tbody>
    </table>
  )
}


function Legend(props: { colorFuncName: ColorFuncName }) {
  const entries = () => ({
    targetType: targetTypeColors,
    fiberStatus: fiberStatusColors,
  })[props.colorFuncName]

  return (
    <div class={styles.legendEntries}>
      {entries().filter(c => !!c).map(c => {
        const { color, doc, name } = c!
        return (
          <div style={{ background: color.toString() }} use:tippy={{ content: `${name}:\n<br />${doc}`, allowHTML: true }} />
        )
      })}
    </div>
  )
}


const colorFuncs = {
  targetType(dd: DesignDetailType, index: number) {
    return targetTypeColors[dd.design_data.targetType[index]]?.color.toString() || '#000'
  },
  fiberStatus(dd: DesignDetailType, index: number) {
    return fiberStatusColors[dd.design_data.fiberStatus[index]]?.color.toString() || '#000'
  },
}
