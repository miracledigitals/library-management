"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    User,
    Calendar,
    CreditCard,
    History,
    ShieldCheck,
    AlertTriangle,
    Info,
    FileText,
    Clock
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { usePatronRequests } from "@/lib/api/requests";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Link from "next/link";

export default function ProfilePage() {
    const { profile, user } = useAuth();
    const { data: requests, isLoading: isLoadingRequests } = usePatronRequests(user?.id || "");

    if (!profile) return null;

    const isAdmin = profile.role === "admin" || profile.role === "librarian";

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6 max-w-4xl mx-auto">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {isAdmin ? "Admin Profile" : "My Membership"}
                        </h1>
                        <p className="text-muted-foreground">
                            {isAdmin 
                                ? "Manage your administrator account and permissions."
                                : "View and manage your library account and membership details."}
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <Card className="md:col-span-1">
                            <CardHeader className="text-center pb-2">
                                <div className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <User className="h-12 w-12 text-primary" />
                                </div>
                                <CardTitle className="text-xl">{profile.displayName || "User"}</CardTitle>
                                <p className="text-sm text-muted-foreground font-mono">{profile.email}</p>
                                <div className="mt-4 flex justify-center gap-2">
                                    <Badge variant="outline" className="capitalize">
                                        {profile.role}
                                    </Badge>
                                    <Badge variant="default" className="bg-emerald-600">
                                        ACTIVE
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4 border-t">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Account ID:</span>
                                        <span className="font-mono text-xs ml-auto">{profile.id.slice(0, 8).toUpperCase()}</span>
                                    </div>
                                    {!isAdmin && (
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground italic">
                                            <Info className="h-4 w-4" />
                                            Complete profile details are managed by the librarian.
                                        </div>
                                    )}
                                    {isAdmin && (
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground italic">
                                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                            Full administrative access enabled.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="md:col-span-2 space-y-6">
                            {!isAdmin ? (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                                                <CreditCard className="h-4 w-4" /> Current Loans
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold">{profile.currentCheckouts || 0} Books</div>
                                            <p className="text-xs text-muted-foreground mt-1">Limit: 5 books</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4" /> Outstanding Fines
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={`text-3xl font-bold ${(profile.finesDue || 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                                ${(profile.finesDue || 0).toFixed(2)}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {(profile.finesDue || 0) > 0 ? "Please visit the desk to pay" : "Account in good standing"}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4" /> Permissions
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold capitalize">{profile.role}</div>
                                            <p className="text-xs text-muted-foreground mt-1">Full system access</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                                                <Calendar className="h-4 w-4" /> System Access
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">24/7</div>
                                            <p className="text-xs text-muted-foreground mt-1">Unrestricted access</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {!isAdmin && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText className="h-5 w-5" /> My Borrow Requests
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoadingRequests ? (
                                            <div className="space-y-2">
                                                <Skeleton className="h-10 w-full" />
                                                <Skeleton className="h-10 w-full" />
                                            </div>
                                        ) : requests?.length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic py-2">No active borrow requests.</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {requests?.map((request) => (
                                                    <div key={request.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium">{request.bookTitle}</p>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Clock className="h-3 w-3" />
                                                                {format(new Date(request.requestDate), "MMM dd, yyyy")}
                                                            </div>
                                                        </div>
                                                        <Badge variant={
                                                            request.status === "pending" ? "secondary" :
                                                                request.status === "approved" ? "default" : "destructive"
                                                        } className="capitalize">
                                                            {request.status}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <History className="h-5 w-5" /> Account Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground uppercase">Role</p>
                                            <p className="text-sm capitalize">{profile.role}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground uppercase">Email Address</p>
                                            <p className="text-sm">{profile.email}</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t">
                                        <Link href="/settings">
                                            <Button variant="outline" className="w-full">Edit Profile Settings</Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
