import { apiSlice } from "./apiSlice";
import { PaginationInfo } from "./productsApi";

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
}

export const categoriesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<
      { categories: Category[]; pagination: PaginationInfo },
      { page?: number; limit?: number } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.page) {
          searchParams.append("page", params.page.toString());
        }
        if (params?.limit) {
          searchParams.append("limit", params.limit.toString());
        }
        const query = searchParams.toString();
        return `/categories${query ? `?${query}` : ""}`;
      },
      providesTags: ["Category"],
    }),
    getCategory: builder.query<{ category: Category }, number>({
      query: (id) => `/categories/${id}`,
      providesTags: (result, error, id) => [{ type: "Category", id }],
    }),
    createCategory: builder.mutation<{ category: Category }, CreateCategoryRequest>({
      query: (body) => ({
        url: "/categories",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Category"],
    }),
    updateCategory: builder.mutation<
      { category: Category },
      { id: number; data: UpdateCategoryRequest }
    >({
      query: ({ id, data }) => ({
        url: `/categories/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Category", id }],
    }),
    deleteCategory: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Category"],
    }),
    importCategories: builder.mutation<
      { message: string; imported: number; errors: string[] },
      { categories: CreateCategoryRequest[] }
    >({
      query: (body) => ({
        url: "/categories/import",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Category"],
    }),
    deleteAllCategories: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/categories?delete_all=true",
        method: "DELETE",
      }),
      invalidatesTags: ["Category"],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useImportCategoriesMutation,
  useDeleteAllCategoriesMutation,
} = categoriesApi;

