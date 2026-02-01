"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGetMeQuery } from "@/lib/api/authApi";
import { useAppDispatch } from "@/lib/hooks";
import { setCredentials } from "@/lib/slices/authSlice";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  allowedFeatures?: string[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
  allowedFeatures,
}: ProtectedRouteProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Always try to get user info from /auth/me (uses cookie)
  // This will work even after page refresh since token is in httpOnly cookie
  const { data, isLoading, error } = useGetMeQuery();

  // Update auth state when we get user data from /auth/me
  useEffect(() => {
    if (data?.user) {
      dispatch(
        setCredentials({
          user: data.user,
          token: "", // Token is in httpOnly cookie, not needed in Redux
        })
      );
    }
  }, [data, dispatch]);

  // Handle authentication check
  useEffect(() => {
    if (!isLoading) {
      // If /auth/me fails (401/403), user is not authenticated
      if (
        error &&
        "status" in error &&
        (error.status === 401 || error.status === 403)
      ) {
        router.push("/login");
      } else if (
        data?.user &&
        allowedRoles &&
        allowedRoles.length > 0 &&
        !allowedRoles.includes(data.user.role)
      ) {
        router.push("/dashboard");
      } else if (
        data?.user &&
        data.user.role !== "admin" &&
        allowedFeatures &&
        allowedFeatures.length > 0 &&
        data.user.features &&
        !allowedFeatures.some((f) => data.user!.features!.includes(f))
      ) {
        router.push("/subscription");
      }
    }
  }, [isLoading, error, data, allowedRoles, allowedFeatures, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // If error and not authenticated, show nothing (redirecting to login)
  if (
    error &&
    "status" in error &&
    (error.status === 401 || error.status === 403)
  ) {
    return null;
  }

  // If we have user data, check role and feature permissions
  if (data?.user) {
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(data.user.role)) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-lg text-red-600">Access Denied</div>
        </div>
      );
    }
    if (
      data.user.role !== "admin" &&
      allowedFeatures &&
      allowedFeatures.length > 0 &&
      (!data.user.features || !allowedFeatures.some((f) => data.user!.features!.includes(f)))
    ) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center text-red-600">
            <p className="text-lg">This feature is not included in your plan.</p>
            <a href="/subscription" className="mt-2 inline-block text-indigo-600 underline">
              Upgrade plan
            </a>
          </div>
        </div>
      );
    }
    return <>{children}</>;
  }

  // If no user data and no error yet, still loading
  if (!data && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return null;
}
