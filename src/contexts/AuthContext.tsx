"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
    const isBypassActive = React.useRef(false);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const refreshProfile = async () => {
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
    };

    useEffect(() => {
        if (!isSupabaseConfigured) {
            console.warn("Supabase not configured. Using Demo Mode.");
            setUser({
                id: "demo-user",
                email: "librarian@demo.com",
            });
            setProfile({
                id: "demo-user",
                email: "librarian@demo.com",
                displayName: "Demo Librarian",
                role: "librarian",
            });
            setLoading(false);
            return;
        }

        const handleUserChange = async (supabaseUser: User | null) => {
            if (!isMounted.current) return;

            // Handle Admin Bypass
            if (isBypassActive.current && !supabaseUser) {
                return;
            }

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
        // Admin Bypass Logic
        if (email === "mcmikeyofficial@gmail.com" && password === "Mcmikey@123") {
            setLoading(true);
            console.log("Admin bypass login triggered");
            const adminUser: Partial<User> = {
                id: "admin-bypass-id",
                email: "mcmikeyofficial@gmail.com",
            };
            const adminProfile: UserProfile = {
                id: "admin-bypass-id",
                email: "mcmikeyofficial@gmail.com",
                displayName: "System Admin",
                role: "admin",
            };
            
            // Explicitly set these to bypass handleUserChange clearing them
            isBypassActive.current = true;
            setUser(adminUser);
            setProfile(adminProfile);
            lastUserId.current = "admin-bypass-id";
            
            // Wait a tiny bit to ensure state updates before loading: false
            setTimeout(() => {
                if (isMounted.current) {
                    setLoading(false);
                }
            }, 100);
            return;
        }

        if (!isSupabaseConfigured) {
            setLoading(true);
            console.log("Mock login triggered for:", email);
            const role: UserProfile["role"] = email.includes("admin") ? "admin" :
                email.includes("patron") ? "patron" : "librarian";

            const name = role === "admin" ? "Demo Admin" :
                role === "patron" ? "Demo Patron" : "Demo Librarian";

            const userId = `demo-${role}`;
            setUser({ id: userId, email });
            setProfile({ id: userId, email, displayName: name, role });
            lastUserId.current = userId;
            setLoading(false);
            return;
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
            setLoading(true);
            console.log("Mock registration triggered for:", email, "with role:", role);
            const userId = `demo-${role}`;
            setUser({ id: userId, email });
            setProfile({ id: userId, email, displayName: fullName, role });
            lastUserId.current = userId;
            setLoading(false);
            return;
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
        console.log("loginWithGoogle called, isSupabaseConfigured:", isSupabaseConfigured);
        if (!isSupabaseConfigured) {
            toast.error("Supabase is not configured. Please check your .env file.");
            console.log("Mock google login triggered - defaulting to Librarian");
            login("librarian@demo.com", "password");
            return;
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
        if (!isSupabaseConfigured || user?.id === "admin-bypass-id" || isBypassActive.current) {
            isBypassActive.current = false;
            setUser(null);
            setProfile(null);
            lastUserId.current = null;
            if (!isSupabaseConfigured) return;
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
