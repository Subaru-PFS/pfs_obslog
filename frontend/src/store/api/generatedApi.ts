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
export const {
  useHealthzApiHealthzGetQuery,
  useReadyzApiReadyzGetQuery,
  useLoginApiAuthLoginPostMutation,
  useLogoutApiAuthLogoutPostMutation,
  useGetMeApiAuthMeGetQuery,
  useGetStatusApiAuthStatusGetQuery,
  useRootApiGetQuery,
} = injectedRtkApi;
