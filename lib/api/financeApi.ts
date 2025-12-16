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

export interface OtherIncome {
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

export interface OtherIncomeSummary {
  total_income: number;
  by_category: Array<{ category: string; category_total: number }>;
}

export interface CreateOtherIncomeRequest {
  amount: number;
  category: string;
  description?: string;
  payment_method: "cash" | "card" | "bank_transfer" | "other";
  reference_number?: string;
  notes?: string;
}

export interface UpdateOtherIncomeRequest {
  amount?: number;
  category?: string;
  description?: string;
  payment_method?: "cash" | "card" | "bank_transfer" | "other";
  reference_number?: string;
  notes?: string;
}

// Employee interfaces
export interface Employee {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  salary_type: "monthly" | "daily";
  base_salary: number;
  join_date?: string;
  status: "active" | "inactive";
  notes?: string;
  created_at: string;
  updated_at: string;
  total_paid?: number;
}

export interface EmployeeSummary {
  total_employees: number;
  active_employees: number;
  monthly_salary_total: number;
  daily_rate_total: number;
}

export interface CreateEmployeeRequest {
  name: string;
  phone?: string;
  address?: string;
  salary_type: "monthly" | "daily";
  base_salary: number;
  join_date?: string;
  status?: "active" | "inactive";
  notes?: string;
}

export interface UpdateEmployeeRequest {
  name?: string;
  phone?: string;
  address?: string;
  salary_type?: "monthly" | "daily";
  base_salary?: number;
  join_date?: string;
  status?: "active" | "inactive";
  notes?: string;
}

// Salary Payment interfaces
export interface SalaryPayment {
  id: number;
  employee_id: number;
  amount: number;
  payment_type: "salary" | "advance" | "bonus" | "deduction";
  period: string;
  days_worked?: number;
  payment_method: "cash" | "bank_transfer" | "check" | "other";
  notes?: string;
  user_id: number;
  created_at: string;
  employee_name?: string;
  salary_type?: string;
  user_name?: string;
}

export interface SalaryPaymentSummary {
  total_salary: number;
  total_advance: number;
  total_deductions: number;
  total_bonus: number;
  net_paid: number;
}

export interface CreateSalaryPaymentRequest {
  employee_id: number;
  amount: number;
  payment_type: "salary" | "advance" | "bonus" | "deduction";
  period: string;
  days_worked?: number;
  payment_method: "cash" | "bank_transfer" | "check" | "other";
  notes?: string;
}

export interface UpdateSalaryPaymentRequest {
  amount?: number;
  payment_type?: "salary" | "advance" | "bonus" | "deduction";
  period?: string;
  days_worked?: number;
  payment_method?: "cash" | "bank_transfer" | "check" | "other";
  notes?: string;
}

export interface FinanceSummary {
  total_capital: number;
  total_revenue: number;
  total_expenses: number;
  total_profit: number;
  total_other_income: number;
  total_salaries_paid: number;
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
        if (params?.startDate)
          searchParams.append("start_date", params.startDate);
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
    createCapital: builder.mutation<{ capital: Capital }, CreateCapitalRequest>(
      {
        query: (body) => ({
          url: "/capital",
          method: "POST",
          body,
        }),
        invalidatesTags: ["Capital", "Finance"],
      }
    ),
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
        if (params?.startDate)
          searchParams.append("start_date", params.startDate);
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
    createExpense: builder.mutation<{ expense: Expense }, CreateExpenseRequest>(
      {
        query: (body) => ({
          url: "/expenses",
          method: "POST",
          body,
        }),
        invalidatesTags: ["Expense", "Finance"],
      }
    ),
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
    // Other Income endpoints
    getOtherIncome: builder.query<
      { income: OtherIncome[]; summary: OtherIncomeSummary },
      { startDate?: string; endDate?: string; category?: string } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.startDate)
          searchParams.append("start_date", params.startDate);
        if (params?.endDate) searchParams.append("end_date", params.endDate);
        if (params?.category) searchParams.append("category", params.category);
        const query = searchParams.toString();
        return `/other-income${query ? `?${query}` : ""}`;
      },
      providesTags: ["OtherIncome"],
    }),
    getOtherIncomeRecord: builder.query<{ income: OtherIncome }, number>({
      query: (id) => `/other-income/${id}`,
      providesTags: (result, error, id) => [{ type: "OtherIncome", id }],
    }),
    createOtherIncome: builder.mutation<
      { income: OtherIncome },
      CreateOtherIncomeRequest
    >({
      query: (body) => ({
        url: "/other-income",
        method: "POST",
        body,
      }),
      invalidatesTags: ["OtherIncome", "Finance"],
    }),
    updateOtherIncome: builder.mutation<
      { income: OtherIncome },
      { id: number; data: UpdateOtherIncomeRequest }
    >({
      query: ({ id, data }) => ({
        url: `/other-income/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "OtherIncome", id },
        "Finance",
      ],
    }),
    deleteOtherIncome: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/other-income/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["OtherIncome", "Finance"],
    }),
    // Employee endpoints
    getEmployees: builder.query<
      { employees: Employee[]; summary: EmployeeSummary },
      { status?: string; search?: string } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.status) searchParams.append("status", params.status);
        if (params?.search) searchParams.append("search", params.search);
        const query = searchParams.toString();
        return `/employees${query ? `?${query}` : ""}`;
      },
      providesTags: ["Employee"],
    }),
    getEmployee: builder.query<
      { employee: Employee; recent_payments: SalaryPayment[] },
      number
    >({
      query: (id) => `/employees/${id}`,
      providesTags: (result, error, id) => [{ type: "Employee", id }],
    }),
    createEmployee: builder.mutation<
      { employee: Employee },
      CreateEmployeeRequest
    >({
      query: (body) => ({
        url: "/employees",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Employee", "Finance"],
    }),
    updateEmployee: builder.mutation<
      { employee: Employee },
      { id: number; data: UpdateEmployeeRequest }
    >({
      query: ({ id, data }) => ({
        url: `/employees/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Employee", id },
        "Employee",
        "Finance",
      ],
    }),
    deleteEmployee: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/employees/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Employee", "Finance"],
    }),
    // Salary Payment endpoints
    getSalaryPayments: builder.query<
      {
        payments: SalaryPayment[];
        summary: SalaryPaymentSummary;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      },
      {
        employeeId?: number;
        startDate?: string;
        endDate?: string;
        period?: string;
        search?: string;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.employeeId)
          searchParams.append("employee_id", params.employeeId.toString());
        if (params?.startDate)
          searchParams.append("start_date", params.startDate);
        if (params?.endDate) searchParams.append("end_date", params.endDate);
        if (params?.period) searchParams.append("period", params.period);
        if (params?.search) searchParams.append("search", params.search);
        if (params?.page) searchParams.append("page", params.page.toString());
        if (params?.limit)
          searchParams.append("limit", params.limit.toString());
        const query = searchParams.toString();
        return `/salary-payments${query ? `?${query}` : ""}`;
      },
      providesTags: ["SalaryPayment"],
    }),
    getSalaryPayment: builder.query<{ payment: SalaryPayment }, number>({
      query: (id) => `/salary-payments/${id}`,
      providesTags: (result, error, id) => [{ type: "SalaryPayment", id }],
    }),
    createSalaryPayment: builder.mutation<
      { payment: SalaryPayment },
      CreateSalaryPaymentRequest
    >({
      query: (body) => ({
        url: "/salary-payments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SalaryPayment", "Employee", "Finance"],
    }),
    updateSalaryPayment: builder.mutation<
      { payment: SalaryPayment },
      { id: number; data: UpdateSalaryPaymentRequest }
    >({
      query: ({ id, data }) => ({
        url: `/salary-payments/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "SalaryPayment", id },
        "SalaryPayment",
        "Employee",
        "Finance",
      ],
    }),
    deleteSalaryPayment: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/salary-payments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SalaryPayment", "Employee", "Finance"],
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
  useGetOtherIncomeQuery,
  useGetOtherIncomeRecordQuery,
  useCreateOtherIncomeMutation,
  useUpdateOtherIncomeMutation,
  useDeleteOtherIncomeMutation,
  useGetEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetSalaryPaymentsQuery,
  useGetSalaryPaymentQuery,
  useCreateSalaryPaymentMutation,
  useUpdateSalaryPaymentMutation,
  useDeleteSalaryPaymentMutation,
} = financeApi;
