"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import QueryProvider from "./QueryProvider";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <QueryProvider>
            <AuthProvider>
                {children}
                <Toaster />
            </AuthProvider>
        </QueryProvider>
    );
}
