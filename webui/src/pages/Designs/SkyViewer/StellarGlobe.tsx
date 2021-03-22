import { ConstellationLayer, dateUtils, Globe, GridLayer, HipparcosCatalogLayer, hips, matrixUtils } from '@stellar-globe/stellar-globe'
import { Accessor, createContext, createEffect, createMemo, JSX, onMount, useContext } from 'solid-js'
import { assertNotNull } from '~/utils/assertNotNull'


type StellarGlobeProps = {
  style?: JSX.CSSProperties,
  location: { lat: number, lon: number },
  date: Date,
  viewOptions?: NonNullable<ConstructorParameters<typeof Globe>[1]>["viewOptions"],
  children?: any
  ref?: (getGLobe: () => Globe) => unknown
}


const Context = createContext<{ globe: Accessor<Globe> }>()


export function StellarGlobe(props: StellarGlobeProps) {
  let root: HTMLDivElement | undefined
  let globeRef: Globe

  const getGlobe = () => globeRef
  props.ref?.(getGlobe)

  const tilt = Math.PI / 2

  onMount(() => {
    const globe = new Globe(root!, { viewOptions: { ...(props.viewOptions ?? {}), ...tiltedZenith() } })
    globeRef = globe
    // const baseUrl = '//alasky.cds.unistra.fr/DSS/DSSColor'
    // const baseUrl = '//hscmap.mtk.nao.ac.jp/hscMap4/misc/hips/gaia'
    const baseUrl = '//alasky.cds.unistra.fr/Pan-STARRS/DR1/color-i-r-g'

    globe.addNewLayer(HipparcosCatalogLayer)
    globe.addNewLayer(ConstellationLayer)
    globe.addNewLayer(hips.SimpleImageLayer, baseUrl, { lodBias: -0.25 })
    globe.addNewLayer(GridLayer, o => {
      o.modelMatrix = () => {
        const { za, zd, zp } = globe.viewFactory
        return matrixUtils.izenith4(za, zd - tilt, zp)
      }
      o.defaultGridColor = [0, 0.25, 1, 1]
      o.thetaLine.gridColors = { 9: [1, 0.5, 0, 1] }
      o.phiLine.gridColors = { 12: [1, 0, 0, 1], }
    })
    globe.addNewLayer(GridLayer, o => {
      o.defaultGridColor = [1, 1, 1, 0.125]
      o.phiLine.gridColors = {}
    })

    createEffect(() => {
      globe.viewFactory.jumpTo(tiltedZenith(), { duration: 0 })
    })
  })

  const zenith = createMemo(() =>
    dateUtils.zenithSkyCoord({
      when: props.date,
      where: props.location,
    })
  )

  const tiltedZenith = createMemo(() => {
    const z = { ...zenith() }
    z.zd += tilt
    return z
  })

  return (
    <Context.Provider value={{ globe: getGlobe }}>
      <div style={{ ...props.style }}>
        <div ref={root} style={{ width: '100%', height: '100%' }} />
        {props.children}
      </div>
    </Context.Provider>
  )
}


export function useStellarGlobe() {
  return assertNotNull(useContext(Context))
}
