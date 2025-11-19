import { apiSlice } from "./apiSlice";
import { PaginationInfo } from "./productsApi";

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at?: string;
}

export interface CreateSupplierRequest {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const suppliersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query<
      { suppliers: Supplier[]; pagination: PaginationInfo },
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
        return `/suppliers${query ? `?${query}` : ""}`;
      },
      providesTags: ["Supplier"],
    }),
    getSupplier: builder.query<{ supplier: Supplier }, number>({
      query: (id) => `/suppliers/${id}`,
      providesTags: (result, error, id) => [{ type: "Supplier", id }],
    }),
    createSupplier: builder.mutation<{ supplier: Supplier }, CreateSupplierRequest>({
      query: (body) => ({
        url: "/suppliers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Supplier"],
    }),
    updateSupplier: builder.mutation<
      { supplier: Supplier },
      { id: number; data: UpdateSupplierRequest }
    >({
      query: ({ id, data }) => ({
        url: `/suppliers/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Supplier", id }],
    }),
    deleteSupplier: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/suppliers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Supplier"],
    }),
    importSuppliers: builder.mutation<
      { message: string; imported: number; errors: string[] },
      { suppliers: CreateSupplierRequest[] }
    >({
      query: (body) => ({
        url: "/suppliers/import",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Supplier"],
    }),
    deleteAllSuppliers: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/suppliers?delete_all=true",
        method: "DELETE",
      }),
      invalidatesTags: ["Supplier"],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useGetSupplierQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useImportSuppliersMutation,
  useDeleteAllSuppliersMutation,
} = suppliersApi;

