"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePatronByEmail, useCreatePatron } from "@/lib/api/patrons";
import { toast } from "sonner";
import type { MembershipType, MembershipStatus } from "@/types";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    
    // Auto-healing: Check for missing patron record and create it
    const { data: patron, isLoading: isPatronLoading } = usePatronByEmail(user?.email);
    const createPatron = useCreatePatron();
    const [isCreatingPatron, setIsCreatingPatron] = useState(false);
    const [hasTriedAutoCreate, setHasTriedAutoCreate] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login");
        }
    }, [user, loading, router]);

    // Auto-create patron if missing
    useEffect(() => {
        if (loading || isPatronLoading || !user?.email || !profile || patron || isCreatingPatron || hasTriedAutoCreate) return;

        const setupAccount = async () => {
            setIsCreatingPatron(true);
            try {
                console.log("Auto-healing: Creating missing patron record for", user.email);
                toast.info("Setting up your account profile...");
                
                await createPatron.mutateAsync({
                    memberId: `MB${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
                    email: user.email!,
                    firstName: profile.displayName?.split(' ')[0] || '',
                    lastName: profile.displayName?.split(' ').slice(1).join(' ') || '',
                    phone: '',
                    address: {
                        street: '',
                        city: '',
                        zipCode: ''
                    },
                    membershipStatus: 'active' as MembershipStatus,
                    membershipType: 'standard' as MembershipType,
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    maxBooksAllowed: 5,
                    currentCheckouts: 0,
                    totalCheckoutsHistory: 0,
                    finesDue: 0,
                    notes: ''
                });
                
                toast.success("Account setup completed!");
            } catch (error) {
                console.error("Auto-healing failed:", error);
                // Do not show error toast to avoid spamming if it happens on every page load, 
                // but since we stop retrying, one error is fine.
                // Improve error message if it's the configuration error
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                if (errorMessage.includes("Missing configuration")) {
                    toast.error("Setup failed: Missing Server Configuration (SUPABASE_SERVICE_ROLE_KEY)");
                } else {
                    toast.error("Failed to setup account automatically. Please contact support.");
                }
            } finally {
                setIsCreatingPatron(false);
                setHasTriedAutoCreate(true);
            }
        };

        setupAccount();
    }, [loading, isPatronLoading, user, profile, patron, isCreatingPatron, createPatron, hasTriedAutoCreate]);

    if (loading || (user && !patron && isCreatingPatron)) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                {isCreatingPatron && <p className="text-muted-foreground animate-pulse">Setting up your account...</p>}
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="flex min-h-[100dvh] bg-background lg:h-screen overflow-hidden">
            <Sidebar className="hidden lg:flex" />
            <div className="flex min-w-0 flex-1 flex-col h-full">
                <TopBar />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
