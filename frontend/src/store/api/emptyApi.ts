import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL } from "../../config";

/**
 * Empty API base for RTK Query code generation
 * This is injected with endpoints by the generated API
 */
export const emptyApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: "include", // Required to send session cookies
  }),
  tagTypes: ["AuthStatus", "VisitDetail", "VisitList"],
  endpoints: () => ({}),
});
