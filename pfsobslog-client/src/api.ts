import Axios, { AxiosError } from 'axios'
import { StatusCodes } from "http-status-codes"
import { Spinner } from './components/Spinner'
import { DefaultApi } from "/src/api-client/api"

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
          location.href = `#/`
          location.reload()
          break
        }
        if (ignoreErrors.includes(error.response.status)) {
          break
        }
        switch (error.response.status) {
          case StatusCodes.INTERNAL_SERVER_ERROR:
            alert(`Unexpected Server Error:\nSorry, please wait a moment and then reload the page.`)
            break
          case StatusCodes.UNAUTHORIZED:
            location.href = `#/login?next=${encodeURIComponent(location.hash.substring(1))}`
            location.reload()
            break
          default:
            alert(JSON.stringify(error.response, null, 0))
            location.href = `#/`
            location.reload()
            break
        }
      } while (false)
      return Promise.reject(error)
    })
  return axios
}

export function apiThrowsError(errors: number[]) {
  return new DefaultApi(undefined, '.', baseAxios(errors))
}

export const api = apiThrowsError([StatusCodes.UNPROCESSABLE_ENTITY])
