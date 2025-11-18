import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";

const baseQuery = fetchBaseQuery({
  baseUrl: "/api",
  credentials: "include", // Include cookies in requests
  prepareHeaders: (headers, { getState }) => {
    // Token is now in httpOnly cookie, but we can still send it in header as fallback
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const apiSlice = createApi({
  baseQuery,
  tagTypes: [
    "Product",
    "Category",
    "Supplier",
    "Customer",
    "Sale",
    "PurchaseOrder",
    "Inventory",
    "User",
    "Report",
  ],
  endpoints: () => ({}),
});

