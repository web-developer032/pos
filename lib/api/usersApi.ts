import { apiSlice } from "./apiSlice";

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
    getUsers: builder.query<{ users: User[] }, void>({
      query: () => "/users",
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
  }),
});

export const { useGetUsersQuery, useCreateUserMutation } = usersApi;

