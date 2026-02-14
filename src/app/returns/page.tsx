"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useActiveCheckouts } from "@/lib/api/checkouts";
import { useReturnRequests, useProcessReturnRequest } from "@/lib/api/requests";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Check, X, Info, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import { ReturnRequest } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function ReturnsPage() {
    const { user } = useAuth();
    const { data: checkouts, isLoading } = useActiveCheckouts();
    const { data: returnRequests, isLoading: isLoadingRequests } = useReturnRequests();
    const processReturnRequest = useProcessReturnRequest();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);
    const [actionType, setActionType] = useState<'approved' | 'denied'>('approved');
    const [notes, setNotes] = useState("");

    const handleAction = (request: ReturnRequest, type: 'approved' | 'denied') => {
        setSelectedRequest(request);
        setActionType(type);
        setNotes("");
        setIsDialogOpen(true);
    };

    const handleStatusUpdate = async (requestId: string, status: 'approved' | 'denied', adminNotes?: string) => {
        try {
            await processReturnRequest.mutateAsync({
                requestId,
                status,
                adminNotes,
                staffUserId: user?.id || ""
            });
            toast.success(`Return request ${status} successfully`);
            return true;
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : `Failed to ${status} return request`;
            toast.error(message);
            return false;
        }
    };

    const confirmAction = async () => {
        if (!selectedRequest || !user) return;

        const success = await handleStatusUpdate(
            selectedRequest.id as string,
            actionType,
            notes
        );

        if (success) {
            setIsDialogOpen(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-bold tracking-tight">Returns</h1>
                    <p className="text-muted-foreground">Pending returns with due dates and borrowers.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Return Requests</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[140px]">Date</TableHead>
                                        <TableHead className="min-w-[180px]">Member</TableHead>
                                        <TableHead className="min-w-[200px]">Book</TableHead>
                                        <TableHead className="min-w-[120px]">Status</TableHead>
                                        <TableHead className="text-left sm:text-right min-w-[120px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingRequests ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                                <TableCell className="text-left sm:text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : returnRequests?.length ? (
                                        returnRequests.map((request) => (
                                            <TableRow key={request.id}>
                                                <TableCell className="text-sm">
                                                    {format(new Date(request.requestDate), "MMM dd, yyyy")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{request.requesterName}</div>
                                                    <div className="text-xs text-muted-foreground font-mono">{request.patronId.slice(0, 8)}...</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{request.bookTitle}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        request.status === "pending" ? "secondary" :
                                                            request.status === "approved" ? "default" : "destructive"
                                                    } className="capitalize">
                                                        {request.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-left sm:text-right">
                                                    {request.status === "pending" ? (
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 w-8 p-0"
                                                                onClick={() => handleAction(request, 'denied')}
                                                            >
                                                                <X className="h-4 w-4 text-rose-500" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 w-8 p-0"
                                                                onClick={() => handleAction(request, 'approved')}
                                                            >
                                                                <Check className="h-4 w-4 text-emerald-500" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-muted-foreground italic flex items-center justify-end gap-1">
                                                            <Info className="h-3 w-3" /> Processed
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                                                No return requests found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Pending Returns</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[200px]">Book</TableHead>
                                        <TableHead className="min-w-[150px]">Borrower</TableHead>
                                        <TableHead className="min-w-[120px]">Due Date</TableHead>
                                        <TableHead className="min-w-[100px]">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : checkouts?.length ? (
                                        checkouts.map((checkout) => (
                                            <TableRow key={checkout.id}>
                                                <TableCell className="py-4">
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
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'approved' ? 'Approve Return Request' : 'Deny Return Request'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === 'approved'
                                ? `Approving will mark "${selectedRequest?.bookTitle}" as returned.`
                                : `Explain why you're denying the return for "${selectedRequest?.bookTitle}".`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Add internal notes or feedback for the member..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant={actionType === 'approved' ? 'default' : 'destructive'}
                            onClick={confirmAction}
                            disabled={processReturnRequest.isPending}
                            className="gap-2"
                        >
                            {processReturnRequest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Confirm {actionType === 'approved' ? 'Approval' : 'Denial'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
