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
    isAdmin: boolean;
    isLibrarian: boolean;
    isPatron: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<Partial<User> | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

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
            if (!isMounted) return;

            if (supabaseUser) {
                try {
                    // Fetch user profile from PostgreSQL
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', supabaseUser.id)
                        .single();

                    if (!isMounted) return;

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
                        if (supabaseUser.app_metadata?.provider === 'google') {
                            const { data: emailExists } = await supabase
                                .from('profiles')
                                .select('id')
                                .eq('email', supabaseUser.email)
                                .maybeSingle();

                            if (!isMounted) return;

                            if (!emailExists) {
                                await supabase.auth.signOut();
                                toast.error("This Google account is not registered. Please sign up first.");
                                setProfile(null);
                                setUser(null);
                                setLoading(false);
                                return;
                            }
                        }

                        setUser(supabaseUser);
                        setProfile({
                            id: supabaseUser.id,
                            email: supabaseUser.email || "",
                            displayName: supabaseUser.user_metadata?.full_name || "",
                            role: "patron",
                        });
                    }
                } catch (err) {
                    console.error("Error in handleUserChange:", err);
                }
            } else {
                setUser(null);
                setProfile(null);
            }
            
            if (isMounted) {
                setLoading(false);
            }
        };

        const getInitialSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (isMounted) {
                    handleUserChange(session?.user ?? null);
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Error getting initial session:", err);
                    setLoading(false);
                }
            }
        };

        getInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            handleUserChange(session?.user ?? null);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        // Admin Bypass Logic
        if (email === "mcmikeyofficial@gmail.com" && password === "Mcmikey@123") {
            console.log("Admin bypass login triggered");
            const adminUser = {
                id: "admin-bypass-id",
                email: "mcmikeyofficial@gmail.com",
            };
            const adminProfile: UserProfile = {
                id: "admin-bypass-id",
                email: "mcmikeyofficial@gmail.com",
                displayName: "System Admin",
                role: "admin",
            };
            setUser(adminUser as any);
            setProfile(adminProfile);
            return;
        }

        if (!isSupabaseConfigured) {
            console.log("Mock login triggered for:", email);
            const role = email.includes("admin") ? "admin" :
                email.includes("patron") ? "patron" : "librarian";

            const name = role === "admin" ? "Demo Admin" :
                role === "patron" ? "Demo Patron" : "Demo Librarian";

            setUser({ id: `demo-${role}`, email });
            setProfile({ id: `demo-${role}`, email, displayName: name, role: role as any });
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
            console.log("Mock registration triggered for:", email, "with role:", role);
            setUser({ id: `demo-${role}`, email });
            setProfile({ id: `demo-${role}`, email, displayName: fullName, role: role });
            return;
        }
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role, // Pass role to metadata for potential trigger use
                }
            }
        });
        if (error) throw error;
    };

    const loginWithGoogle = async () => {
        if (!isSupabaseConfigured) {
            console.log("Mock google login triggered - defaulting to Librarian");
            login("librarian@demo.com", "password");
            return;
        }
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
    };

    const logout = async () => {
        if (!isSupabaseConfigured) {
            setUser(null);
            setProfile(null);
            return;
        }
        await supabase.auth.signOut();
    };

    const value = {
        user,
        profile,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        isAdmin: profile?.role === "admin",
        isLibrarian: profile?.role === "librarian" || profile?.role === "admin",
        isPatron: profile?.role === "patron",
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
