import { apiSlice } from "./apiSlice";

export interface Settings {
  [key: string]: string;
}

export const settingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<{ settings: Settings }, void>({
      query: () => "/settings",
      providesTags: ["Report"],
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
    }),
  }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;

