"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import { useGetMeQuery } from "@/lib/api/authApi";
import { useAppDispatch } from "@/lib/hooks";
import { setCredentials } from "@/lib/slices/authSlice";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, token, user } = useAppSelector((state) => state.auth);
  const { data, isLoading } = useGetMeQuery(undefined, {
    skip: !token,
  });

  useEffect(() => {
    if (token && data) {
      dispatch(
        setCredentials({
          user: data.user,
          token: token,
        })
      );
    }
  }, [data, token, dispatch]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !token) {
      router.push("/login");
    } else if (
      !isLoading &&
      isAuthenticated &&
      allowedRoles &&
      user &&
      !allowedRoles.includes(user.role)
    ) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, token, allowedRoles, router, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !token) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Access Denied</div>
      </div>
    );
  }

  return <>{children}</>;
}

