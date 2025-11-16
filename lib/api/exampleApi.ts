import { apiSlice } from "./apiSlice";

export interface ExampleItem {
  id: number;
  name: string;
  created_at?: string;
}

export const exampleApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getExamples: builder.query<ExampleItem[], void>({
      query: () => "/example",
      transformResponse: (response: { success: boolean; data: ExampleItem[] }) =>
        response.data,
    }),
    createExample: builder.mutation<
      ExampleItem,
      { name: string }
    >({
      query: (body) => ({
        url: "/example",
        method: "POST",
        body,
      }),
      transformResponse: (response: { success: boolean; data: ExampleItem }) =>
        response.data,
    }),
  }),
});

export const { useGetExamplesQuery, useCreateExampleMutation } = exampleApi;

