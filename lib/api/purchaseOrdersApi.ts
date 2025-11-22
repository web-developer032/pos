import { apiSlice } from "./apiSlice";
import { PaginationInfo } from "./productsApi";

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  user_id: number;
  total_amount: number;
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
  subtotal: number;
  product_name?: string;
}

export interface CreatePurchaseOrderRequest {
  supplier_id: number;
  items: {
    product_id: number;
    quantity: number;
    unit_cost: number;
  }[];
}

export interface UpdatePurchaseOrderItemsRequest {
  supplier_id?: number;
  items?: {
    product_id: number;
    quantity: number;
    unit_cost: number;
  }[];
}

export const purchaseOrdersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPurchaseOrders: builder.query<
      { purchase_orders: PurchaseOrder[]; pagination: PaginationInfo },
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
  useDeleteAllPurchaseOrdersMutation,
} = purchaseOrdersApi;
