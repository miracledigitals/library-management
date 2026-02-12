"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBorrowRequests, useProcessRequest } from "@/lib/api/requests";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Check, X, Info, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import { BorrowRequest } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function RequestsPage() {
    const { user } = useAuth();
    const { data: requests, isLoading } = useBorrowRequests();
    const processRequest = useProcessRequest();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);
    const [actionType, setActionType] = useState<'approved' | 'denied'>('approved');
    const [notes, setNotes] = useState("");

    const handleAction = (request: BorrowRequest, type: 'approved' | 'denied') => {
        setSelectedRequest(request);
        setActionType(type);
        setNotes("");
        setIsDialogOpen(true);
    };

    const handleStatusUpdate = async (requestId: string, status: 'approved' | 'denied', adminNotes?: string) => {
        try {
            await processRequest.mutateAsync({
                requestId,
                status,
                adminNotes,
                staffUserId: user?.id || ""
            });
            toast.success(`Request ${status} successfully`);
            return true; // Indicate success
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : `Failed to ${status} request`;
            toast.error(message);
            return false; // Indicate failure
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
            <div className="space-y-6">
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-bold tracking-tight">Borrow Requests</h1>
                    <p className="text-muted-foreground">
                        Manage and approve book borrow applications from members.
                    </p>
                </div>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Member</TableHead>
                                        <TableHead>Book</TableHead>
                                        <TableHead>Status</TableHead>
                                    <TableHead className="text-left sm:text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                            <TableCell className="text-left sm:text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : requests?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                                                No pending requests.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        requests?.map((request) => (
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
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'approved' ? 'Approve Borrow Request' : 'Deny Borrow Request'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === 'approved'
                                ? `Setting this request to approved will automatically checkout "${selectedRequest?.bookTitle}" to ${selectedRequest?.requesterName}.`
                                : `Explain why you're denying the request for "${selectedRequest?.bookTitle}".`}
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
                            disabled={processRequest.isPending}
                            className="gap-2"
                        >
                            {processRequest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Confirm {actionType === 'approved' ? 'Approval' : 'Denial'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
