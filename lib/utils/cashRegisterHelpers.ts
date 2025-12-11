/**
 * Cash Register shared utilities for API routes
 */

// Session row type from database
export interface SessionRow {
  id: number | bigint;
  user_id: number;
  opening_balance: number;
  closing_balance: number | null;
  expected_balance: number | null;
  variance: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  user_name: string | null;
}

// Serialized session type (safe for JSON)
export interface SerializedSession {
  id: number;
  user_id: number;
  opening_balance: number;
  closing_balance: number | null;
  expected_balance: number | null;
  variance: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  user_name: string | null;
}

/**
 * Serialize a database session row to avoid BigInt JSON issues
 */
export function serializeSession(row: SessionRow): SerializedSession {
  return {
    id: Number(row.id),
    user_id: row.user_id,
    opening_balance: row.opening_balance,
    closing_balance: row.closing_balance,
    expected_balance: row.expected_balance,
    variance: row.variance,
    status: row.status,
    opened_at: row.opened_at,
    closed_at: row.closed_at,
    notes: row.notes,
    user_name: row.user_name,
  };
}

/**
 * SQL query to fetch session with user info
 */
export const SESSION_SELECT_SQL = `
  SELECT 
    crs.id, crs.user_id, crs.opening_balance, crs.closing_balance,
    crs.expected_balance, crs.variance, crs.status, crs.opened_at,
    crs.closed_at, crs.notes, u.username as user_name
  FROM cash_register_sessions crs
  LEFT JOIN users u ON crs.user_id = u.id
`;
