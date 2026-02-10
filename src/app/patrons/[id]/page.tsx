"use client";

import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePatron, useUpdatePatron } from "@/lib/api/patrons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Edit,
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    CreditCard,
    History,
    AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";

export default function PatronDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: patron, isLoading } = usePatron(id as string);
    const updatePatron = useUpdatePatron();

    const handlePayFine = async () => {
        if (!patron) return;
        try {
            await updatePatron.mutateAsync({ id: patron.id!, finesDue: 0 });
            toast.success("Fines cleared successfully");
        } catch (error) {
            toast.error("Failed to clear fines");
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            </DashboardLayout>
        );
    }

    if (!patron) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-muted-foreground">Patron not found</h2>
                    <Button variant="link" onClick={() => router.push("/patrons")}>Back to list</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => router.push("/patrons")} className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to List
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" className="gap-2">
                            <Edit className="h-4 w-4" /> Edit Profile
                        </Button>
                        <Link href="/checkout">
                            <Button className="gap-2">
                                <CreditCard className="h-4 w-4" /> New Checkout
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="md:col-span-1">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <User className="h-12 w-12 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">{patron.firstName} {patron.lastName}</CardTitle>
                            <p className="text-sm text-muted-foreground font-mono">{patron.memberId}</p>
                            <div className="mt-4 flex justify-center gap-2">
                                <Badge variant={patron.membershipStatus === "active" ? "default" : "destructive"}>
                                    {patron.membershipStatus.toUpperCase()}
                                </Badge>
                                <Badge variant="outline">{patron.membershipType.toUpperCase()}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{patron.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{patron.phone || "No phone provided"}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span>{patron.address.street}, {patron.address.city}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>Joined {format(patron.joinedAt.toDate(), "MMM yyyy")}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium">Outstanding Fines</span>
                                    <span className={`font-bold ${patron.finesDue > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                        ${patron.finesDue.toFixed(2)}
                                    </span>
                                </div>
                                {patron.finesDue > 0 && (
                                    <Button onClick={handlePayFine} className="w-full mt-2" variant="outline" size="sm">
                                        Pay Fines
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="md:col-span-2 space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Current Loans</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{patron.currentCheckouts} / {patron.maxBooksAllowed}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{patron.totalCheckoutsHistory}</div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <History className="h-5 w-5" /> Active Loans
                                </CardTitle>
                                <Link href="/returns">
                                    <Button variant="link" size="sm">Process Returns</Button>
                                </Link>
                            </CardHeader>
                            <CardContent>
                                {patron.currentCheckouts === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground italic">
                                        No active loans found for this patron.
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Book Title</TableHead>
                                                <TableHead>Due Date</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {/* Active loans table rows would go here */}
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                                                    Loan details are fetched from the checkouts collection.
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        {patron.finesDue > 20 && (
                            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-rose-600" />
                                <div>
                                    <div className="font-semibold text-rose-800">Account Blocked</div>
                                    <p className="text-sm text-rose-700">This patron has exceeded the fine limit. Clear fines to resume checkouts.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
