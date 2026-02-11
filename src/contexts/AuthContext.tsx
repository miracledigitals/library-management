"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { UserProfile } from "@/types";
import { toast } from "sonner";

interface AuthContextType {
    user: Partial<User> | null;
    profile: UserProfile | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, fullName: string, role: "admin" | "patron") => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    isAdmin: boolean;
    isLibrarian: boolean;
    isPatron: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<Partial<User> | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const lastUserId = React.useRef<string | null>(null);
    const fetchingProfileFor = React.useRef<string | null>(null);
    const profileRef = React.useRef<UserProfile | null>(null);
    const isMounted = React.useRef(true);
    const hasShownConfigError = React.useRef(false);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const refreshProfile = useCallback(async () => {
        if (!user?.id || !isSupabaseConfigured) return;
        
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (!isMounted.current) return;

            if (data && !error) {
                setProfile({
                    id: data.id,
                    email: data.email,
                    displayName: data.display_name,
                    role: data.role,
                    currentCheckouts: data.current_checkouts,
                    finesDue: parseFloat(data.fines_due),
                });
            }
        } catch (err) {
            console.error("Error refreshing profile:", err);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!isSupabaseConfigured) return;

        const handleFocus = () => {
            refreshProfile();
        };

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                refreshProfile();
            }
        };

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibility);

        const intervalId = window.setInterval(() => {
            refreshProfile();
        }, 60000);

        return () => {
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibility);
            window.clearInterval(intervalId);
        };
    }, [refreshProfile]);

    useEffect(() => {
        if (!isSupabaseConfigured) {
            if (!hasShownConfigError.current) {
                toast.error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
                hasShownConfigError.current = true;
            }
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
        }

        const handleUserChange = async (supabaseUser: User | null) => {
            if (!isMounted.current) return;

            if (!supabaseUser) {
                setUser(null);
                setProfile(null);
                lastUserId.current = null;
                fetchingProfileFor.current = null;
                setLoading(false);
                return;
            }

            // Avoid redundant fetches if the user ID hasn't changed or is already being fetched
            if (supabaseUser.id === lastUserId.current && profileRef.current) {
                setLoading(false);
                return;
            }

            if (fetchingProfileFor.current === supabaseUser.id) {
                return;
            }

            fetchingProfileFor.current = supabaseUser.id;
            lastUserId.current = supabaseUser.id;
            setLoading(true);

            try {
                // Fetch user profile from PostgreSQL
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', supabaseUser.id)
                    .single();

                if (!isMounted.current || fetchingProfileFor.current !== supabaseUser.id) return;

                if (data && !error) {
                    setUser(supabaseUser);
                    setProfile({
                        id: data.id,
                        email: data.email,
                        displayName: data.display_name,
                        role: data.role,
                        currentCheckouts: data.current_checkouts,
                        finesDue: parseFloat(data.fines_due),
                    });
                } else {
                    setUser(supabaseUser);
                    setProfile({
                        id: supabaseUser.id,
                        email: supabaseUser.email || "",
                        displayName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || "",
                        role: "patron",
                    });
                }
            } catch (err) {
                console.error("Error in handleUserChange:", err);
            } finally {
                if (isMounted.current && fetchingProfileFor.current === supabaseUser.id) {
                    setLoading(false);
                    fetchingProfileFor.current = null;
                }
            }
        };

        const getInitialSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (isMounted.current) {
                    await handleUserChange(session?.user ?? null);
                }
            } catch (err) {
                if (isMounted.current) {
                    console.error("Error getting initial session:", err);
                    setLoading(false);
                }
            }
        };

        getInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (isMounted.current) {
                await handleUserChange(session?.user ?? null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        if (!isSupabaseConfigured) {
            throw new Error("Supabase is not configured. Please set environment variables.");
        }
        
        // Ensure email is registered before allowing login
        const { data: profileCheck, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', email)
            .maybeSingle();

        if (profileError || !profileCheck) {
            throw new Error("This email is not registered. Please sign up first.");
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const register = async (email: string, password: string, fullName: string, role: "admin" | "patron" = "patron") => {
        if (!isSupabaseConfigured) {
                throw new Error("Supabase is not configured. Please set environment variables.");
        }

        if (role === "admin" && profileRef.current?.role !== "admin") {
            throw new Error("Only admins can create new admin accounts.");
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role,
                },
            },
        });

        if (error) throw error;
    };

    const loginWithGoogle = async () => {
        if (!isSupabaseConfigured) {
            throw new Error("Supabase is not configured. Please set environment variables.");
        }
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    queryParams: {
                        prompt: 'select_account',
                    },
                    redirectTo: `${window.location.origin}/dashboard`,
                }
            });

            if (error) throw error;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to login with Google";
            console.error("Google Auth Error:", error);
            toast.error(message);
        }
    };

    const logout = async () => {
        if (!isSupabaseConfigured) {
            setUser(null);
            setProfile(null);
            lastUserId.current = null;
            return;
        }
        await supabase.auth.signOut();
    };

    const isAdmin = profile?.role === "admin";
    const isLibrarian = profile?.role === "librarian" || profile?.role === "admin";
    const isPatron = profile?.role === "patron";

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                login,
                register,
                loginWithGoogle,
                logout,
                refreshProfile,
                isAdmin,
                isLibrarian,
                isPatron,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
