import { apiSlice } from "./apiSlice";
import { PaginationInfo } from "./productsApi";

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyalty_points: number;
  credit_balance: number;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerPayment {
  id: number;
  customer_id: number;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  user_id: number;
  recorded_by?: string;
  created_at: string;
}

export interface CreateCustomerPaymentRequest {
  amount: number;
  payment_method: "cash" | "card" | "bank_transfer" | "other";
  reference_number?: string;
  notes?: string;
}

export interface UnpaidSale {
  id: number;
  sale_number: string;
  final_amount: number;
  payment_status: string;
  payment_method: string;
  created_at: string;
  amount_paid: number;
  amount_due: number;
}

export interface CustomerCreditSummary {
  customer: {
    id: number;
    name: string;
    phone: string | null;
    credit_balance: number;
  };
  unpaid_sales: UnpaidSale[];
  recent_payments: CustomerPayment[];
  summary: {
    total_credit_sales: number;
    total_credit_amount: number;
    total_payments_received: number;
    current_balance: number;
  };
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
      { customers: Customer[]; pagination: PaginationInfo },
      { search?: string; page?: number; limit?: number } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.search) {
          searchParams.append("search", params.search);
        }
        if (params?.page) {
          searchParams.append("page", params.page.toString());
        }
        if (params?.limit) {
          searchParams.append("limit", params.limit.toString());
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
    deleteAllCustomers: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/customers?delete_all=true",
        method: "DELETE",
      }),
      invalidatesTags: ["Customer"],
    }),
    // Credit management endpoints
    getCustomerCredit: builder.query<CustomerCreditSummary, number>({
      query: (id) => `/customers/${id}/credit`,
      providesTags: (result, error, id) => [
        { type: "Customer", id },
        { type: "CustomerPayment", id: `customer-${id}` },
      ],
    }),
    getCustomerPayments: builder.query<
      {
        payments: CustomerPayment[];
        total_paid: number;
        pagination: PaginationInfo;
      },
      { customerId: number; page?: number; limit?: number }
    >({
      query: ({ customerId, page, limit }) => {
        const params = new URLSearchParams();
        if (page) params.append("page", page.toString());
        if (limit) params.append("limit", limit.toString());
        const query = params.toString();
        return `/customers/${customerId}/payments${query ? `?${query}` : ""}`;
      },
      providesTags: (result, error, { customerId }) => [
        { type: "CustomerPayment", id: `customer-${customerId}` },
      ],
    }),
    createCustomerPayment: builder.mutation<
      { payment: CustomerPayment; new_balance: number; message: string },
      { customerId: number; data: CreateCustomerPaymentRequest }
    >({
      query: ({ customerId, data }) => ({
        url: `/customers/${customerId}/payments`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { customerId }) => [
        { type: "Customer", id: customerId },
        { type: "CustomerPayment", id: `customer-${customerId}` },
        "Customer", // Refresh customer list to update balance column
      ],
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
  useDeleteAllCustomersMutation,
  useGetCustomerCreditQuery,
  useGetCustomerPaymentsQuery,
  useCreateCustomerPaymentMutation,
} = customersApi;
