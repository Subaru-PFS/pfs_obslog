/**
 * Enhanced API with cache invalidation
 *
 * This file extends the generated API with proper cache tags
 * for authentication-related endpoints.
 */
import { generatedApi } from "./generatedApi";

export const enhancedApi = generatedApi.enhanceEndpoints({
  endpoints: {
    // Auth status endpoint provides the AuthStatus tag
    getStatusApiAuthStatusGet: {
      providesTags: ["AuthStatus"],
    },
    // Login invalidates auth status cache
    loginApiAuthLoginPost: {
      invalidatesTags: ["AuthStatus"],
    },
    // Logout invalidates auth status cache
    logoutApiAuthLogoutPost: {
      invalidatesTags: ["AuthStatus"],
    },
  },
});

// Re-export hooks from the enhanced API
export const {
  useHealthzApiHealthzGetQuery,
  useReadyzApiReadyzGetQuery,
  useLoginApiAuthLoginPostMutation,
  useLogoutApiAuthLogoutPostMutation,
  useGetMeApiAuthMeGetQuery,
  useGetStatusApiAuthStatusGetQuery,
  useRootApiGetQuery,
} = enhancedApi;
