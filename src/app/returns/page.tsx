"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useActiveCheckouts } from "@/lib/api/checkouts";
import { useReturnRequests, useProcessReturnRequest, useForceReturnBook } from "@/lib/api/requests";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
    const forceReturnBook = useForceReturnBook();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);
    const [actionType, setActionType] = useState<'approved' | 'denied'>('approved');
    const [notes, setNotes] = useState("");

    // Force Return State
    const [isForceDialogOpen, setIsForceDialogOpen] = useState(false);
    const [selectedCheckout, setSelectedCheckout] = useState<any | null>(null);
    const [forceCondition, setForceCondition] = useState<"good" | "worn" | "damaged" | "lost">("good");
    const [forceDamageTypes, setForceDamageTypes] = useState<string[]>([]);
    const [forceNotes, setForceNotes] = useState("");

    const handleForceReturnClick = (checkout: any) => {
        setSelectedCheckout(checkout);
        setForceCondition("good");
        setForceDamageTypes([]);
        setForceNotes("");
        setIsForceDialogOpen(true);
    };

    const confirmForceReturn = async () => {
        if (!selectedCheckout || !user) return;

        try {
            await forceReturnBook.mutateAsync({
                checkoutId: selectedCheckout.id,
                staffUserId: user.id || "",
                condition: forceCondition,
                damageTypes: forceDamageTypes,
                notes: forceNotes
            });
            toast.success(`"${selectedCheckout.bookTitle}" returned successfully!`);
            setIsForceDialogOpen(false);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to forcefully return book";
            toast.error(message);
        }
    };

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
                                        <TableHead className="text-right min-w-[140px]">Actions</TableHead>
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
                                                <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
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
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleForceReturnClick(checkout)}
                                                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-200"
                                                    >
                                                        Force Return
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
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

            <Dialog open={isForceDialogOpen} onOpenChange={setIsForceDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Force Return Book</DialogTitle>
                        <DialogDescription>
                            Mark "{selectedCheckout?.bookTitle}" as returned. This will instantly update inventory copies and physical location.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        {/* Member & Book Details */}
                        <div className="p-3 bg-muted/30 border rounded-md text-xs space-y-1">
                            <div><span className="font-semibold">Borrower:</span> {selectedCheckout?.patronName} ({selectedCheckout?.patronMemberId})</div>
                            <div><span className="font-semibold">ISBN:</span> {selectedCheckout?.bookIsbn}</div>
                            <div><span className="font-semibold">Due Date:</span> {selectedCheckout?.dueDate && format(new Date(selectedCheckout.dueDate), "MMM dd, yyyy")}</div>
                        </div>

                        {/* Condition Selector */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Book Return Condition</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {(["good", "worn", "damaged", "lost"] as const).map((cond) => (
                                    <Button
                                        key={cond}
                                        type="button"
                                        variant={forceCondition === cond ? "default" : "outline"}
                                        onClick={() => setForceCondition(cond)}
                                        className="capitalize text-xs h-9 justify-center"
                                    >
                                        {cond}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Damage Types Checkboxes (if condition is damaged) */}
                        {forceCondition === "damaged" && (
                            <div className="space-y-2 border p-3 rounded-md bg-muted/20">
                                <Label className="text-xs font-semibold text-muted-foreground">Select Damage Types (Fines Accrued)</Label>
                                <div className="space-y-2 pt-1">
                                    {[
                                        { id: "water", label: "Water Damage ($15.00)" },
                                        { id: "torn", label: "Torn Pages ($5.00)" },
                                        { id: "spine", label: "Spine Damage ($10.00)" },
                                        { id: "writing", label: "Writing/Markings ($3.00)" },
                                        { id: "cover", label: "Cover Damage ($8.00)" },
                                    ].map((type) => (
                                        <div key={type.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`damage-${type.id}`}
                                                checked={forceDamageTypes.includes(type.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setForceDamageTypes(prev => [...prev, type.id]);
                                                    } else {
                                                        setForceDamageTypes(prev => prev.filter(t => t !== type.id));
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`damage-${type.id}`} className="text-xs font-normal cursor-pointer select-none">
                                                {type.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Flat Lost Book warning */}
                        {forceCondition === "lost" && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-md text-xs flex items-start gap-2">
                                <span className="font-semibold">Lost Book Flat Fine:</span> A $50.00 replacement charge will be applied to the member's account.
                            </div>
                        )}

                        {/* Notes */}
                        <div className="space-y-1">
                            <Label htmlFor="force-notes" className="text-xs font-semibold">Administrative Return Notes</Label>
                            <Textarea
                                id="force-notes"
                                placeholder="Add any notes on return condition, shelf placement, etc."
                                value={forceNotes}
                                onChange={(e) => setForceNotes(e.target.value)}
                                className="text-xs"
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsForceDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant={forceCondition === "lost" ? "destructive" : "default"}
                            onClick={confirmForceReturn}
                            disabled={forceReturnBook.isPending}
                            className="gap-2"
                        >
                            {forceReturnBook.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Confirm Return
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
