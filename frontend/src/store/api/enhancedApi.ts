/**
 * Enhanced API with cache invalidation
 *
 * This file extends the generated API with proper cache tags
 * for authentication-related endpoints and note operations.
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
    // Visit detail provides notes data
    getVisitApiVisitsVisitIdGet: {
      providesTags: (result, _error, arg) =>
        result ? [{ type: "VisitDetail", id: arg.visitId }] : [],
    },
    // Visit list provides sequence notes
    listVisitsApiVisitsGet: {
      providesTags: ["VisitList"],
    },
    // Note operations invalidate related caches
    createVisitNoteApiVisitsVisitIdNotesPost: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "VisitDetail", id: arg.visitId },
        "VisitList",
      ],
    },
    updateVisitNoteApiVisitsVisitIdNotesNoteIdPut: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "VisitDetail", id: arg.visitId },
        "VisitList",
      ],
    },
    deleteVisitNoteApiVisitsVisitIdNotesNoteIdDelete: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "VisitDetail", id: arg.visitId },
        "VisitList",
      ],
    },
    // Visit Set Note operations
    createVisitSetNoteApiVisitSetsVisitSetIdNotesPost: {
      invalidatesTags: ["VisitList", "VisitDetail"],
    },
    updateVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdPut: {
      invalidatesTags: ["VisitList", "VisitDetail"],
    },
    deleteVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdDelete: {
      invalidatesTags: ["VisitList", "VisitDetail"],
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
  useListVisitsApiVisitsGetQuery,
  useGetVisitApiVisitsVisitIdGetQuery,
  useCreateVisitNoteApiVisitsVisitIdNotesPostMutation,
  useUpdateVisitNoteApiVisitsVisitIdNotesNoteIdPutMutation,
  useDeleteVisitNoteApiVisitsVisitIdNotesNoteIdDeleteMutation,
  useCreateVisitSetNoteApiVisitSetsVisitSetIdNotesPostMutation,
  useUpdateVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdPutMutation,
  useDeleteVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdDeleteMutation,
  useRootApiGetQuery,
} = enhancedApi;
