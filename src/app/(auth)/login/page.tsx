"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Book, Chrome } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const { login, register, loginWithGoogle } = useAuth();
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isRegistering) {
                await register(email, password, fullName);
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
        <div className="flex h-screen items-center justify-center bg-muted/50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="rounded-full bg-primary p-3">
                            <Book className="h-6 w-6 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        {isRegistering ? "Create an Account" : "LMS Pro Login"}
                    </CardTitle>
                    <CardDescription>
                        {isRegistering
                            ? "Enter your details to register as a library member"
                            : "Enter your credentials to access the library system"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleAuth} className="space-y-4">
                        {isRegistering && (
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="John Doe"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading
                                ? (isRegistering ? "Registering..." : "Logging in...")
                                : (isRegistering ? "Sign Up" : "Login")}
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

                    <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
                        <Chrome className="mr-2 h-4 w-4" />
                        Google
                    </Button>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground">
                    <div>
                        {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
                        <button
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="text-primary hover:underline font-medium"
                        >
                            {isRegistering ? "Login" : "Sign Up"}
                        </button>
                    </div>
                    {!isRegistering && (
                        <div>Contact your librarian if you've forgotten your credentials.</div>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
