import { NextRequest, NextResponse } from "next/server";
import { verifyToken, extractTokenFromHeader } from "../auth/auth";

export interface AuthRequest extends NextRequest {
  user?: {
    userId: number;
    username: string;
    role: string;
  };
}

export type RouteContext = { params: Promise<{ [key: string]: string }> };

export function requireAuth(
  handler: (req: AuthRequest, context?: RouteContext) => Promise<NextResponse>,
  allowedRoles?: string[]
) {
  return async (
    req: NextRequest,
    context?: RouteContext
  ): Promise<NextResponse> => {
    // Try to get token from cookie first, then from Authorization header
    const cookieToken = req.cookies.get("auth_token")?.value;
    const authHeader = req.headers.get("authorization");
    const headerToken = extractTokenFromHeader(authHeader);
    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions" },
        { status: 403 }
      );
    }

    (req as AuthRequest).user = payload;
    return handler(req as AuthRequest, context);
  };
}
