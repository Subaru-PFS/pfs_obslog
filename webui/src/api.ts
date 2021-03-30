import Axios, { AxiosError } from 'axios'
import { StatusCodes } from "http-status-codes"
import { Spinner } from './components/Spinner'
import { DefaultApi } from "./api-client/api"

const spinner = new Spinner()

export function baseAxios(ignoreErrors: number[]) {
  const axios = Axios.create({
    headers: {}
  })
  axios.interceptors.request.use((config) => {
    spinner.start()
    return config
  })
  axios.interceptors.response.use(
    (response) => {
      spinner.stop()
      return response
    },
    (error: AxiosError) => {
      spinner.stop()
      do {
        if (!error.response) { // user triggered a reload during ajax
          break
        }
        if (ignoreErrors.includes(error.response.status)) {
          break
        }
        alert(
          error.response.status == StatusCodes.INTERNAL_SERVER_ERROR ?
            `Unexpected Server Error:\nSorry, please wait a moment and then reload the page.` :
            `${error.response.statusText}:\n${JSON.stringify(error.response.data, null, 2)}`
        )
        location.href = `#/`
        location.reload()
      } while (false)
      return Promise.reject(error)
    })
  return axios
}

export function apiThrowsError(...errors: number[]) {
  return new DefaultApi(undefined, '.', baseAxios(errors))
}

export const api = apiThrowsError(StatusCodes.UNPROCESSABLE_ENTITY)

export function isAxiosError(error: any): error is AxiosError {
  return !!error.isAxiosError
}
