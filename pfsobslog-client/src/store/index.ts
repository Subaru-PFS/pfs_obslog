import { reactive } from "vue"
import { SessionCreateResponse } from "../api-client"

type Session = SessionCreateResponse

const $g = reactive({
  session: null as null | Session
})

export { $g }