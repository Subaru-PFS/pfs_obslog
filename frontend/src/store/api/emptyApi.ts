import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/**
 * Empty API base for RTK Query code generation
 * This is injected with endpoints by the generated API
 */
export const emptyApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: [],
  endpoints: () => ({}),
});
