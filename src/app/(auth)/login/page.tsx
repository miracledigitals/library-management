"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Book, Chrome } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState<"admin" | "patron">("patron");
    const [loading, setLoading] = useState(false);
    const { login, register, loginWithGoogle } = useAuth();
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isRegistering) {
                await register(email, password, fullName, role);
                toast.success("Account created! You can now log in.");
                setIsRegistering(false);
            } else {
                await login(email, password);
                toast.success("Logged in successfully");
                router.push("/dashboard");
            }
        } catch (error: any) {
            toast.error(error.message || `Failed to ${isRegistering ? "register" : "login"}`);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
            toast.success("Logged in with Google");
            // Note: router.push happens in AuthContext onAuthStateChange
        } catch (error: any) {
            toast.error(error.message || "Failed to login with Google");
        }
    };

    return (
        <div className="grid min-h-screen lg:grid-cols-2">
            <div className="relative hidden bg-muted lg:block">
                <img
                    src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000&auto=format&fit=crop"
                    alt="Library"
                    className="absolute inset-0 h-full w-full object-cover brightness-[0.4]"
                />
                <div className="relative z-20 flex h-full flex-col p-10 text-white">
                    <div className="flex items-center text-2xl font-bold tracking-tight">
                        <div className="mr-3 rounded-lg bg-primary p-2">
                            <Book className="h-6 w-6 text-primary-foreground" />
                        </div>
                        LMS Pro
                    </div>
                    <div className="mt-auto">
                        <blockquote className="space-y-4">
                            <p className="text-2xl font-light leading-relaxed">
                                "A library is not a luxury but one of the necessities of life. It is the heart of every community, a sanctuary for knowledge, and a bridge to the future."
                            </p>
                            <footer className="flex items-center space-x-2">
                                <div className="h-px w-8 bg-white/50" />
                                <cite className="text-sm font-medium uppercase tracking-widest text-white/70 not-italic">
                                    Henry Ward Beecher
                                </cite>
                            </footer>
                        </blockquote>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-center p-8 bg-background">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="flex flex-col space-y-2 text-center lg:text-left">
                        <div className="flex lg:hidden justify-center mb-4">
                            <div className="rounded-xl bg-primary p-3 shadow-lg">
                                <Book className="h-8 w-8 text-primary-foreground" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {isRegistering ? "Create an account" : "Welcome back"}
                        </h1>
                        <p className="text-muted-foreground">
                            {isRegistering
                                ? "Enter your information below to create your account"
                                : "Enter your credentials to access your library dashboard"}
                        </p>
                    </div>

                    <div className="grid gap-6">
                        <form onSubmit={handleAuth} className="space-y-4">
                            {isRegistering && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">Full Name</Label>
                                        <Input
                                            id="fullName"
                                            type="text"
                                            placeholder="John Doe"
                                            required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role">Role</Label>
                                        <Select
                                            value={role}
                                            onValueChange={(value: any) => setRole(value)}
                                        >
                                            <SelectTrigger id="role" className="h-11 w-full">
                                                <SelectValue placeholder="Select your role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="patron">Library User (Patron)</SelectItem>
                                                <SelectItem value="admin">Administrator</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    {!isRegistering && (
                                        <button
                                            type="button"
                                            className="text-xs text-primary hover:underline"
                                            onClick={() => toast.info("Please contact your librarian to reset password.")}
                                        >
                                            Forgot password?
                                        </button>
                                    )}
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-11"
                                />
                            </div>
                            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
                                {loading
                                    ? (isRegistering ? "Creating account..." : "Signing in...")
                                    : (isRegistering ? "Sign Up" : "Sign In")}
                            </Button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full h-11 font-medium border-2 hover:bg-muted"
                            onClick={handleGoogleLogin}
                            type="button"
                        >
                            <Chrome className="mr-2 h-5 w-5" />
                            Google
                        </Button>
                    </div>

                    <p className="px-8 text-center text-sm text-muted-foreground">
                        {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
                        <button
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="text-primary hover:underline font-semibold"
                        >
                            {isRegistering ? "Sign In" : "Sign Up"}
                        </button>
                    </p>

                    {!isRegistering && (
                        <p className="text-center text-xs text-muted-foreground mt-4">
                            By clicking continue, you agree to our{" "}
                            <button className="underline underline-offset-4 hover:text-primary">Terms of Service</button>{" "}
                            and{" "}
                            <button className="underline underline-offset-4 hover:text-primary">Privacy Policy</button>.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
