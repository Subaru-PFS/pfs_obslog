import { OpArgType, OpReturnType } from "openapi-typescript-fetch"
import { paths } from "~/api/schema"

export type VisitDetailType = OpReturnType<paths['/api/visits/{id}']['get']>
export type IicSequenceResponseType = NonNullable<VisitDetailType["iic_sequence"]>
export type SpsImageType = NonNullable<OpArgType<paths["/api/fits/visits/{visit_id}/sps/{camera_id}.png"]["get"]>["type"]>
export type SpsExposureType = NonNullable<VisitDetailType["sps"]>["exposures"][number]
export type McsExposureType = NonNullable<VisitDetailType["mcs"]>["exposures"][number]
export type AgcExposureType = NonNullable<VisitDetailType["agc"]>["exposures"][number]
export type ExposureType = 'sps' | 'mcs' | 'agc'
export type FitsMeta = OpReturnType<paths['/api/fits/visits/{visit_id}/{exposure_type}/{fits_id}/meta']['get']>
export type ListVisitResponse = OpReturnType<paths["/api/visits"]["get"]>
export type VisitResponse = ListVisitResponse["visits"][number]
export type IicSequenceResponse = ListVisitResponse["iic_sequence"][number]
export type VisitGroupType = {
  iicSequence?: IicSequenceResponse
  visits: VisitResponse[]
}
