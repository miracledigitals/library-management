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
            console.log(`Refreshing profile for user ID: ${user.id}`);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (!isMounted.current) return;

            if (error) {
                // Supabase errors often have non-enumerable properties like message, code, etc.
                // If message is missing, we check for other common properties.
                const errorMessage = error.message || error.code || (error.details ? `Details: ${error.details}` : null);
                
                if (errorMessage) {
                    console.error("Error refreshing profile from database:", errorMessage);
                } else if (typeof error === 'object' && Object.keys(error).length > 0) {
                    console.error("Error refreshing profile from database (object):", error);
                }
            }

            if (data && !error) {
                console.log("Profile refreshed from database:", data);
                setProfile({
                    id: data.id,
                    email: data.email,
                    displayName: data.display_name,
                    role: data.role,
                    currentCheckouts: data.current_checkouts,
                    finesDue: parseFloat(data.fines_due),
                    language: data.language,
                });
            } else if (!data && !error && user) {
                // If profile not found in DB during refresh, ensure we still have a fallback
                // This keeps the UI working if the trigger is slow
                const supabaseUser = user as User;
                const metadataRole = supabaseUser.user_metadata?.role || "patron";
                
                setProfile({
                    id: supabaseUser.id,
                    email: supabaseUser.email || "",
                    displayName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || "",
                    role: metadataRole,
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
    }, []);

    const handleUserChange = useCallback(async (supabaseUser: User | null) => {
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
        
        // Only set loading if we don't already have a profile for this user
        if (!profileRef.current || profileRef.current.id !== supabaseUser.id) {
            setLoading(true);
        }

        try {
            // Fetch user profile from PostgreSQL
            console.log(`Fetching profile for user ID: ${supabaseUser.id}`);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', supabaseUser.id)
                .maybeSingle();

            if (!isMounted.current || fetchingProfileFor.current !== supabaseUser.id) return;

            if (error) {
                const errorMessage = error.message || error.code || (error.details ? `Details: ${error.details}` : null);
                if (errorMessage) {
                    console.error("Error fetching profile from database:", errorMessage);
                } else if (typeof error === 'object' && Object.keys(error).length > 0) {
                    console.error("Error fetching profile from database (object):", error);
                }
            }

            if (data && !error) {
                console.log("Profile found in database:", data);
                setUser(supabaseUser);
                setProfile({
                    id: data.id,
                    email: data.email,
                    displayName: data.display_name,
                    role: data.role,
                    currentCheckouts: data.current_checkouts,
                    finesDue: parseFloat(data.fines_due),
                    language: data.language,
                });
            } else {
                // Fallback to metadata if profile not found in database
                // This ensures the user isn't locked out if the database trigger is slow or fails
                const metadataRole = supabaseUser.user_metadata?.role || "patron";
                console.warn(`Profile not found in 'profiles' table for user ${supabaseUser.id}. Falling back to metadata role: ${metadataRole}. Database operations may fail due to RLS policies.`);
                
                setUser(supabaseUser);
                setProfile({
                    id: supabaseUser.id,
                    email: supabaseUser.email || "",
                    displayName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || "",
                    role: metadataRole,
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
    }, []);

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

        // Safety timeout to prevent stuck loading
        const safetyTimeout = setTimeout(() => {
            if (loading && isMounted.current) {
                console.warn("Auth initialization timed out after 10s. Forcing loading to false.");
                setLoading(false);
            }
        }, 10000);

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
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, [handleUserChange]);

    const login = async (email: string, password: string) => {
        if (!isSupabaseConfigured) {
            throw new Error("Supabase is not configured. Please set environment variables.");
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            if (error.message.includes("Invalid login credentials")) {
                // If login fails, check if the email actually exists in our profiles to give a better error message
                const { data: profileCheck } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('email', email)
                    .maybeSingle();
                
                if (!profileCheck) {
                    throw new Error("This email is not registered. Please sign up first.");
                }
            }
            throw error;
        }

        // Proactively update user/profile to avoid waiting for onAuthStateChange
        if (data.user) {
            await handleUserChange(data.user);
        }
    };

    const register = async (email: string, password: string, fullName: string, role: "admin" | "patron" = "patron") => {
        if (!isSupabaseConfigured) {
            throw new Error("Supabase is not configured. Please set environment variables.");
        }

        // Allow registration as admin if email matches the bootstrap email
        // Otherwise, default to the requested role but we should probably restrict this in production
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_BOOTSTRAP_EMAIL;
        const isBootstrapAdmin = !!(adminEmail && email.toLowerCase() === adminEmail.toLowerCase());
        const targetRole = isBootstrapAdmin ? "admin" : role;

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: targetRole,
                },
            },
        });

        if (error) throw error;

        // Proactively update user/profile to avoid waiting for onAuthStateChange
        if (data.user) {
            await handleUserChange(data.user);
        }
    };

    const loginWithGoogle = async () => {
        if (!isSupabaseConfigured) {
            throw new Error("Supabase is not configured. Please set environment variables.");
        }
        try {
            const redirectTo = `${window.location.origin}/login`;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    queryParams: {
                        prompt: 'select_account',
                    },
                    redirectTo,
                    skipBrowserRedirect: false,
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
