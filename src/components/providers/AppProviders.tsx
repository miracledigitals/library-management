"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import QueryProvider from "./QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <AuthProvider>
                    {children}
                    <Toaster />
                </AuthProvider>
            </ThemeProvider>
        </QueryProvider>
    );
}
