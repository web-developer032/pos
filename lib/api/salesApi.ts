import { apiSlice } from "./apiSlice";
import { PaginationInfo } from "./productsApi";

export interface Sale {
  id: number;
  sale_number: string;
  customer_id?: number;
  user_id: number;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  user_name?: string;
  customer_name?: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  product_name?: string;
  barcode?: string;
}

export interface CreateSaleRequest {
  customer_id?: number;
  items: {
    product_id: number;
    quantity: number;
    unit_price: number;
    discount?: number;
  }[];
  discount_amount?: number;
  tax_amount?: number;
  payment_method: "cash" | "card" | "digital";
}

export const salesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSales: builder.query<
      { sales: Sale[]; pagination: PaginationInfo },
      { startDate?: string; endDate?: string; page?: number; limit?: number } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.startDate) {
          searchParams.append("start_date", params.startDate);
        }
        if (params?.endDate) {
          searchParams.append("end_date", params.endDate);
        }
        if (params?.page) {
          searchParams.append("page", params.page.toString());
        }
        if (params?.limit) {
          searchParams.append("limit", params.limit.toString());
        }
        const query = searchParams.toString();
        return `/sales${query ? `?${query}` : ""}`;
      },
      providesTags: ["Sale"],
    }),
    getSale: builder.query<
      { sale: Sale; items: SaleItem[] },
      number
    >({
      query: (id) => `/sales/${id}`,
      providesTags: (result, error, id) => [{ type: "Sale", id }],
    }),
    createSale: builder.mutation<{ sale: Sale }, CreateSaleRequest>({
      query: (body) => ({
        url: "/sales",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Sale", "Inventory", "Product", "Report"],
    }),
    deleteAllSales: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/sales?delete_all=true",
        method: "DELETE",
      }),
      invalidatesTags: ["Sale"],
    }),
  }),
});

export const {
  useGetSalesQuery,
  useGetSaleQuery,
  useCreateSaleMutation,
  useDeleteAllSalesMutation,
} = salesApi;

