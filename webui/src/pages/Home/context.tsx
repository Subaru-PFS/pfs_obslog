import { useParams } from "solid-app-router"
import { createContext, createSignal, startTransition, useContext } from "solid-js"


type RefreshParams = {
  list?: {
    showLoader?: boolean
  }
  detail?: {
    showLoader?: boolean
  }
}


type GotoVisitParams = {
  visitId?: number
}


function makeContext() {
  const [refreshHomeSignal, setRefreshHomeSignal] = createSignal<RefreshParams>({})

  const params = useParams()
  const [visitId, setVisitId] = createSignal((() => {
    const draft = Number(params.visit_id)
    return Number.isFinite(draft) ? draft : undefined
  })())

  const refreshHome = (params: RefreshParams) => {
    return startTransition(() => {
      setRefreshHomeSignal(params)
    })
  }

  const [goToVisitSignal, goToVisit] = createSignal<GotoVisitParams>({ visitId: visitId() })

  return {
    visitId,
    setVisitId,
    refreshHomeSignal,
    refreshHome,
    goToVisit,
    goToVisitSignal,
  }
}


type ContextType = ReturnType<typeof makeContext>
const Context = createContext<ContextType>()


export function HomeContext(props: { children: (context: ContextType) => any }) {
  const context = makeContext()
  return (
    <Context.Provider value={context}>
      {
        props.children(context)
      }
    </Context.Provider>
  )
}


export function useHomeContext() {
  return useContext(Context)!
}
