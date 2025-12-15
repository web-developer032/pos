import { apiSlice } from "./apiSlice";

export interface Capital {
  id: number;
  amount: number;
  description?: string;
  transaction_type: "investment" | "withdrawal";
  notes?: string;
  user_id: number;
  created_at: string;
  user_name?: string;
}

export interface CapitalSummary {
  total_investments: number;
  total_withdrawals: number;
  net_capital: number;
}

export interface CreateCapitalRequest {
  amount: number;
  description?: string;
  transaction_type: "investment" | "withdrawal";
  notes?: string;
}

export interface UpdateCapitalRequest {
  amount?: number;
  description?: string;
  transaction_type?: "investment" | "withdrawal";
  notes?: string;
}

export interface Expense {
  id: number;
  amount: number;
  category: string;
  description?: string;
  payment_method: "cash" | "card" | "bank_transfer" | "other";
  reference_number?: string;
  notes?: string;
  user_id: number;
  created_at: string;
  user_name?: string;
}

export interface ExpenseSummary {
  total_expenses: number;
  by_category: Array<{ category: string; category_total: number }>;
}

export interface CreateExpenseRequest {
  amount: number;
  category: string;
  description?: string;
  payment_method: "cash" | "card" | "bank_transfer" | "other";
  reference_number?: string;
  notes?: string;
}

export interface UpdateExpenseRequest {
  amount?: number;
  category?: string;
  description?: string;
  payment_method?: "cash" | "card" | "bank_transfer" | "other";
  reference_number?: string;
  notes?: string;
}

export interface FinanceSummary {
  total_capital: number;
  total_expenses: number;
  total_profit: number;
  net_balance: number;
}

export const financeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCapital: builder.query<
      { capital: Capital[]; summary: CapitalSummary },
      { startDate?: string; endDate?: string } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.startDate) searchParams.append("start_date", params.startDate);
        if (params?.endDate) searchParams.append("end_date", params.endDate);
        const query = searchParams.toString();
        return `/capital${query ? `?${query}` : ""}`;
      },
      providesTags: ["Capital"],
    }),
    getCapitalRecord: builder.query<{ capital: Capital }, number>({
      query: (id) => `/capital/${id}`,
      providesTags: (result, error, id) => [{ type: "Capital", id }],
    }),
    createCapital: builder.mutation<{ capital: Capital }, CreateCapitalRequest>({
      query: (body) => ({
        url: "/capital",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Capital", "Finance"],
    }),
    updateCapital: builder.mutation<
      { capital: Capital },
      { id: number; data: UpdateCapitalRequest }
    >({
      query: ({ id, data }) => ({
        url: `/capital/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Capital", id },
        "Finance",
      ],
    }),
    deleteCapital: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/capital/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Capital", "Finance"],
    }),
    getExpenses: builder.query<
      { expenses: Expense[]; summary: ExpenseSummary },
      { startDate?: string; endDate?: string; category?: string } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.startDate) searchParams.append("start_date", params.startDate);
        if (params?.endDate) searchParams.append("end_date", params.endDate);
        if (params?.category) searchParams.append("category", params.category);
        const query = searchParams.toString();
        return `/expenses${query ? `?${query}` : ""}`;
      },
      providesTags: ["Expense"],
    }),
    getExpense: builder.query<{ expense: Expense }, number>({
      query: (id) => `/expenses/${id}`,
      providesTags: (result, error, id) => [{ type: "Expense", id }],
    }),
    createExpense: builder.mutation<{ expense: Expense }, CreateExpenseRequest>({
      query: (body) => ({
        url: "/expenses",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Expense", "Finance"],
    }),
    updateExpense: builder.mutation<
      { expense: Expense },
      { id: number; data: UpdateExpenseRequest }
    >({
      query: ({ id, data }) => ({
        url: `/expenses/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Expense", id },
        "Finance",
      ],
    }),
    deleteExpense: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/expenses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Expense", "Finance"],
    }),
    getFinanceSummary: builder.query<FinanceSummary, void>({
      query: () => "/finance/summary",
      providesTags: ["Finance"],
    }),
  }),
});

export const {
  useGetCapitalQuery,
  useGetCapitalRecordQuery,
  useCreateCapitalMutation,
  useUpdateCapitalMutation,
  useDeleteCapitalMutation,
  useGetExpensesQuery,
  useGetExpenseQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetFinanceSummaryQuery,
} = financeApi;

