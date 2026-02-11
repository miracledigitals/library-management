"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Bell, 
    Shield, 
    User, 
    Globe, 
    Save,
    Lock
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useUpdateProfile } from "@/lib/api/profiles";

export default function SettingsPage() {
    const { profile, refreshProfile } = useAuth();
    const { setTheme, resolvedTheme } = useTheme();
    const updateProfile = useUpdateProfile();
    const [displayName, setDisplayName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (profile?.displayName) {
            setDisplayName(profile.displayName);
        }
    }, [profile]);

    if (!profile) return null;

    const isAdmin = profile.role === "admin" || profile.role === "librarian";

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateProfile.mutateAsync({
                id: profile.id,
                displayName: displayName
            });
            await refreshProfile();
            toast.success("Profile updated successfully");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update profile";
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6 max-w-4xl mx-auto">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                        <p className="text-muted-foreground">
                            Manage your account preferences and application configuration.
                        </p>
                    </div>

                    <div className="grid gap-6">
                        {/* Profile Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" /> Profile Settings
                                </CardTitle>
                                <CardDescription>Update your personal information.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="displayName">Display Name</Label>
                                        <Input 
                                            id="displayName" 
                                            value={displayName} 
                                            onChange={(e) => setDisplayName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" defaultValue={profile.email} disabled />
                                        <p className="text-[0.7rem] text-muted-foreground italic">Email cannot be changed directly.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Notifications */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Bell className="h-5 w-5" /> Notifications
                                </CardTitle>
                                <CardDescription>Choose what updates you want to receive.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Email Notifications</Label>
                                        <p className="text-sm text-muted-foreground">Receive updates about your {isAdmin ? "system" : "borrowing"} activity.</p>
                                    </div>
                                    <Checkbox defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Due Date Reminders</Label>
                                        <p className="text-sm text-muted-foreground">Get notified when a book is due soon.</p>
                                    </div>
                                    <Checkbox defaultChecked />
                                </div>
                                {isAdmin && (
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>System Alerts</Label>
                                            <p className="text-sm text-muted-foreground">Receive alerts about system health and critical errors.</p>
                                        </div>
                                        <Checkbox defaultChecked />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Security */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" /> Security
                                </CardTitle>
                                <CardDescription>Manage your account security and authentication.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Two-Factor Authentication</Label>
                                        <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => toast.info("Two-factor authentication will be available soon.")}>Enable</Button>
                                </div>
                                <div className="pt-4 border-t">
                                    <Button 
                                        variant="outline" 
                                        className="gap-2"
                                        onClick={() => toast.info("Please contact the administrator or use the 'Forgot Password' flow at login to change your password.")}
                                    >
                                        <Lock className="h-4 w-4" /> Change Password
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Appearance/Preferences */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5" /> Preferences
                                </CardTitle>
                                <CardDescription>Customize your application experience.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Dark Mode</Label>
                                        <p className="text-sm text-muted-foreground">Toggle between light and dark themes.</p>
                                    </div>
                                    <Checkbox 
                                        checked={resolvedTheme === "dark"} 
                                        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Language</Label>
                                        <p className="text-sm text-muted-foreground">Select your preferred language.</p>
                                    </div>
                                    <select className="bg-background border rounded px-2 py-1 text-sm">
                                        <option>English</option>
                                        <option>Spanish</option>
                                        <option>French</option>
                                    </select>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-4">
                            <Button variant="ghost">Cancel</Button>
                            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                                {isSaving ? "Saving..." : <><Save className="h-4 w-4" /> Save Changes</>}
                            </Button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
