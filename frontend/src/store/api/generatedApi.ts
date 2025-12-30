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
export const {
  useHealthzApiHealthzGetQuery,
  useReadyzApiReadyzGetQuery,
  useLoginApiAuthLoginPostMutation,
  useLogoutApiAuthLogoutPostMutation,
  useGetMeApiAuthMeGetQuery,
  useGetStatusApiAuthStatusGetQuery,
  useListVisitsApiVisitsGetQuery,
  useRootApiGetQuery,
} = injectedRtkApi;
