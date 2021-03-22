import { createContext, createSignal, useContext } from "solid-js"
import { ExposureType } from "./types"

type FitsId = {
  visit_id: number
  type: ExposureType
  fits_id: number
}

function makeContext() {
  const [fitsId, _setFitsId] = createSignal<FitsId>()

  const setFitsId = (fitsId: FitsId | undefined) => {
    return _setFitsId(fitsId)
  }

  return {
    fitsId,
    setFitsId,
  }
}

const Context = createContext<ReturnType<typeof makeContext>>()

export function VisitDetailContext(props: { children?: any }) {
  const context = makeContext()
  return (
    <Context.Provider value={context}>
      {props.children}
    </Context.Provider>
  )
}


export function useVisitDetailContext() {
  return useContext(Context)!
}
