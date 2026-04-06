/**
 * OwnerRoute — renders children only for the site owner.
 * Anyone else is redirected to the home page.
 * Uses Manus OAuth `openId` to identify the owner.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

interface OwnerRouteProps {
  children: React.ReactNode;
}

export default function OwnerRoute({ children }: OwnerRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      // Redirect to Manus login, return to /ops after auth
      window.location.href = getLoginUrl();
      return;
    }
    // After auth, check if the user is the owner via role
    if (user && user.role !== "admin") {
      navigate("/");
    }
  }, [loading, isAuthenticated, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== "admin")) {
    return null;
  }

  return <>{children}</>;
}
