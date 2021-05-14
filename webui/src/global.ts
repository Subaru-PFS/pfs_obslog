import { $reactive } from "./vue-utils/reactive"
import { int } from "./types"


type User = {
  id: int
  account_name: string
}

export type Session = {
  user: User
}

type $Global = {
  session: null | Session,
}

const $g = $reactive<$Global>({
  session: null,
})

export { $g }