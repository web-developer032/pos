import { apiSlice } from "./apiSlice";
import { PaginationInfo } from "./productsApi";

export interface InventoryItem {
  id: number;
  name: string;
  sku?: string;
  barcode?: string;
  stock_quantity: number;
  min_stock_level: number;
  category_name?: string;
}

export interface InventoryTransaction {
  id: number;
  product_id: number;
  transaction_type: "sale" | "purchase" | "adjustment";
  quantity: number;
  reference_id?: number;
  notes?: string;
  created_at: string;
  product_name?: string;
}

export interface AdjustInventoryRequest {
  product_id: number;
  quantity: number;
  transaction_type: "sale" | "purchase" | "adjustment";
  notes?: string;
}

export const inventoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInventory: builder.query<
      { inventory: InventoryItem[]; pagination: PaginationInfo },
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
        return `/inventory${query ? `?${query}` : ""}`;
      },
      providesTags: ["Inventory"],
    }),
    getTransactions: builder.query<
      { transactions: InventoryTransaction[] },
      { productId?: number } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.productId) {
          searchParams.append("product_id", params.productId.toString());
        }
        const query = searchParams.toString();
        return `/inventory/transactions${query ? `?${query}` : ""}`;
      },
      providesTags: ["Inventory"],
    }),
    adjustInventory: builder.mutation<
      { message: string; new_stock: number },
      AdjustInventoryRequest
    >({
      query: (body) => ({
        url: "/inventory/adjust",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory", "Product"],
    }),
  }),
});

export const {
  useGetInventoryQuery,
  useGetTransactionsQuery,
  useAdjustInventoryMutation,
} = inventoryApi;

