import { StatusCodes } from "http-status-codes"
import { api, apiThrowsError, isAxiosError } from "./api"
import { $g } from "./global"

export async function sessionLogin(username: string, password: string) {
  try {
    const { data: { current_user } } = await api.sessionCreate({ username, password })
    $g.session = {
      user: current_user,
    }
    return true
  } catch (er) {
    if (isAxiosError(er) && er.response?.status === StatusCodes.UNPROCESSABLE_ENTITY) {
      return false
    }
    throw er
  }
}

export async function sessionLogout() {
  await api.sessionDestroy()
  $g.session = null
}

export async function sessionReload() {
  try {
    const { data } = await apiThrowsError({ ignoreErrors: [StatusCodes.FORBIDDEN] }).sessionShow()
    $g.session = { user: data.current_user }
    return true
  } catch (e) {
    if (isAxiosError(e) && e.response?.status == StatusCodes.FORBIDDEN) {
      return false
    }
    throw e
  }
}