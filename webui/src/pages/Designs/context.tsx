import { angle, dateUtils, Globe, SkyCoord } from '@stellar-globe/stellar-globe'
import { useNavigate, useParams } from 'solid-app-router'
import { Accessor, createContext, createEffect, createMemo, createResource, createSignal, on, useContext } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { fetcher } from "~/api"
import { assertNotNull } from "../../utils/assertNotNull"
import { PfsDesignEntry } from "./types"


type JumpToOptions = Parameters<Globe["viewFactory"]["jumpTo"]>


function makeContext() {
  const designs = useDesigns()
  const [jumpToSignal, setJumpToSignal] = createSignal<JumpToOptions>(null as any)
  const [focusedDesign, setFocusedDesign] = createSignal<PfsDesignEntry>()
  const jumpTo = (...args: JumpToOptions) => setJumpToSignal(args)
  const [showFibers, setShowFibers] = createSignal(true)
  const { selectedDesign, setSelectedDesign } = useSelectedDesign(designs, jumpTo)
  const designDetail = useDesignDetail(selectedDesign)

  return {
    designs,
    designDetail,
    showFibers,
    setShowFibers,
    jumpToSignal,
    jumpTo,
    focusedDesign,
    setFocusedDesign,
    selectedDesign,
    setSelectedDesign,
    ...useObservation(),
  }
}


function useSelectedDesign(designs: ReturnType<typeof useDesigns>, jumpTo: (...args: JumpToOptions) => void) {
  const params = useParams()
  const designId: string | undefined = params.design_id
  const navigate = useNavigate()
  const [selectedDesign, setSelectedDesign] = createSignal<PfsDesignEntry>()

  createEffect(on([() => designs.store.list], () => {
    if (designId) {
      const d = designs.store.list.find(d => d.id === designId)
      setSelectedDesign(d)
      if (d) {
        const coord = SkyCoord.fromDeg(d.ra, d.dec)
        jumpTo({ fovy: angle.deg2rad(0.8) }, { coord, duration: 0 })
      }
    }
  }, { defer: true }))

  createEffect(on([selectedDesign], () => {
    const designId = selectedDesign()?.id
    navigate(`/designs${designId ? `/${designId}` : ''}`)
  }, { defer: true }))

  return {
    selectedDesign,
    setSelectedDesign,
  }
}


type ContextType = ReturnType<typeof makeContext>
const Context = createContext<ContextType>()


export function Designs2Provider(props: { children: (context: ContextType) => any }) {
  const context = makeContext()
  return (
    <Context.Provider value={context}>
      {props.children(context)}
    </Context.Provider>
  )
}


export function useDesignContext() {
  return assertNotNull(useContext(Context))
}


function useDesigns() {
  const [list, { refetch }] = createResource(fetchDesignList)
  const [store, setStore] = createStore<{ list: PfsDesignEntry[] }>({ list: [] })
  createEffect(() => {
    if (list()) {
      setStore(produce(_ => {
        _.list = list()!
      }))
    }
  })
  return {
    store,
    refetch,
    get loading() { return list.loading },
  }
}


async function fetchDesignList() {
  const listDesigns = fetcher.path('/api/pfs_designs').method('get').create()
  const { data } = await listDesigns({})
  return data
}


function useObservation() {
  const [now, setNow] = createSignal(new Date())
  const [telescopeLocation,] = createSignal(SubaruTelescopeLocation)

  const zenithSkyCoord = createMemo(() => {
    const { za, zd } = dateUtils.zenithSkyCoord({ when: now(), where: telescopeLocation() })
    return SkyCoord.fromRad(za, zd)
  })

  return {
    now, setNow,
    telescopeLocation,
    zenithSkyCoord,
  }
}


function useDesignDetail(selectedDesign: Accessor<PfsDesignEntry | undefined>) {
  const showDesign = fetcher.path('/api/pfs_designs/{id_hex}').method('get').create()

  const [design] = createResource(() => selectedDesign()?.id, async id => {
    const { data } = await showDesign({ id_hex: id })
    return data
  })

  return design
}


const SubaruTelescopeLocation = { lat: angle.dms2deg('19:49:32'), lon: angle.dms2deg('-155:28:36') }

export const designCrossMatchCosine = Math.cos(angle.deg2rad(0.001))
