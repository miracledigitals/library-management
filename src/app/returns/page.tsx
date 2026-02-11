"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBooks } from "@/lib/api/books";
import { findActiveCheckout, processReturn, DAMAGE_FINES } from "@/lib/api/return-transaction";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    RotateCcw,
    User,
    Book as BookIcon,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Calendar
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Checkout } from "@/types";
import { format, differenceInDays } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

export default function ReturnsPage() {
    const { user } = useAuth();
    const [search, setSearch] = useState("");
    const [checkout, setCheckout] = useState<Checkout | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [condition, setCondition] = useState<"good" | "worn" | "damaged" | "lost">("good");
    const [selectedDamages, setSelectedDamages] = useState<string[]>([]);

    // Query books to find the ID from ISBN
    const { data: books } = useBooks({ search });

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!search) return;

        setIsSearching(true);
        setCheckout(null);

        try {
            // Find book first
            const book = books?.find(b => b.isbn === search || b.title.toLowerCase().includes(search.toLowerCase()));
            if (!book) {
                toast.error("Book not found in catalog");
                return;
            }

            const activeCheckout = await findActiveCheckout(book.id!);
            if (!activeCheckout) {
                toast.info("This book is not currently checked out");
            } else {
                setCheckout(activeCheckout);
            }
        } catch (error) {
            toast.error("Error searching for checkout");
        } finally {
            setIsSearching(false);
        }
    };

    const handleReturn = async () => {
        if (!checkout || !user) return;

        setIsProcessing(true);
        try {
            const result = await processReturn(checkout.id, user.uid || "", condition, selectedDamages);
            toast.success(`Return processed. Fine: $${result.fineCharged.toFixed(2)}`);
            setCheckout(null);
            setSearch("");
            setCondition("good");
            setSelectedDamages([]);
        } catch (error: any) {
            toast.error(error.message || "Return failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const overdueDays = checkout ? differenceInDays(new Date(), checkout.dueDate.toDate()) : 0;
    const lateFee = Math.max(0, Math.min(overdueDays * 0.5, 50));
    const damageFee = condition === "lost"
        ? DAMAGE_FINES.lost
        : condition === "damaged"
            ? selectedDamages.reduce((acc, t) => acc + (DAMAGE_FINES[t] || 0), 0)
            : 0;
    const totalFine = lateFee + damageFee;

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Returns</h1>
                    <p className="text-muted-foreground">Process returning books and calculate overdue fines.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Book Lookup</CardTitle>
                        <CardDescription>Scan book barcode or enter ISBN to find active loan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="ISBN or Book Title..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Button type="submit" disabled={isSearching}>
                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {checkout && (
                    <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Loan Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-primary/10 rounded-lg">
                                        <BookIcon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg">{checkout.bookTitle}</div>
                                        <div className="text-sm text-muted-foreground">ISBN: {checkout.bookIsbn}</div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 pt-4 border-t">
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                        <User className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold">{checkout.patronName}</div>
                                        <div className="text-sm text-muted-foreground">ID: {checkout.patronMemberId}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground uppercase font-semibold">Checked Out</span>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                            {format(checkout.checkoutDate.toDate(), "MMM dd, yyyy")}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground uppercase font-semibold">Due Date</span>
                                        <div className={`flex items-center gap-2 text-sm font-medium ${overdueDays > 0 ? 'text-rose-600' : ''}`}>
                                            <Calendar className="h-3 w-3" />
                                            {format(checkout.dueDate.toDate(), "MMM dd, yyyy")}
                                            {overdueDays > 0 && <AlertCircle className="h-4 w-4" />}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Return Processing</CardTitle>
                                <CardDescription>Assess book condition and finalize return.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <Label>Book Condition</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(["good", "worn", "damaged", "lost"] as const).map((c) => (
                                            <Button
                                                key={c}
                                                variant={condition === c ? "default" : "outline"}
                                                size="sm"
                                                className="capitalize"
                                                onClick={() => {
                                                    setCondition(c);
                                                    if (c !== "damaged") setSelectedDamages([]);
                                                }}
                                            >
                                                {c}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {condition === "damaged" && (
                                    <div className="space-y-3 p-4 bg-amber-50 rounded-lg border border-amber-200 animate-in zoom-in-95">
                                        <Label className="text-amber-900 font-bold text-xs uppercase tracking-wider">Specific Damages</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.keys(DAMAGE_FINES).filter(k => k !== "lost").map((type) => (
                                                <div key={type} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={type}
                                                        checked={selectedDamages.includes(type)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) setSelectedDamages([...selectedDamages, type]);
                                                            else setSelectedDamages(selectedDamages.filter(t => t !== type));
                                                        }}
                                                    />
                                                    <Label htmlFor={type} className="capitalize flex justify-between w-full text-xs">
                                                        <span>{type}</span>
                                                        <span className="text-muted-foreground">${DAMAGE_FINES[type]}</span>
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Late Fees</span>
                                        <span className="font-medium">${lateFee.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Condition Penalty</span>
                                        <span className="font-medium">${damageFee.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                                        <span>Total Fine</span>
                                        <span className="text-rose-600">${totalFine.toFixed(2)}</span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full gap-2"
                                    size="lg"
                                    disabled={isProcessing}
                                    onClick={handleReturn}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RotateCcw className="h-4 w-4" />
                                    )}
                                    Process Return
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
