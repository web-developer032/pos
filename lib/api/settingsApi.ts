import { apiSlice } from "./apiSlice";

export interface Settings {
  [key: string]: string;
}

export const settingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<{ settings: Settings }, void>({
      query: () => "/settings",
      providesTags: ["Report"],
      // Cache settings for 5 minutes
      keepUnusedDataFor: 300,
    }),
    updateSettings: builder.mutation<
      { message: string },
      { settings: Settings }
    >({
      query: (body) => ({
        url: "/settings",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Report"],
      // Refetch settings immediately after update
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        await queryFulfilled;
        dispatch(settingsApi.util.invalidateTags(["Report"]));
      },
    }),
  }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;
