import { emptyApi as api } from "./emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    healthzHealthzGet: build.query<
      HealthzHealthzGetApiResponse,
      HealthzHealthzGetApiArg
    >({
      query: () => ({ url: `/healthz` }),
    }),
    readyzReadyzGet: build.query<
      ReadyzReadyzGetApiResponse,
      ReadyzReadyzGetApiArg
    >({
      query: () => ({ url: `/readyz` }),
    }),
    rootGet: build.query<RootGetApiResponse, RootGetApiArg>({
      query: () => ({ url: `/` }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as generatedApi };
export type HealthzHealthzGetApiResponse =
  /** status 200 Successful Response */ HealthResponse;
export type HealthzHealthzGetApiArg = void;
export type ReadyzReadyzGetApiResponse =
  /** status 200 Successful Response */ HealthResponse;
export type ReadyzReadyzGetApiArg = void;
export type RootGetApiResponse = /** status 200 Successful Response */ any;
export type RootGetApiArg = void;
export type HealthResponse = {
  status: string;
  timestamp: string;
  version: string;
};
export const {
  useHealthzHealthzGetQuery,
  useReadyzReadyzGetQuery,
  useRootGetQuery,
} = injectedRtkApi;
