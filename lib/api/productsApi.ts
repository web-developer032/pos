import { apiSlice } from "./apiSlice";

export interface Product {
  id: number;
  name: string;
  barcode?: string;
  sku?: string;
  description?: string;
  category_id?: number;
  supplier_id?: number;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
  category_name?: string;
  supplier_name?: string;
}

export interface CreateProductRequest {
  name: string;
  barcode?: string;
  sku?: string;
  description?: string;
  category_id?: number;
  supplier_id?: number;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  image_url?: string;
}

export interface UpdateProductRequest {
  name?: string;
  barcode?: string;
  sku?: string;
  description?: string;
  category_id?: number;
  supplier_id?: number;
  cost_price?: number;
  selling_price?: number;
  stock_quantity?: number;
  min_stock_level?: number;
  image_url?: string;
}

export const productsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<
      { products: Product[] },
      { categoryId?: number; search?: string } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.categoryId) {
          searchParams.append("category_id", params.categoryId.toString());
        }
        if (params?.search) {
          searchParams.append("search", params.search);
        }
        const query = searchParams.toString();
        return `/products${query ? `?${query}` : ""}`;
      },
      providesTags: ["Product"],
    }),
    getProduct: builder.query<{ product: Product }, number>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),
    getProductByBarcode: builder.query<{ product: Product }, string>({
      query: (barcode) => `/products/barcode/${barcode}`,
      providesTags: ["Product"],
    }),
    createProduct: builder.mutation<{ product: Product }, CreateProductRequest>({
      query: (body) => ({
        url: "/products",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Product", "Inventory"],
    }),
    updateProduct: builder.mutation<
      { product: Product },
      { id: number; data: UpdateProductRequest }
    >({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Product", id },
        "Inventory",
      ],
    }),
    deleteProduct: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Product", "Inventory"],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useGetProductByBarcodeQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productsApi;

