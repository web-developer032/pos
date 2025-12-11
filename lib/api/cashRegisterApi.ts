import { apiSlice } from "./apiSlice";

export interface CashRegisterSession {
  id: number;
  user_id: number;
  user_name?: string;
  opening_balance: number;
  closing_balance: number | null;
  expected_balance: number | null;
  variance: number | null;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

export interface SalesByMethod {
  payment_method: string;
  transaction_count: number;
  total_amount: number;
  total_profit?: number;
}

export interface ReturnsByMethod {
  refund_method: string;
  return_count: number;
  total_refund: number;
}

export interface ExpensesByMethod {
  payment_method: string;
  category: string;
  expense_count: number;
  total_amount: number;
}

export interface DaySummary {
  session: {
    id: number;
    opening_balance: number;
    opened_at: string;
  } | null;
  sales: {
    by_method: SalesByMethod[];
    total: {
      transaction_count: number;
      total_amount: number;
    };
  };
  returns: {
    by_method: ReturnsByMethod[];
    total: {
      return_count: number;
      total_refund: number;
    };
  };
  expenses: {
    by_method: ExpensesByMethod[];
    total: {
      expense_count: number;
      total_amount: number;
    };
  };
  cash_summary: {
    opening_balance: number;
    cash_sales: number;
    cash_refunds: number;
    cash_expenses: number;
    expected_balance: number;
  };
}

export interface SessionHistory {
  sessions: CashRegisterSession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SessionDetails {
  session: CashRegisterSession;
  sales: SalesByMethod[];
  returns: ReturnsByMethod[];
  expenses: ExpensesByMethod[];
}

export interface OpenDayRequest {
  opening_balance: number;
  user_id: number;
  notes?: string;
}

export interface CloseDayRequest {
  closing_balance: number;
  notes?: string;
}

export interface CloseDayResponse {
  message: string;
  session: CashRegisterSession;
  summary: {
    opening_balance: number;
    cash_sales: number;
    cash_refunds: number;
    cash_expenses: number;
    expected_balance: number;
    closing_balance: number;
    variance: number;
  };
}

export interface UpdateSessionRequest {
  id: number;
  opening_balance?: number;
  closing_balance?: number;
  notes?: string;
}

export const cashRegisterApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get current open session
    getCurrentSession: builder.query<
      { session: CashRegisterSession | null; isOpen: boolean },
      void
    >({
      query: () => "/cash-register/current",
      providesTags: ["CashRegister"],
    }),

    // Open a new day session
    openDay: builder.mutation<
      { message: string; session: CashRegisterSession },
      OpenDayRequest
    >({
      query: (data) => ({
        url: "/cash-register/open",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["CashRegister"],
    }),

    // Close the current session
    closeDay: builder.mutation<CloseDayResponse, CloseDayRequest>({
      query: (data) => ({
        url: "/cash-register/close",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["CashRegister"],
    }),

    // Get day summary
    getDaySummary: builder.query<DaySummary, void>({
      query: () => "/cash-register/summary",
      providesTags: ["CashRegister"],
    }),

    // Get session history
    getSessionHistory: builder.query<
      SessionHistory,
      { page?: number; limit?: number }
    >({
      query: ({ page = 1, limit = 25 } = {}) =>
        `/cash-register/history?page=${page}&limit=${limit}`,
      providesTags: ["CashRegister"],
    }),

    // Get specific session details
    getSessionDetails: builder.query<SessionDetails, number>({
      query: (id) => `/cash-register/${id}`,
      providesTags: ["CashRegister"],
    }),

    // Update session balances
    updateSession: builder.mutation<
      { message: string; session: CashRegisterSession },
      UpdateSessionRequest
    >({
      query: ({ id, ...data }) => ({
        url: `/cash-register/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["CashRegister"],
    }),
  }),
});

export const {
  useGetCurrentSessionQuery,
  useOpenDayMutation,
  useCloseDayMutation,
  useGetDaySummaryQuery,
  useGetSessionHistoryQuery,
  useGetSessionDetailsQuery,
  useUpdateSessionMutation,
} = cashRegisterApi;

