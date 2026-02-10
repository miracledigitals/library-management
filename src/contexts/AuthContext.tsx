"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    User,
    signInWithEmailAndPassword,
    signOut,
    IdTokenResult,
    getAuth,
    GoogleAuthProvider,
    signInWithPopup
} from "firebase/auth";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { UserProfile } from "@/types";

interface AuthContextType {
    user: Partial<User> | null;
    profile: UserProfile | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
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
        if (!isFirebaseConfigured) {
            console.warn("Firebase not configured. Using Demo Mode.");
            setUser({
                uid: "demo-user",
                email: "librarian@demo.com",
                displayName: "Demo Librarian",
            });
            setProfile({
                uid: "demo-user",
                email: "librarian@demo.com",
                displayName: "Demo Librarian",
                role: "librarian",
            });
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                // Fetch user profile from Firestore or custom claims
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProfile(docSnap.data() as UserProfile);
                } else {
                    // Fallback or default role
                    setProfile({
                        uid: user.uid,
                        email: user.email || "",
                        displayName: user.displayName || "",
                        role: "patron", // Default role
                    });
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        if (!isFirebaseConfigured) {
            console.log("Mock login triggered for:", email);
            const role = email.includes("admin") ? "admin" :
                email.includes("patron") ? "patron" : "librarian";

            const name = role === "admin" ? "Demo Admin" :
                role === "patron" ? "Demo Patron" : "Demo Librarian";

            setUser({ uid: `demo-${role}`, email, displayName: name });
            setProfile({ uid: `demo-${role}`, email, displayName: name, role: role as any });
            return;
        }
        return signInWithEmailAndPassword(auth, email, password).then(() => { });
    };

    const loginWithGoogle = async () => {
        if (!isFirebaseConfigured) {
            console.log("Mock google login triggered - defaulting to Librarian");
            login("librarian@demo.com", "password");
            return;
        }
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider).then(() => { });
    };

    const logout = async () => {
        if (!isFirebaseConfigured) {
            setUser(null);
            setProfile(null);
            return;
        }
        return signOut(auth);
    };

    const value = {
        user,
        profile,
        loading,
        login,
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
