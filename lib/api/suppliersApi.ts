import { apiSlice } from "./apiSlice";
import { PaginationInfo } from "./productsApi";
import type { PurchaseOrder } from "./purchaseOrdersApi";

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at?: string;
  total_purchases?: number;
  total_paid?: number;
  balance?: number;
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

export interface SupplierLedger {
  purchase_orders: PurchaseOrder[];
  payments: SupplierPayment[];
  summary: {
    total_purchases: number;
    total_paid: number;
    balance: number;
  };
}

export interface SupplierPayment {
  id: number;
  supplier_id: number;
  purchase_order_id?: number;
  amount: number;
  payment_method: "cash" | "bank_transfer" | "check" | "other";
  reference_number?: string;
  notes?: string;
  user_id: number;
  created_at: string;
  user_name?: string;
  po_number?: string;
}

export interface CreateSupplierPaymentRequest {
  purchase_order_id?: number;
  amount: number;
  payment_method: "cash" | "bank_transfer" | "check" | "other";
  reference_number?: string;
  notes?: string;
}

export interface UpdateSupplierPaymentRequest {
  purchase_order_id?: number;
  amount: number;
  payment_method: "cash" | "bank_transfer" | "check" | "other";
  reference_number?: string;
  notes?: string;
}

export const suppliersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query<
      { suppliers: Supplier[]; pagination: PaginationInfo },
      { page?: number; limit?: number; search?: string } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.page) {
          searchParams.append("page", params.page.toString());
        }
        if (params?.limit) {
          searchParams.append("limit", params.limit.toString());
        }
        if (params?.search) {
          searchParams.append("search", params.search);
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
    createSupplier: builder.mutation<
      { supplier: Supplier },
      CreateSupplierRequest
    >({
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
    getSupplierLedger: builder.query<SupplierLedger, number>({
      query: (id) => `/suppliers/${id}/ledger`,
      providesTags: (result, error, id) => [{ type: "Supplier", id }],
    }),
    createSupplierPayment: builder.mutation<
      { payment: SupplierPayment },
      { supplierId: number; data: CreateSupplierPaymentRequest }
    >({
      query: ({ supplierId, data }) => ({
        url: `/suppliers/${supplierId}/payments`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { supplierId }) => [
        { type: "Supplier", id: supplierId },
      ],
    }),
    getSupplierPayment: builder.query<
      { payment: SupplierPayment },
      { supplierId: number; paymentId: number }
    >({
      query: ({ supplierId, paymentId }) =>
        `/suppliers/${supplierId}/payments/${paymentId}`,
      providesTags: (result, error, { paymentId }) => [
        { type: "Supplier", id: paymentId },
      ],
    }),
    updateSupplierPayment: builder.mutation<
      { payment: SupplierPayment },
      {
        supplierId: number;
        paymentId: number;
        data: UpdateSupplierPaymentRequest;
      }
    >({
      query: ({ supplierId, paymentId, data }) => ({
        url: `/suppliers/${supplierId}/payments/${paymentId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { supplierId }) => [
        { type: "Supplier", id: supplierId },
      ],
    }),
    deleteSupplierPayment: builder.mutation<
      { message: string },
      { supplierId: number; paymentId: number }
    >({
      query: ({ supplierId, paymentId }) => ({
        url: `/suppliers/${supplierId}/payments/${paymentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { supplierId }) => [
        { type: "Supplier", id: supplierId },
      ],
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
  useGetSupplierLedgerQuery,
  useCreateSupplierPaymentMutation,
  useGetSupplierPaymentQuery,
  useUpdateSupplierPaymentMutation,
  useDeleteSupplierPaymentMutation,
} = suppliersApi;
