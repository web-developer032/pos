import { apiSlice } from "./apiSlice";
import { PaginationInfo } from "./productsApi";

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  user_id: number;
  total_amount: number;
  discount_type?: "percentage" | "amount" | null;
  discount_value?: number | null;
  status: "pending" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
  supplier_name?: string;
  user_name?: string;
}

export interface PurchaseOrderItem {
  id: number;
  po_id: number;
  product_id: number;
  quantity: number;
  unit_cost: number;
  retail_price?: number;
  subtotal: number;
  product_name?: string;
  product_sku?: string;
  product_barcode?: string;
  product_cost_price?: number;
  product_selling_price?: number;
}

export interface CreatePurchaseOrderRequest {
  supplier_id: number;
  items: {
    product_id: number;
    quantity: number;
    unit_cost: number;
    retail_price?: number;
  }[];
  discount_type?: "percentage" | "amount";
  discount_value?: number;
}

export interface UpdatePurchaseOrderItemsRequest {
  supplier_id?: number;
  items?: {
    product_id: number;
    quantity: number;
    unit_cost: number;
    retail_price?: number;
  }[];
  discount_type?: "percentage" | "amount";
  discount_value?: number;
}

export const purchaseOrdersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPurchaseOrders: builder.query<
      {
        purchase_orders: PurchaseOrder[];
        pagination: PaginationInfo;
        summary: {
          total_completed: number;
          total_pending: number;
          grand_total: number;
          total_paid: number;
          outstanding: number;
        };
      },
      { page?: number; limit?: number; search?: string; status?: string } | void
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
        if (params?.status) {
          searchParams.append("status", params.status);
        }
        const query = searchParams.toString();
        return `/purchase-orders${query ? `?${query}` : ""}`;
      },
      providesTags: ["PurchaseOrder"],
    }),
    getPurchaseOrder: builder.query<
      { purchase_order: PurchaseOrder; items: PurchaseOrderItem[] },
      number
    >({
      query: (id) => `/purchase-orders/${id}`,
      providesTags: (result, error, id) => [{ type: "PurchaseOrder", id }],
    }),
    createPurchaseOrder: builder.mutation<
      { purchase_order: PurchaseOrder },
      CreatePurchaseOrderRequest
    >({
      query: (body) => ({
        url: "/purchase-orders",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PurchaseOrder"],
    }),
    updatePurchaseOrder: builder.mutation<
      { purchase_order: PurchaseOrder },
      { id: number; status: "pending" | "completed" | "cancelled" }
    >({
      query: ({ id, status }) => ({
        url: `/purchase-orders/${id}`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "PurchaseOrder", id },
        "Inventory",
        "Product",
      ],
    }),
    updatePurchaseOrderItems: builder.mutation<
      { purchase_order: PurchaseOrder },
      { id: number; data: UpdatePurchaseOrderItemsRequest }
    >({
      query: ({ id, data }) => ({
        url: `/purchase-orders/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "PurchaseOrder", id },
        "PurchaseOrder",
      ],
    }),
    deletePurchaseOrder: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/purchase-orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PurchaseOrder", "Inventory", "Product"],
    }),
    deleteAllPurchaseOrders: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/purchase-orders?delete_all=true",
        method: "DELETE",
      }),
      invalidatesTags: ["PurchaseOrder"],
    }),
  }),
});

export const {
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useUpdatePurchaseOrderItemsMutation,
  useDeletePurchaseOrderMutation,
  useDeleteAllPurchaseOrdersMutation,
} = purchaseOrdersApi;
