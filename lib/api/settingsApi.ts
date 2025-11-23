import { apiSlice } from "./apiSlice";

export interface Settings {
  [key: string]: string;
}

export const settingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<{ settings: Settings }, void>({
      query: () => "/settings",
      providesTags: ["Settings"],
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
      invalidatesTags: ["Settings"],
    }),
  }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;
