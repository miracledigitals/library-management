"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: ("admin" | "librarian" | "patron")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                if (pathname !== "/login") {
                    router.replace("/login");
                }
            } else if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
                // Redirect to dashboard if they don't have the right role
                if (pathname !== "/dashboard") {
                    router.replace("/dashboard");
                }
            }
        }
    }, [user, profile, loading, router, allowedRoles, pathname]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!user) return null;
    
    if (!profile) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Finalizing your session...</p>
                </div>
            </div>
        );
    }

    if (allowedRoles && !allowedRoles.includes(profile.role)) return null;

    return <>{children}</>;
}
