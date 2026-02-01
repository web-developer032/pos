import { NextRequest, NextResponse } from "next/server";
import { verifyToken, extractTokenFromHeader } from "../auth/auth";
import { getActiveSubscription } from "../auth/subscription";
import { hasFeature } from "@/lib/constants/planFeatures";
import type { PlanType } from "@/lib/constants/planFeatures";
import type { FeatureKey } from "@/lib/constants/planFeatures";

export interface AuthRequest extends NextRequest {
  user?: {
    userId: number;
    username: string;
    role: string;
    plan?: PlanType | null;
  };
}

export type RouteContext = { params: Promise<{ [key: string]: string }> };

export type RequireAuthOptions = {
  allowedRoles?: string[];
  requiredFeature?: FeatureKey;
};

type RequireAuthHandler = (
  req: NextRequest,
  context: RouteContext
) => Promise<NextResponse>;

const defaultContext: RouteContext = { params: Promise.resolve({}) };

/** Require auth, optional role check, optional plan feature. Admin role bypasses plan check for feature gating. */
export function requireAuth(
  handler: (req: AuthRequest, context?: RouteContext) => Promise<NextResponse>,
  optionsOrAllowedRoles?: string[] | RequireAuthOptions
): RequireAuthHandler {
  const options: RequireAuthOptions =
    Array.isArray(optionsOrAllowedRoles)
      ? { allowedRoles: optionsOrAllowedRoles }
      : optionsOrAllowedRoles ?? {};

  const { allowedRoles, requiredFeature } = options;

  return async (
    req: NextRequest,
    context: RouteContext = defaultContext
  ): Promise<NextResponse> => {
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

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions" },
        { status: 403 }
      );
    }

    const authReq = req as AuthRequest;
    authReq.user = { ...payload };

    if (requiredFeature) {
      const subscription = await getActiveSubscription(payload.userId);
      if (!subscription) {
        return NextResponse.json(
          { error: "No active subscription" },
          { status: 403 }
        );
      }
      const plan = subscription.plan as PlanType;
      if (payload.role !== "admin" && !hasFeature(plan, requiredFeature)) {
        return NextResponse.json(
          { error: "Plan does not include this feature" },
          { status: 403 }
        );
      }
      authReq.user.plan = plan;
    }

    return handler(authReq, context ?? defaultContext);
  };
}
