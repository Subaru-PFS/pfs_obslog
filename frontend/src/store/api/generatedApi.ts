import { emptyApi as api } from "./emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    healthzApiHealthzGet: build.query<
      HealthzApiHealthzGetApiResponse,
      HealthzApiHealthzGetApiArg
    >({
      query: () => ({ url: `/api/healthz` }),
    }),
    readyzApiReadyzGet: build.query<
      ReadyzApiReadyzGetApiResponse,
      ReadyzApiReadyzGetApiArg
    >({
      query: () => ({ url: `/api/readyz` }),
    }),
    loginApiAuthLoginPost: build.mutation<
      LoginApiAuthLoginPostApiResponse,
      LoginApiAuthLoginPostApiArg
    >({
      query: (queryArg) => ({
        url: `/api/auth/login`,
        method: "POST",
        body: queryArg.loginRequest,
      }),
    }),
    logoutApiAuthLogoutPost: build.mutation<
      LogoutApiAuthLogoutPostApiResponse,
      LogoutApiAuthLogoutPostApiArg
    >({
      query: () => ({ url: `/api/auth/logout`, method: "POST" }),
    }),
    getMeApiAuthMeGet: build.query<
      GetMeApiAuthMeGetApiResponse,
      GetMeApiAuthMeGetApiArg
    >({
      query: () => ({ url: `/api/auth/me` }),
    }),
    getStatusApiAuthStatusGet: build.query<
      GetStatusApiAuthStatusGetApiResponse,
      GetStatusApiAuthStatusGetApiArg
    >({
      query: () => ({ url: `/api/auth/status` }),
    }),
    listVisitsApiVisitsGet: build.query<
      ListVisitsApiVisitsGetApiResponse,
      ListVisitsApiVisitsGetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/visits`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          sql: queryArg.sql,
        },
      }),
    }),
    getVisitApiVisitsVisitIdGet: build.query<
      GetVisitApiVisitsVisitIdGetApiResponse,
      GetVisitApiVisitsVisitIdGetApiArg
    >({
      query: (queryArg) => ({ url: `/api/visits/${queryArg.visitId}` }),
    }),
    getVisitRankApiVisitsVisitIdRankGet: build.query<
      GetVisitRankApiVisitsVisitIdRankGetApiResponse,
      GetVisitRankApiVisitsVisitIdRankGetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/visits/${queryArg.visitId}/rank`,
        params: {
          sql: queryArg.sql,
        },
      }),
    }),
    exportVisitsCsvApiVisitsCsvGet: build.query<
      ExportVisitsCsvApiVisitsCsvGetApiResponse,
      ExportVisitsCsvApiVisitsCsvGetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/visits.csv`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          sql: queryArg.sql,
        },
      }),
    }),
    createVisitNoteApiVisitsVisitIdNotesPost: build.mutation<
      CreateVisitNoteApiVisitsVisitIdNotesPostApiResponse,
      CreateVisitNoteApiVisitsVisitIdNotesPostApiArg
    >({
      query: (queryArg) => ({
        url: `/api/visits/${queryArg.visitId}/notes`,
        method: "POST",
        body: queryArg.noteCreateRequest,
      }),
    }),
    updateVisitNoteApiVisitsVisitIdNotesNoteIdPut: build.mutation<
      UpdateVisitNoteApiVisitsVisitIdNotesNoteIdPutApiResponse,
      UpdateVisitNoteApiVisitsVisitIdNotesNoteIdPutApiArg
    >({
      query: (queryArg) => ({
        url: `/api/visits/${queryArg.visitId}/notes/${queryArg.noteId}`,
        method: "PUT",
        body: queryArg.noteUpdateRequest,
      }),
    }),
    deleteVisitNoteApiVisitsVisitIdNotesNoteIdDelete: build.mutation<
      DeleteVisitNoteApiVisitsVisitIdNotesNoteIdDeleteApiResponse,
      DeleteVisitNoteApiVisitsVisitIdNotesNoteIdDeleteApiArg
    >({
      query: (queryArg) => ({
        url: `/api/visits/${queryArg.visitId}/notes/${queryArg.noteId}`,
        method: "DELETE",
      }),
    }),
    createVisitSetNoteApiVisitSetsVisitSetIdNotesPost: build.mutation<
      CreateVisitSetNoteApiVisitSetsVisitSetIdNotesPostApiResponse,
      CreateVisitSetNoteApiVisitSetsVisitSetIdNotesPostApiArg
    >({
      query: (queryArg) => ({
        url: `/api/visit_sets/${queryArg.visitSetId}/notes`,
        method: "POST",
        body: queryArg.noteCreateRequest,
      }),
    }),
    updateVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdPut: build.mutation<
      UpdateVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdPutApiResponse,
      UpdateVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdPutApiArg
    >({
      query: (queryArg) => ({
        url: `/api/visit_sets/${queryArg.visitSetId}/notes/${queryArg.noteId}`,
        method: "PUT",
        body: queryArg.noteUpdateRequest,
      }),
    }),
    deleteVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdDelete: build.mutation<
      DeleteVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdDeleteApiResponse,
      DeleteVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdDeleteApiArg
    >({
      query: (queryArg) => ({
        url: `/api/visit_sets/${queryArg.visitSetId}/notes/${queryArg.noteId}`,
        method: "DELETE",
      }),
    }),
    downloadSpsFitsApiFitsVisitsVisitIdSpsCameraIdFitsGet: build.query<
      DownloadSpsFitsApiFitsVisitsVisitIdSpsCameraIdFitsGetApiResponse,
      DownloadSpsFitsApiFitsVisitsVisitIdSpsCameraIdFitsGetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/fits/visits/${queryArg.visitId}/sps/${queryArg.cameraId}.fits`,
        params: {
          type: queryArg["type"],
        },
      }),
    }),
    getSpsFitsPreviewApiFitsVisitsVisitIdSpsCameraIdPngGet: build.query<
      GetSpsFitsPreviewApiFitsVisitsVisitIdSpsCameraIdPngGetApiResponse,
      GetSpsFitsPreviewApiFitsVisitsVisitIdSpsCameraIdPngGetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/fits/visits/${queryArg.visitId}/sps/${queryArg.cameraId}.png`,
        params: {
          width: queryArg.width,
          height: queryArg.height,
          type: queryArg["type"],
        },
      }),
    }),
    getSpsFitsHeadersApiFitsVisitsVisitIdSpsCameraIdHeadersGet: build.query<
      GetSpsFitsHeadersApiFitsVisitsVisitIdSpsCameraIdHeadersGetApiResponse,
      GetSpsFitsHeadersApiFitsVisitsVisitIdSpsCameraIdHeadersGetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/fits/visits/${queryArg.visitId}/sps/${queryArg.cameraId}/headers`,
        params: {
          type: queryArg["type"],
        },
      }),
    }),
    downloadMcsFitsApiFitsVisitsVisitIdMcsFrameIdFitsGet: build.query<
      DownloadMcsFitsApiFitsVisitsVisitIdMcsFrameIdFitsGetApiResponse,
      DownloadMcsFitsApiFitsVisitsVisitIdMcsFrameIdFitsGetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/fits/visits/${queryArg.visitId}/mcs/${queryArg.frameId}.fits`,
      }),
    }),
    getMcsFitsPreviewApiFitsVisitsVisitIdMcsFrameIdPngGet: build.query<
      GetMcsFitsPreviewApiFitsVisitsVisitIdMcsFrameIdPngGetApiResponse,
      GetMcsFitsPreviewApiFitsVisitsVisitIdMcsFrameIdPngGetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/fits/visits/${queryArg.visitId}/mcs/${queryArg.frameId}.png`,
        params: {
          width: queryArg.width,
          height: queryArg.height,
        },
      }),
    }),
    getMcsFitsHeadersApiFitsVisitsVisitIdMcsFrameIdHeadersGet: build.query<
      GetMcsFitsHeadersApiFitsVisitsVisitIdMcsFrameIdHeadersGetApiResponse,
      GetMcsFitsHeadersApiFitsVisitsVisitIdMcsFrameIdHeadersGetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/fits/visits/${queryArg.visitId}/mcs/${queryArg.frameId}/headers`,
      }),
    }),
    downloadAgcFitsApiFitsVisitsVisitIdAgcExposureIdFitsGet: build.query<
      DownloadAgcFitsApiFitsVisitsVisitIdAgcExposureIdFitsGetApiResponse,
      DownloadAgcFitsApiFitsVisitsVisitIdAgcExposureIdFitsGetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/fits/visits/${queryArg.visitId}/agc/${queryArg.exposureId}.fits`,
      }),
    }),
    getAgcFitsPreviewApiFitsVisitsVisitIdAgcExposureIdHduIndexPngGet:
      build.query<
        GetAgcFitsPreviewApiFitsVisitsVisitIdAgcExposureIdHduIndexPngGetApiResponse,
        GetAgcFitsPreviewApiFitsVisitsVisitIdAgcExposureIdHduIndexPngGetApiArg
      >({
        query: (queryArg) => ({
          url: `/api/fits/visits/${queryArg.visitId}/agc/${queryArg.exposureId}-${queryArg.hduIndex}.png`,
          params: {
            width: queryArg.width,
            height: queryArg.height,
          },
        }),
      }),
    listPfsDesignsApiPfsDesignsGet: build.query<
      ListPfsDesignsApiPfsDesignsGetApiResponse,
      ListPfsDesignsApiPfsDesignsGetApiArg
    >({
      query: () => ({ url: `/api/pfs_designs` }),
    }),
    downloadDesignApiPfsDesignsIdHexFitsGet: build.query<
      DownloadDesignApiPfsDesignsIdHexFitsGetApiResponse,
      DownloadDesignApiPfsDesignsIdHexFitsGetApiArg
    >({
      query: (queryArg) => ({ url: `/api/pfs_designs/${queryArg.idHex}.fits` }),
    }),
    getDesignApiPfsDesignsIdHexGet: build.query<
      GetDesignApiPfsDesignsIdHexGetApiResponse,
      GetDesignApiPfsDesignsIdHexGetApiArg
    >({
      query: (queryArg) => ({ url: `/api/pfs_designs/${queryArg.idHex}` }),
    }),
    createAttachmentApiAttachmentsPost: build.mutation<
      CreateAttachmentApiAttachmentsPostApiResponse,
      CreateAttachmentApiAttachmentsPostApiArg
    >({
      query: (queryArg) => ({
        url: `/api/attachments`,
        method: "POST",
        body: queryArg.bodyCreateAttachmentApiAttachmentsPost,
      }),
    }),
    listAttachmentsApiAttachmentsGet: build.query<
      ListAttachmentsApiAttachmentsGetApiResponse,
      ListAttachmentsApiAttachmentsGetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/attachments`,
        params: {
          start: queryArg.start,
          per_page: queryArg.perPage,
        },
      }),
    }),
    getAttachmentApiAttachmentsAccountNameFileIdGet: build.query<
      GetAttachmentApiAttachmentsAccountNameFileIdGetApiResponse,
      GetAttachmentApiAttachmentsAccountNameFileIdGetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/attachments/${queryArg.accountName}/${queryArg.fileId}`,
        params: {
          filename: queryArg.filename,
        },
      }),
    }),
    deleteAttachmentApiAttachmentsFileIdDelete: build.mutation<
      DeleteAttachmentApiAttachmentsFileIdDeleteApiResponse,
      DeleteAttachmentApiAttachmentsFileIdDeleteApiArg
    >({
      query: (queryArg) => ({
        url: `/api/attachments/${queryArg.fileId}`,
        method: "DELETE",
      }),
    }),
    showMcsDataChartApiMcsDataFrameIdPngGet: build.query<
      ShowMcsDataChartApiMcsDataFrameIdPngGetApiResponse,
      ShowMcsDataChartApiMcsDataFrameIdPngGetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/mcs_data/${queryArg.frameId}.png`,
        params: {
          width: queryArg.width,
          height: queryArg.height,
        },
      }),
    }),
    rootApiGet: build.query<RootApiGetApiResponse, RootApiGetApiArg>({
      query: () => ({ url: `/api` }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as generatedApi };
export type HealthzApiHealthzGetApiResponse =
  /** status 200 Successful Response */ HealthResponse;
export type HealthzApiHealthzGetApiArg = void;
export type ReadyzApiReadyzGetApiResponse =
  /** status 200 Successful Response */ HealthResponse;
export type ReadyzApiReadyzGetApiArg = void;
export type LoginApiAuthLoginPostApiResponse =
  /** status 200 Successful Response */ LoginResponse;
export type LoginApiAuthLoginPostApiArg = {
  loginRequest: LoginRequest;
};
export type LogoutApiAuthLogoutPostApiResponse =
  /** status 200 Successful Response */ LogoutResponse;
export type LogoutApiAuthLogoutPostApiArg = void;
export type GetMeApiAuthMeGetApiResponse =
  /** status 200 Successful Response */ UserResponse;
export type GetMeApiAuthMeGetApiArg = void;
export type GetStatusApiAuthStatusGetApiResponse =
  /** status 200 Successful Response */ {
    [key: string]: any;
  };
export type GetStatusApiAuthStatusGetApiArg = void;
export type ListVisitsApiVisitsGetApiResponse =
  /** status 200 Successful Response */ VisitList;
export type ListVisitsApiVisitsGetApiArg = {
  /** ページネーションのオフセット */
  offset?: number;
  /** 取得件数上限（-1で無制限） */
  limit?: number;
  /** SQLライクなフィルタ条件（例: where id > 100） */
  sql?: string | null;
};
export type GetVisitApiVisitsVisitIdGetApiResponse =
  /** status 200 Successful Response */ VisitDetail;
export type GetVisitApiVisitsVisitIdGetApiArg = {
  visitId: number;
};
export type GetVisitRankApiVisitsVisitIdRankGetApiResponse =
  /** status 200 Successful Response */ VisitRankResponse;
export type GetVisitRankApiVisitsVisitIdRankGetApiArg = {
  visitId: number;
  /** SQLライクなフィルタ条件（例: where id > 100） */
  sql?: string | null;
};
export type ExportVisitsCsvApiVisitsCsvGetApiResponse =
  /** status 200 Successful Response */ any;
export type ExportVisitsCsvApiVisitsCsvGetApiArg = {
  /** ページネーションのオフセット */
  offset?: number;
  /** 取得件数上限（-1で無制限） */
  limit?: number;
  /** SQLライクなフィルタ条件（例: where id > 100） */
  sql?: string | null;
};
export type CreateVisitNoteApiVisitsVisitIdNotesPostApiResponse =
  /** status 201 Successful Response */ NoteCreateResponse;
export type CreateVisitNoteApiVisitsVisitIdNotesPostApiArg = {
  visitId: number;
  noteCreateRequest: NoteCreateRequest;
};
export type UpdateVisitNoteApiVisitsVisitIdNotesNoteIdPutApiResponse = unknown;
export type UpdateVisitNoteApiVisitsVisitIdNotesNoteIdPutApiArg = {
  visitId: number;
  noteId: number;
  noteUpdateRequest: NoteUpdateRequest;
};
export type DeleteVisitNoteApiVisitsVisitIdNotesNoteIdDeleteApiResponse =
  unknown;
export type DeleteVisitNoteApiVisitsVisitIdNotesNoteIdDeleteApiArg = {
  visitId: number;
  noteId: number;
};
export type CreateVisitSetNoteApiVisitSetsVisitSetIdNotesPostApiResponse =
  /** status 201 Successful Response */ NoteCreateResponse;
export type CreateVisitSetNoteApiVisitSetsVisitSetIdNotesPostApiArg = {
  visitSetId: number;
  noteCreateRequest: NoteCreateRequest;
};
export type UpdateVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdPutApiResponse =
  unknown;
export type UpdateVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdPutApiArg = {
  visitSetId: number;
  noteId: number;
  noteUpdateRequest: NoteUpdateRequest;
};
export type DeleteVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdDeleteApiResponse =
  unknown;
export type DeleteVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdDeleteApiArg = {
  visitSetId: number;
  noteId: number;
};
export type DownloadSpsFitsApiFitsVisitsVisitIdSpsCameraIdFitsGetApiResponse =
  /** status 200 Successful Response */ any;
export type DownloadSpsFitsApiFitsVisitsVisitIdSpsCameraIdFitsGetApiArg = {
  visitId: number;
  cameraId: number;
  type?: FitsType;
};
export type GetSpsFitsPreviewApiFitsVisitsVisitIdSpsCameraIdPngGetApiResponse =
  /** status 200 Successful Response */ any;
export type GetSpsFitsPreviewApiFitsVisitsVisitIdSpsCameraIdPngGetApiArg = {
  visitId: number;
  cameraId: number;
  width?: number;
  height?: number;
  type?: FitsType;
};
export type GetSpsFitsHeadersApiFitsVisitsVisitIdSpsCameraIdHeadersGetApiResponse =
  /** status 200 Successful Response */ FitsMeta;
export type GetSpsFitsHeadersApiFitsVisitsVisitIdSpsCameraIdHeadersGetApiArg = {
  visitId: number;
  cameraId: number;
  type?: FitsType;
};
export type DownloadMcsFitsApiFitsVisitsVisitIdMcsFrameIdFitsGetApiResponse =
  /** status 200 Successful Response */ any;
export type DownloadMcsFitsApiFitsVisitsVisitIdMcsFrameIdFitsGetApiArg = {
  visitId: number;
  frameId: number;
};
export type GetMcsFitsPreviewApiFitsVisitsVisitIdMcsFrameIdPngGetApiResponse =
  /** status 200 Successful Response */ any;
export type GetMcsFitsPreviewApiFitsVisitsVisitIdMcsFrameIdPngGetApiArg = {
  visitId: number;
  frameId: number;
  width?: number;
  height?: number;
};
export type GetMcsFitsHeadersApiFitsVisitsVisitIdMcsFrameIdHeadersGetApiResponse =
  /** status 200 Successful Response */ FitsMeta;
export type GetMcsFitsHeadersApiFitsVisitsVisitIdMcsFrameIdHeadersGetApiArg = {
  visitId: number;
  frameId: number;
};
export type DownloadAgcFitsApiFitsVisitsVisitIdAgcExposureIdFitsGetApiResponse =
  /** status 200 Successful Response */ any;
export type DownloadAgcFitsApiFitsVisitsVisitIdAgcExposureIdFitsGetApiArg = {
  visitId: number;
  exposureId: number;
};
export type GetAgcFitsPreviewApiFitsVisitsVisitIdAgcExposureIdHduIndexPngGetApiResponse =
  /** status 200 Successful Response */ any;
export type GetAgcFitsPreviewApiFitsVisitsVisitIdAgcExposureIdHduIndexPngGetApiArg =
  {
    visitId: number;
    exposureId: number;
    hduIndex: number;
    width?: number;
    height?: number;
  };
export type ListPfsDesignsApiPfsDesignsGetApiResponse =
  /** status 200 Successful Response */ PfsDesignEntry[];
export type ListPfsDesignsApiPfsDesignsGetApiArg = void;
export type DownloadDesignApiPfsDesignsIdHexFitsGetApiResponse =
  /** status 200 Successful Response */ any;
export type DownloadDesignApiPfsDesignsIdHexFitsGetApiArg = {
  idHex: string;
};
export type GetDesignApiPfsDesignsIdHexGetApiResponse =
  /** status 200 Successful Response */ PfsDesignDetail;
export type GetDesignApiPfsDesignsIdHexGetApiArg = {
  idHex: string;
};
export type CreateAttachmentApiAttachmentsPostApiResponse =
  /** status 201 Successful Response */ CreateAttachmentResponse;
export type CreateAttachmentApiAttachmentsPostApiArg = {
  bodyCreateAttachmentApiAttachmentsPost: BodyCreateAttachmentApiAttachmentsPost;
};
export type ListAttachmentsApiAttachmentsGetApiResponse =
  /** status 200 Successful Response */ AttachmentList;
export type ListAttachmentsApiAttachmentsGetApiArg = {
  /** Start position */
  start?: number;
  /** Items per page */
  perPage?: number;
};
export type GetAttachmentApiAttachmentsAccountNameFileIdGetApiResponse =
  /** status 200 Successful Response */ any;
export type GetAttachmentApiAttachmentsAccountNameFileIdGetApiArg = {
  accountName: string;
  fileId: number;
  /** Override filename in response */
  filename?: string | null;
};
export type DeleteAttachmentApiAttachmentsFileIdDeleteApiResponse = unknown;
export type DeleteAttachmentApiAttachmentsFileIdDeleteApiArg = {
  fileId: number;
};
export type ShowMcsDataChartApiMcsDataFrameIdPngGetApiResponse =
  /** status 200 Successful Response */ any;
export type ShowMcsDataChartApiMcsDataFrameIdPngGetApiArg = {
  frameId: number;
  /** 画像幅（px） */
  width?: number;
  /** 画像高さ（px） */
  height?: number;
};
export type RootApiGetApiResponse = /** status 200 Successful Response */ any;
export type RootApiGetApiArg = void;
export type HealthResponse = {
  status: string;
  timestamp: string;
  version: string;
};
export type LoginResponse = {
  success: boolean;
  user_id?: string | null;
  message?: string | null;
};
export type ValidationError = {
  loc: (string | number)[];
  msg: string;
  type: string;
};
export type HttpValidationError = {
  detail?: ValidationError[];
};
export type LoginRequest = {
  username: string;
  password: string;
};
export type LogoutResponse = {
  success: boolean;
  message: string;
};
export type UserResponse = {
  user_id: string;
};
export type ObslogUser = {
  id: number;
  account_name: string;
};
export type VisitNote = {
  id: number;
  user_id: number;
  pfs_visit_id: number;
  body: string;
  user: ObslogUser;
};
export type VisitListEntry = {
  id: number;
  description?: string | null;
  issued_at?: string | null;
  iic_sequence_id?: number | null;
  n_sps_exposures?: number;
  n_mcs_exposures?: number;
  n_agc_exposures?: number;
  avg_exptime?: number | null;
  avg_azimuth?: number | null;
  avg_altitude?: number | null;
  avg_ra?: number | null;
  avg_dec?: number | null;
  avg_insrot?: number | null;
  notes?: VisitNote[];
  pfs_design_id?: string | null;
};
export type SequenceGroup = {
  group_id: number;
  group_name?: string | null;
  created_at?: string | null;
};
export type VisitSetNote = {
  id: number;
  user_id: number;
  iic_sequence_id: number;
  body: string;
  user: ObslogUser;
};
export type IicSequence = {
  iic_sequence_id: number;
  sequence_type?: string | null;
  name?: string | null;
  comments?: string | null;
  cmd_str?: string | null;
  group_id?: number | null;
  created_at?: string | null;
  group?: SequenceGroup | null;
  notes?: VisitSetNote[];
};
export type VisitList = {
  visits: VisitListEntry[];
  iic_sequences: IicSequence[];
  count: number;
};
export type SpsAnnotation = {
  annotation_id: number;
  data_flag?: number | null;
  notes?: string | null;
  created_at?: string | null;
};
export type SpsExposure = {
  camera_id: number;
  exptime?: number | null;
  exp_start?: string | null;
  exp_end?: string | null;
  annotations?: SpsAnnotation[];
};
export type SpsVisitDetail = {
  exp_type?: string | null;
  exposures?: SpsExposure[];
};
export type McsExposureNote = {
  id: number;
  body: string;
  user: ObslogUser;
};
export type McsExposure = {
  frame_id: number;
  exptime?: number | null;
  altitude?: number | null;
  azimuth?: number | null;
  insrot?: number | null;
  adc_pa?: number | null;
  dome_temperature?: number | null;
  dome_pressure?: number | null;
  dome_humidity?: number | null;
  outside_temperature?: number | null;
  outside_pressure?: number | null;
  outside_humidity?: number | null;
  mcs_cover_temperature?: number | null;
  mcs_m1_temperature?: number | null;
  taken_at?: string | null;
  notes?: McsExposureNote[];
};
export type McsVisitDetail = {
  exposures?: McsExposure[];
};
export type AgcGuideOffset = {
  ra?: number | null;
  dec?: number | null;
  pa?: number | null;
  delta_ra?: number | null;
  delta_dec?: number | null;
  delta_insrot?: number | null;
  delta_az?: number | null;
  delta_el?: number | null;
  delta_z?: number | null;
  delta_z1?: number | null;
  delta_z2?: number | null;
  delta_z3?: number | null;
  delta_z4?: number | null;
  delta_z5?: number | null;
  delta_z6?: number | null;
};
export type AgcExposure = {
  id: number;
  exptime?: number | null;
  altitude?: number | null;
  azimuth?: number | null;
  insrot?: number | null;
  adc_pa?: number | null;
  m2_pos3?: number | null;
  outside_temperature?: number | null;
  outside_pressure?: number | null;
  outside_humidity?: number | null;
  measurement_algorithm?: string | null;
  version_actor?: string | null;
  version_instdata?: string | null;
  taken_at?: string | null;
  guide_offset?: AgcGuideOffset | null;
};
export type AgcVisitDetail = {
  exposures?: AgcExposure[];
};
export type IicSequenceStatus = {
  iic_sequence_id: number;
  status_flag?: number | null;
  cmd_output?: string | null;
};
export type IicSequenceDetail = {
  iic_sequence_id: number;
  sequence_type?: string | null;
  name?: string | null;
  comments?: string | null;
  cmd_str?: string | null;
  group_id?: number | null;
  created_at?: string | null;
  group?: SequenceGroup | null;
  notes?: VisitSetNote[];
  status?: IicSequenceStatus | null;
};
export type VisitDetail = {
  id: number;
  description?: string | null;
  issued_at?: string | null;
  notes?: VisitNote[];
  sps?: SpsVisitDetail | null;
  mcs?: McsVisitDetail | null;
  agc?: AgcVisitDetail | null;
  iic_sequence?: IicSequenceDetail | null;
};
export type VisitRankResponse = {
  rank?: number | null;
};
export type NoteCreateResponse = {
  id: number;
};
export type NoteCreateRequest = {
  body: string;
};
export type NoteUpdateRequest = {
  body: string;
};
export type FitsType = "raw" | "calexp" | "postISRCCD";
export type Card = {
  key: string;
  value: any;
  comment: string;
};
export type FitsHeader = {
  cards: Card[];
};
export type FitsHdu = {
  index: number;
  header: FitsHeader;
};
export type FitsMeta = {
  filename: string;
  hdul: FitsHdu[];
};
export type DesignRows = {
  science: number;
  sky: number;
  fluxstd: number;
  unassigned: number;
  engineering: number;
  sunss_imaging: number;
  sunss_diffuse: number;
};
export type PfsDesignEntry = {
  id: string;
  frameid: string;
  name: string;
  date_modified: string;
  ra: number;
  dec: number;
  arms: string;
  num_design_rows: number;
  num_photometry_rows: number;
  num_guidestar_rows: number;
  design_rows: DesignRows;
};
export type DesignData = {
  fiberId: number[];
  catId: number[];
  tract: number[];
  patch: string[];
  objId: number[];
  ra: number[];
  dec: number[];
  targetType: number[];
  fiberStatus: number[];
  pfiNominal: number[][];
};
export type PhotometryData = {
  fiberId: number[];
  fiberFlux: number[];
  psfFlux: number[];
  totalFlux: number[];
  fiberFluxErr: number[];
  psfFluxErr: number[];
  totalFluxErr: number[];
  filterName: string[];
};
export type GuidestarData = {
  ra: number[];
  dec: number[];
};
export type PfsDesignDetail = {
  fits_meta: FitsMeta;
  date_modified: string;
  design_data: DesignData;
  photometry_data: PhotometryData;
  guidestar_data: GuidestarData;
};
export type CreateAttachmentResponse = {
  path: string;
};
export type BodyCreateAttachmentApiAttachmentsPost = {
  file: Blob;
};
export type AttachmentEntry = {
  id: number;
  name: string;
  account_name: string;
  media_type: string;
  exists: boolean;
};
export type AttachmentList = {
  count: number;
  entries: AttachmentEntry[];
};
export const {
  useHealthzApiHealthzGetQuery,
  useReadyzApiReadyzGetQuery,
  useLoginApiAuthLoginPostMutation,
  useLogoutApiAuthLogoutPostMutation,
  useGetMeApiAuthMeGetQuery,
  useGetStatusApiAuthStatusGetQuery,
  useListVisitsApiVisitsGetQuery,
  useGetVisitApiVisitsVisitIdGetQuery,
  useGetVisitRankApiVisitsVisitIdRankGetQuery,
  useExportVisitsCsvApiVisitsCsvGetQuery,
  useCreateVisitNoteApiVisitsVisitIdNotesPostMutation,
  useUpdateVisitNoteApiVisitsVisitIdNotesNoteIdPutMutation,
  useDeleteVisitNoteApiVisitsVisitIdNotesNoteIdDeleteMutation,
  useCreateVisitSetNoteApiVisitSetsVisitSetIdNotesPostMutation,
  useUpdateVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdPutMutation,
  useDeleteVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdDeleteMutation,
  useDownloadSpsFitsApiFitsVisitsVisitIdSpsCameraIdFitsGetQuery,
  useGetSpsFitsPreviewApiFitsVisitsVisitIdSpsCameraIdPngGetQuery,
  useGetSpsFitsHeadersApiFitsVisitsVisitIdSpsCameraIdHeadersGetQuery,
  useDownloadMcsFitsApiFitsVisitsVisitIdMcsFrameIdFitsGetQuery,
  useGetMcsFitsPreviewApiFitsVisitsVisitIdMcsFrameIdPngGetQuery,
  useGetMcsFitsHeadersApiFitsVisitsVisitIdMcsFrameIdHeadersGetQuery,
  useDownloadAgcFitsApiFitsVisitsVisitIdAgcExposureIdFitsGetQuery,
  useGetAgcFitsPreviewApiFitsVisitsVisitIdAgcExposureIdHduIndexPngGetQuery,
  useListPfsDesignsApiPfsDesignsGetQuery,
  useDownloadDesignApiPfsDesignsIdHexFitsGetQuery,
  useGetDesignApiPfsDesignsIdHexGetQuery,
  useCreateAttachmentApiAttachmentsPostMutation,
  useListAttachmentsApiAttachmentsGetQuery,
  useGetAttachmentApiAttachmentsAccountNameFileIdGetQuery,
  useDeleteAttachmentApiAttachmentsFileIdDeleteMutation,
  useShowMcsDataChartApiMcsDataFrameIdPngGetQuery,
  useRootApiGetQuery,
} = injectedRtkApi;
