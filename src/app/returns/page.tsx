"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useActiveCheckouts } from "@/lib/api/checkouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function ReturnsPage() {
    const { data: checkouts, isLoading } = useActiveCheckouts();

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Returns</h1>
                    <p className="text-muted-foreground">Pending returns with due dates and borrowers.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Pending Returns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Book</TableHead>
                                    <TableHead>Borrower</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : checkouts?.length ? (
                                    checkouts.map((checkout) => (
                                        <TableRow key={checkout.id}>
                                            <TableCell>
                                                <div className="font-medium">{checkout.bookTitle}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{checkout.bookIsbn}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{checkout.patronName}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{checkout.patronMemberId}</div>
                                            </TableCell>
                                            <TableCell className={checkout.status === "overdue" ? "text-rose-600 font-semibold" : ""}>
                                                {format(new Date(checkout.dueDate), "MMM dd, yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={checkout.status === "overdue" ? "destructive" : "default"} className="capitalize">
                                                    {checkout.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                                            No pending returns found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
