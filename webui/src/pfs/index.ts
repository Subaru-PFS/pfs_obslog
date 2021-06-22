import { int } from "~/types"


export function fitsFileName(visitId: int, cameraId: int) {
  const { sm, arm } = decodeCameraId(cameraId)
  return `PFSA${String(visitId).padStart(6, '0')}${sm}${arm}.fits`
}


export function decodeCameraId(cameraId: int) {
  cameraId--
  const sm = (cameraId >> 2) + 1 // module num
  const arm = (cameraId & 3) + 1 // arm num
  return { sm, arm }
}

export function armName(cameraId: int) {
  return [
    'b',
    'r',
    'n',
    'medRed',
  ][decodeCameraId(cameraId).arm - 1]
}
