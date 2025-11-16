import { apiSlice } from "./apiSlice";

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

export const purchaseOrdersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPurchaseOrders: builder.query<{ purchase_orders: PurchaseOrder[] }, void>({
      query: () => "/purchase-orders",
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
  }),
});

export const {
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
} = purchaseOrdersApi;

