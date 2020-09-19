import { StatusCodes } from "http-status-codes"
import { api, apiThrowsError } from "./api"
import { $g } from "./store"


export async function login(email: string, password: string) {
  const { data: session } = await api.sessionCreate({ email, password })
    .catch(e => {
      throw new Error(e.response?.data?.detail || `Unexpected error: ${e}`)
    })
  $g.session = session
}


export async function logout() {
  await api.sessionDelete()
  $g.session = null
}


export async function refreshSession() {
  const { data: session } = await apiThrowsError([StatusCodes.UNAUTHORIZED]).sessionRead()
  $g.session = session
}
