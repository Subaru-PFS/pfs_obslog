import { FetchReturnType } from "openapi-typescript-fetch"
import { useLocation, useNavigate } from "solid-app-router"
import { createContext, createResource, Match, onMount, Switch, useContext } from "solid-js"
import { Center } from "~/components/layout"
import { Loading } from "~/components/Loading"
import { fetcher } from "../api"

const getSession = fetcher.path("/api/session").method("get").create()
const createSession = fetcher.path("/api/session").method("post").create()
const deleteSession = fetcher.path("/api/session").method("delete").create()


type CurrentUser = NonNullable<FetchReturnType<typeof getSession>["current_user"]>
const LoginContext = createContext<CurrentUser>()


const [session, { mutate: mutateSession }] = createResource(async () => (await getSession({})).data)


type RequireLoginProps = {
  children: any
}

export function RequireLogin(props: RequireLoginProps) {
  const currentUser = () => session()?.current_user
  return (
    <Switch fallback={<RedirectToLogin />}>
      <Match when={!!currentUser()}>
        <LoginContext.Provider value={currentUser()}>
          {props.children}
        </LoginContext.Provider>
      </Match>
      <Match when={session.loading}>
        <Center>
          <Loading />
        </Center>
      </Match>
    </Switch>
  )
}


export function requireLogin<Y, Z>(X: (props: Z) => Y) {
  return (props: Z) => (
    <RequireLogin>
      {/* @ts-ignore */}
      <X {...props} />
    </RequireLogin>
  )
}



function RedirectToLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  onMount(() => {
    navigate("/login", { replace: true, state: { from: location.pathname } })
  })
  return <></>
}


export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid credentials")
  }
}


export async function login(username: string, password: string) {
  try {
    const { data } = await createSession({ username, password })
    mutateSession(data)
  }
  catch (e) {
    if (e instanceof createSession.Error) {
      const error = e.getActualType()
      if (error.status === 422) {
        throw new InvalidCredentialsError()
      }
    }
    throw e
  }
}


export async function logout() {
  await deleteSession({})
  mutateSession()
}


export function useCurrentUser() {
  const currentUser = useContext(LoginContext)
  if (currentUser === undefined) {
    throw new Error('Use of useCurrentUser outside of RequireLogin Context')
  }
  return currentUser
}


export function useSession() {
  return session
}