import { apiSlice } from "./apiSlice";
import { PaginationInfo } from "./productsApi";

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: "admin" | "cashier" | "manager";
}

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<
      { users: User[]; pagination: PaginationInfo },
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
        return `/users${query ? `?${query}` : ""}`;
      },
      providesTags: ["User"],
    }),
    createUser: builder.mutation<{ user: User }, CreateUserRequest>({
      query: (body) => ({
        url: "/users",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    deleteAllUsers: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/users?delete_all=true",
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useDeleteAllUsersMutation,
} = usersApi;

