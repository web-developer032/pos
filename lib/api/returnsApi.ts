import { apiSlice } from "./apiSlice";

export interface Return {
  id: number;
  return_number: string;
  sale_id: number;
  user_id: number;
  total_amount: number;
  refund_amount: number;
  refund_method: "cash" | "card" | "digital" | "store_credit";
  reason?: string;
  notes?: string;
  created_at: string;
  user_name?: string;
  sale_number?: string;
}

export interface ReturnItem {
  id: number;
  return_id: number;
  sale_item_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  product_name?: string;
  barcode?: string;
}

export interface CreateReturnRequest {
  sale_id: number;
  items: Array<{
    sale_item_id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
  }>;
  refund_method: "cash" | "card" | "digital" | "store_credit";
  reason?: string;
  notes?: string;
}

export interface SaleItemReturnStatus {
  id: number;
  original_quantity: number;
  returned_quantity: number;
}

export const returnsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getReturns: builder.query<
      { returns: Return[] },
      { saleId?: number } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.saleId) {
          searchParams.append("sale_id", params.saleId.toString());
        }
        const query = searchParams.toString();
        return `/returns${query ? `?${query}` : ""}`;
      },
      providesTags: ["Return"],
    }),
    getReturn: builder.query<
      { return: Return; items: ReturnItem[] },
      number
    >({
      query: (id) => `/returns/${id}`,
      providesTags: (result, error, id) => [{ type: "Return", id }],
    }),
    getSaleReturns: builder.query<
      {
        returns: Return[];
        return_items: ReturnItem[];
        sale_items_status: SaleItemReturnStatus[];
      },
      number
    >({
      query: (saleId) => `/sales/${saleId}/returns`,
      providesTags: (result, error, saleId) => [
        { type: "Return", id: saleId },
        { type: "Sale", id: saleId },
      ],
    }),
    createReturn: builder.mutation<
      { return: Return; items: ReturnItem[] },
      CreateReturnRequest
    >({
      query: (body) => ({
        url: "/returns",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { sale_id }) => [
        "Return",
        { type: "Sale", id: sale_id },
        "Inventory",
        "Product",
        "Report",
      ],
    }),
  }),
});

export const {
  useGetReturnsQuery,
  useGetReturnQuery,
  useGetSaleReturnsQuery,
  useCreateReturnMutation,
} = returnsApi;

