"use client";

import { usePatronCheckouts, useRenewLoan } from "@/lib/api/checkouts";
import { useBook } from "@/lib/api/books";
import { Checkout } from "@/types";
import { format, isPast, isToday, addDays } from "date-fns";
import { Calendar, RefreshCw, AlertCircle, Clock, Book as BookIcon } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export function LoansCarousel({ patronId }: { patronId: string }) {
    const { data: loans, isLoading } = usePatronCheckouts(patronId);

    if (isLoading) {
        return (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="min-w-[300px] max-w-[300px]">
                        <Skeleton className="h-[200px] w-full rounded-xl" />
                    </div>
                ))}
            </div>
        );
    }

    if (!loans || loans.length === 0) {
        return (
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <BookIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No active loans found.</p>
                <p className="text-sm text-muted-foreground">Books you borrow will appear here.</p>
            </div>
        );
    }

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide snap-x">
            {loans.map((loan) => (
                <div key={loan.id} className="min-w-[320px] max-w-[320px] snap-start">
                    <LoanCard loan={loan} />
                </div>
            ))}
        </div>
    );
}

function LoanCard({ loan }: { loan: Checkout }) {
    const { data: book } = useBook(loan.bookId);
    const renewMutation = useRenewLoan();

    const dueDate = new Date(loan.dueDate);
    const isOverdue = isPast(dueDate) && !isToday(dueDate);
    const isDueSoon = !isOverdue && isPast(addDays(dueDate, -3));

    const handleRenew = async () => {
        try {
            await renewMutation.mutateAsync(loan);
            toast.success("Book loan renewed for 14 more days!");
        } catch (error: any) {
            toast.error(error.message || "Renewal failed");
        }
    };

    return (
        <Card className={`h-full flex flex-col overflow-hidden transition-all hover:shadow-md ${isOverdue ? 'border-rose-200' : ''}`}>
            <CardHeader className="p-0 border-b relative">
                <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden">
                    {book?.coverImage ? (
                        <img
                            src={book.coverImage}
                            alt={loan.bookTitle}
                            className="h-full w-full object-cover opacity-80"
                        />
                    ) : (
                        <BookIcon className="h-12 w-12 text-slate-400 opacity-50" />
                    )}
                </div>
                <div className="absolute top-2 right-2 flex flex-col gap-2">
                    {isOverdue && (
                        <Badge variant="destructive" className="animate-pulse shadow-sm shadow-rose-900/20">
                            OVERDUE
                        </Badge>
                    )}
                    {isDueSoon && !isOverdue && (
                        <Badge className="bg-amber-500 hover:bg-amber-600 border-none shadow-sm shadow-amber-900/20">
                            DUE SOON
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4 flex-1">
                <CardTitle className="text-base line-clamp-1 mb-1">{loan.bookTitle}</CardTitle>
                <p className="text-xs text-muted-foreground font-mono mb-3">{loan.bookIsbn}</p>

                <div className="space-y-2 mt-4">
                    <div className={`flex items-center justify-between p-2 rounded-lg text-sm font-medium ${isOverdue ? 'bg-rose-50 text-rose-700' : 'bg-primary/5 text-primary'}`}>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Return by</span>
                        </div>
                        <span>{format(dueDate, "MMM dd, yyyy")}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={handleRenew}
                    disabled={renewMutation.isPending || loan.renewalsCount >= loan.maxRenewals || isOverdue}
                >
                    <RefreshCw className={`h-3 w-3 ${renewMutation.isPending ? 'animate-spin' : ''}`} />
                    {loan.renewalsCount >= loan.maxRenewals ? 'Max Renewals' : 'Renew'}
                </Button>
            </CardFooter>
        </Card>
    );
}
