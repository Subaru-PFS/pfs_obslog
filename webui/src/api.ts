import Axios, { AxiosError } from 'axios'
import { StatusCodes } from "http-status-codes"
import { DefaultApi, DefaultApiAxiosParamCreator } from "./api-client/api"
import { RequestArgs } from './api-client/base'
import { Spinner } from './components/Spinner'


const spinner = new Spinner()


type AxisOptions = Partial<{
  ignoreErrors: number[]
  spinner: boolean
}>

function baseAxios(options: AxisOptions = {}) {
  const ignoreErrors = options.ignoreErrors || []
  const showSpinner = options.spinner ?? true
  const axios = Axios.create({
    headers: {}
  })
  axios.interceptors.request.use((config) => {
    counter.increase()
    showSpinner && spinner.start()
    return config
  })
  axios.interceptors.response.use(
    (response) => {
      counter.decrease()
      showSpinner && spinner.stop()
      return response
    },
    (error: AxiosError) => {
      counter.decrease()
      showSpinner && spinner.stop()
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

const BASE_PATH = '.'


export function apiFactory(options: AxisOptions = {}) {
  return new DefaultApi(undefined, BASE_PATH, baseAxios(options))
}

export async function apiUrl(cb: (creator: ReturnType<typeof DefaultApiAxiosParamCreator>) => Promise<RequestArgs>) {
  return `${BASE_PATH}${(await cb(DefaultApiAxiosParamCreator())).url}`
}

export const api = apiFactory({ ignoreErrors: [StatusCodes.UNPROCESSABLE_ENTITY, StatusCodes.REQUEST_TOO_LONG] })
export const apiNoSpinner = apiFactory({ spinner: false, ignoreErrors: [StatusCodes.UNPROCESSABLE_ENTITY, StatusCodes.REQUEST_TOO_LONG] })

export function isAxiosError(error: any): error is AxiosError {
  return !!error.isAxiosError
}

const counter = new class {
  private count = 0

  increase() {
    ++this.count
  }

  decrease() {
    --this.count
    if (this.count === 0) {
      while (this.doneCallbacks.length > 0) {
        this.doneCallbacks.shift()!()
      }
    }
  }

  private doneCallbacks: (() => void)[] = []

  done(cb: () => void) {
    this.doneCallbacks.push(cb)
  }
}

export function showApiSpinner() {
  spinner.start()
  counter.done(() => {
    spinner.stop()
  })
}

