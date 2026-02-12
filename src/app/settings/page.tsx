"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, assertSupabaseConfigured } from "@/lib/supabase";
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
    const { user, profile, refreshProfile } = useAuth();
    const { setTheme, resolvedTheme } = useTheme();
    const updateProfile = useUpdateProfile();
    const [displayName, setDisplayName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [isRefreshingRole, setIsRefreshingRole] = useState(false);
    const [lastRoleRefresh, setLastRoleRefresh] = useState<Date | null>(null);
    const [adminEmail, setAdminEmail] = useState("");
    const [adminFullName, setAdminFullName] = useState("");
    const [isForcingAdmin, setIsForcingAdmin] = useState(false);
    const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
    const [adminTempPassword, setAdminTempPassword] = useState("");

    useEffect(() => {
        if (profile?.displayName) {
            setDisplayName(profile.displayName);
        }
    }, [profile]);

    useEffect(() => {
        if (profile?.email && !adminEmail) {
            setAdminEmail(profile.email);
        }
    }, [profile, adminEmail]);

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

    const handleRoleRefresh = async () => {
        setIsRefreshingRole(true);
        try {
            await refreshProfile();
            setLastRoleRefresh(new Date());
            toast.success("Profile refreshed.");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to refresh profile";
            toast.error(message);
        } finally {
            setIsRefreshingRole(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            toast.error("All password fields are required.");
            return;
        }
        if (newPassword !== confirmNewPassword) {
            toast.error("New passwords do not match.");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters.");
            return;
        }

        setIsUpdatingPassword(true);
        try {
            assertSupabaseConfigured();
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: currentPassword,
            });
            if (signInError) {
                throw new Error("Current password is incorrect.");
            }

            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            toast.success("Password updated successfully.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update password";
            toast.error(message);
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const handleForceAdminRole = async () => {
        if (!adminEmail.trim()) {
            toast.error("Enter an email to apply the admin role.");
            return;
        }
        setIsForcingAdmin(true);
        try {
            const response = await fetch("/api/admin/force-role", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: adminEmail.trim() })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || "Failed to force admin role.");
            }
            if (data?.tempPassword) {
                setAdminTempPassword(data.tempPassword);
            } else {
                setAdminTempPassword("");
            }
            await refreshProfile();
            setLastRoleRefresh(new Date());
            toast.success(data?.created ? "Admin account created." : "Admin role applied.");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to force admin role.";
            toast.error(message);
        } finally {
            setIsForcingAdmin(false);
        }
    };

    const handleCreateAdminAccount = async () => {
        if (!adminEmail.trim()) {
            toast.error("Enter an email to create the admin account.");
            return;
        }
        setIsCreatingAdmin(true);
        try {
            const response = await fetch("/api/admin/force-role", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: adminEmail.trim(),
                    fullName: adminFullName.trim()
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || "Failed to create admin account.");
            }
            if (data?.tempPassword) {
                setAdminTempPassword(data.tempPassword);
            } else {
                setAdminTempPassword("");
            }
            await refreshProfile();
            setLastRoleRefresh(new Date());
            toast.success(data?.created ? "Admin account created." : "Admin role applied.");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to create admin account.";
            toast.error(message);
        } finally {
            setIsCreatingAdmin(false);
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

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" /> Session and Role
                                </CardTitle>
                                <CardDescription>Verify the active account and role in use.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label>Auth User ID</Label>
                                        <Input value={user?.id || ""} readOnly className="font-mono text-xs" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Auth Email</Label>
                                        <Input value={user?.email || ""} readOnly />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Profile ID</Label>
                                        <Input value={profile.id} readOnly className="font-mono text-xs" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Profile Role</Label>
                                        <Input value={profile.role} readOnly />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-xs text-muted-foreground">
                                        {lastRoleRefresh ? `Last refreshed: ${lastRoleRefresh.toLocaleString()}` : "Not refreshed yet"}
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleRoleRefresh} disabled={isRefreshingRole}>
                                        {isRefreshingRole ? "Refreshing..." : "Refresh Role"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" /> Admin Bootstrap
                                </CardTitle>
                                <CardDescription>Force an admin role using server credentials.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-2">
                                    <Label htmlFor="adminFullName">Full Name</Label>
                                    <Input
                                        id="adminFullName"
                                        value={adminFullName}
                                        onChange={(e) => setAdminFullName(e.target.value)}
                                        placeholder="Admin full name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adminEmail">Target Email</Label>
                                    <Input
                                        id="adminEmail"
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-wrap justify-end gap-2">
                                    <Button variant="outline" onClick={handleCreateAdminAccount} disabled={isCreatingAdmin}>
                                        {isCreatingAdmin ? "Creating..." : "Create Admin Account"}
                                    </Button>
                                    <Button onClick={handleForceAdminRole} disabled={isForcingAdmin}>
                                        {isForcingAdmin ? "Applying..." : "Force Admin Role"}
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adminTempPassword">Temporary Password</Label>
                                    <Input
                                        id="adminTempPassword"
                                        value={adminTempPassword}
                                        readOnly
                                        placeholder="Generated after admin creation"
                                    />
                                </div>
                            </CardContent>
                        </Card>

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
                                    <div className="space-y-3 max-w-md">
                                        <div className="space-y-2">
                                            <Label htmlFor="currentPassword">Current Password</Label>
                                            <Input
                                                id="currentPassword"
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="newPassword">New Password</Label>
                                            <Input
                                                id="newPassword"
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                                            <Input
                                                id="confirmNewPassword"
                                                type="password"
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="gap-2"
                                            onClick={handleChangePassword}
                                            disabled={isUpdatingPassword}
                                        >
                                            <Lock className="h-4 w-4" /> {isUpdatingPassword ? "Updating..." : "Change Password"}
                                        </Button>
                                    </div>
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
