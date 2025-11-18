import { apiSlice } from "./apiSlice";

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyalty_points: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyalty_points?: number;
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  loyalty_points?: number;
}

export const customersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query<
      { customers: Customer[] },
      { search?: string } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.search) {
          searchParams.append("search", params.search);
        }
        const query = searchParams.toString();
        return `/customers${query ? `?${query}` : ""}`;
      },
      providesTags: ["Customer"],
    }),
    getCustomer: builder.query<{ customer: Customer }, number>({
      query: (id) => `/customers/${id}`,
      providesTags: (result, error, id) => [{ type: "Customer", id }],
    }),
    createCustomer: builder.mutation<
      { customer: Customer },
      CreateCustomerRequest
    >({
      query: (body) => ({
        url: "/customers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Customer"],
    }),
    updateCustomer: builder.mutation<
      { customer: Customer },
      { id: number; data: UpdateCustomerRequest }
    >({
      query: ({ id, data }) => ({
        url: `/customers/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Customer", id }],
    }),
    deleteCustomer: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Customer"],
    }),
    importCustomers: builder.mutation<
      { message: string; imported: number; errors: string[] },
      { customers: CreateCustomerRequest[] }
    >({
      query: (body) => ({
        url: "/customers/import",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Customer"],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useImportCustomersMutation,
} = customersApi;
