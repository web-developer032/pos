import { apiSlice } from "./apiSlice";

export type ProductUnit =
  | "piece"
  | "gram"
  | "kilogram"
  | "liter"
  | "milliliter";

export interface Product {
  id: number;
  name: string;
  barcode?: string;
  additional_barcodes?: string[];
  sku?: string;
  description?: string;
  category_id?: number;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  unit: ProductUnit;
  image_url?: string;
  product_type?: "simple" | "base" | "packing" | "composite";
  base_product_id?: number;
  base_unit_quantity?: number;
  composite_product_id?: number;
  composite_quantity?: number;
  is_variable_quantity?: boolean;
  created_at?: string;
  updated_at?: string;
  category_name?: string;
}

export interface CreateProductRequest {
  name: string;
  barcode?: string;
  additional_barcodes?: string[];
  sku?: string;
  description?: string;
  category_id?: number;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  unit: ProductUnit;
  image_url?: string;
  product_type?: "simple" | "base" | "packing" | "composite";
  base_product_id?: number;
  base_unit_quantity?: number;
  composite_product_id?: number;
  composite_quantity?: number;
  is_variable_quantity?: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  barcode?: string;
  additional_barcodes?: string[];
  sku?: string;
  description?: string;
  category_id?: number;
  cost_price?: number;
  selling_price?: number;
  stock_quantity?: number;
  min_stock_level?: number;
  unit?: ProductUnit;
  image_url?: string;
  product_type?: "simple" | "base" | "packing" | "composite";
  base_product_id?: number;
  base_unit_quantity?: number;
  composite_product_id?: number;
  composite_quantity?: number;
  is_variable_quantity?: boolean;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const productsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<
      { products: Product[]; pagination: PaginationInfo },
      {
        categoryId?: number;
        search?: string;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.categoryId) {
          searchParams.append("category_id", params.categoryId.toString());
        }
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
        return `/products${query ? `?${query}` : ""}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.products.map(({ id }) => ({
                type: "Product" as const,
                id,
              })),
              "Product",
            ]
          : ["Product"],
    }),
    getProduct: builder.query<{ product: Product }, number>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),
    getProductByBarcode: builder.query<{ product: Product }, string>({
      query: (barcode) => `/products/barcode/${barcode}`,
      providesTags: (result) => [
        { type: "Product", id: result?.product?.id },
        "Product",
      ],
      // Optimize caching for fast lookups
      keepUnusedDataFor: 60, // Keep in cache for 60 seconds
    }),
    createProduct: builder.mutation<{ product: Product }, CreateProductRequest>(
      {
        query: (body) => ({
          url: "/products",
          method: "POST",
          body,
        }),
        invalidatesTags: ["Product", "Inventory"],
      }
    ),
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
        "Product",
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
    importProducts: builder.mutation<
      { message: string; imported: number; errors: string[] },
      { products: CreateProductRequest[] }
    >({
      query: (body) => ({
        url: "/products/import",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Product", "Inventory"],
    }),
    deleteAllProducts: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/products?delete_all=true",
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
  useImportProductsMutation,
  useDeleteAllProductsMutation,
} = productsApi;
