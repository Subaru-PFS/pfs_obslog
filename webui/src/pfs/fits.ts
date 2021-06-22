import { int } from "~/types"

export function fitsFileName(visitId: int, cameraId: int) {
  cameraId--
  const sm = (cameraId >> 2) + 1
  const arm = (cameraId & 3) + 1
  return `PFSA${String(visitId).padStart(6, '0')}${sm}${arm}.fits`
}

