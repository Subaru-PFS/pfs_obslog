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
        },
      }),
    }),
    getVisitApiVisitsVisitIdGet: build.query<
      GetVisitApiVisitsVisitIdGetApiResponse,
      GetVisitApiVisitsVisitIdGetApiArg
    >({
      query: (queryArg) => ({ url: `/api/visits/${queryArg.visitId}` }),
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
};
export type GetVisitApiVisitsVisitIdGetApiResponse =
  /** status 200 Successful Response */ VisitDetail;
export type GetVisitApiVisitsVisitIdGetApiArg = {
  visitId: number;
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
  data_flag: number;
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
export const {
  useHealthzApiHealthzGetQuery,
  useReadyzApiReadyzGetQuery,
  useLoginApiAuthLoginPostMutation,
  useLogoutApiAuthLogoutPostMutation,
  useGetMeApiAuthMeGetQuery,
  useGetStatusApiAuthStatusGetQuery,
  useListVisitsApiVisitsGetQuery,
  useGetVisitApiVisitsVisitIdGetQuery,
  useRootApiGetQuery,
} = injectedRtkApi;
