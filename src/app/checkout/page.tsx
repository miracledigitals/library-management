"use client";

import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePatrons } from "@/lib/api/patrons";
import { useBooks } from "@/lib/api/books";
import { performCheckout } from "@/lib/api/checkout-transaction";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    User,
    Book as BookIcon,
    X,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    ShoppingCart,
    Loader2,
    Zap
} from "lucide-react";
import { toast } from "sonner";
import { Patron, Book } from "@/types";
import { addDays } from "date-fns";

export default function CheckoutPage() {
    const { user } = useAuth();
    const [step, setStep] = useState(1);

    // Selection States
    const [patronSearch, setPatronSearch] = useState("");
    const [selectedPatron, setSelectedPatron] = useState<Patron | null>(null);

    const [bookSearch, setBookSearch] = useState("");
    const [cart, setCart] = useState<Book[]>([]);

    const [isProcessing, setIsProcessing] = useState(false);

    // Queries
    const { data: patrons } = usePatrons({ search: patronSearch });
    const { data: books } = useBooks({ search: bookSearch });

    const addToCart = (book: Book) => {
        if (cart.find(item => item.id === book.id)) {
            toast.warning("Book already in cart");
            return;
        }
        if (book.availableCopies < 1) {
            toast.error("No copies available");
            return;
        }
        if (selectedPatron && (selectedPatron.currentCheckouts + cart.length >= selectedPatron.maxBooksAllowed)) {
            toast.error(`Limit reached: Patron can only checkout ${selectedPatron.maxBooksAllowed} books total`);
            return;
        }
        setCart([...cart, book]);
        setBookSearch("");
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const handleCheckout = async () => {
        if (!selectedPatron || cart.length === 0 || !user) return;

        setIsProcessing(true);
        try {
            const dueDate = addDays(new Date(), 14);
            await performCheckout(
                selectedPatron.id as string,
                cart.map(b => b.id as string),
                user.id as string,
                dueDate
            );
            toast.success("Checkout completed successfully!");
            setStep(3); // Confirmation step
        } catch (error: any) {
            toast.error(error.message || "Checkout failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const resetCheckout = () => {
        setSelectedPatron(null);
        setPatronSearch("");
        setCart([]);
        setBookSearch("");
        setStep(1);
    };

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
                        <p className="text-muted-foreground">Process new book loans for library members.</p>
                    </div>
                    <Link href="/checkout/express">
                        <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary font-bold">
                            <Zap className="h-4 w-4 fill-primary" />
                            Switch to Express Mode
                        </Button>
                    </Link>
                </div>

                {/* Stepper Header */}
                <div className="flex items-center gap-4 py-2 border-b">
                    <div className={`flex items-center gap-2 ${step === 1 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${step === 1 ? "bg-primary text-primary-foreground border-primary" : ""}`}>1</span>
                        Patron
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className={`flex items-center gap-2 ${step === 2 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${step === 2 ? "bg-primary text-primary-foreground border-primary" : ""}`}>2</span>
                        Books
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className={`flex items-center gap-2 ${step === 3 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${step === 3 ? "bg-primary text-primary-foreground border-primary" : ""}`}>3</span>
                        Done
                    </div>
                </div>

                {step === 1 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Patron</CardTitle>
                            <CardDescription>Search by name, email, or member ID.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Scan card or type name..."
                                    className="pl-8"
                                    value={patronSearch}
                                    onChange={(e) => setPatronSearch(e.target.value)}
                                />
                            </div>

                            {selectedPatron ? (
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5 border-primary/20">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                                            <User className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg">{selectedPatron.firstName} {selectedPatron.lastName}</div>
                                            <div className="text-sm text-muted-foreground">{selectedPatron.memberId} • {selectedPatron.membershipType.toUpperCase()}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-sm font-medium">Checkouts: {selectedPatron.currentCheckouts}/{selectedPatron.maxBooksAllowed}</div>
                                            <div className={`text-xs ${selectedPatron.finesDue > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                                                Fines: ${selectedPatron.finesDue.toFixed(2)}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setSelectedPatron(null)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {patronSearch.length > 1 && patrons?.slice(0, 3).map(p => (
                                        <div
                                            key={p.id}
                                            className={`flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-muted transition-colors ${p.finesDue > 20 || p.membershipStatus !== 'active' ? 'opacity-50 grayscale' : ''}`}
                                            onClick={() => {
                                                if (p.finesDue <= 20 && p.membershipStatus === 'active') {
                                                    setSelectedPatron(p);
                                                } else {
                                                    toast.error("Patron blocked: Membership issue or high fines");
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <div className="text-sm font-semibold">{p.firstName} {p.lastName}</div>
                                                    <div className="text-xs text-muted-foreground">{p.memberId}</div>
                                                </div>
                                            </div>
                                            {p.finesDue > 20 && <Badge variant="destructive">Blocked</Badge>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Button
                                className="w-full mt-4"
                                disabled={!selectedPatron}
                                onClick={() => setStep(2)}
                            >
                                Next: Add Books
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {step === 2 && selectedPatron && (
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Add Books</CardTitle>
                                <CardDescription>Scan barcode or search by ISBN/Title.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search books..."
                                        className="pl-8"
                                        value={bookSearch}
                                        onChange={(e) => setBookSearch(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {bookSearch.length > 1 && books?.slice(0, 5).map(b => (
                                        <div
                                            key={b.id}
                                            className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-muted"
                                            onClick={() => addToCart(b)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <BookIcon className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <div className="text-sm font-semibold truncate max-w-[200px]">{b.title}</div>
                                                    <div className="text-xs text-muted-foreground">{b.availableCopies} available</div>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="ghost">Add</Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Cart</CardTitle>
                                        <CardDescription>{cart.length} items selected</CardDescription>
                                    </div>
                                    <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {cart.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                            Cart is empty
                                        </div>
                                    ) : (
                                        cart.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <BookIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                    <span className="text-sm font-medium truncate">{item.title}</span>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id!)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    )}

                                    {cart.length > 0 && (
                                        <div className="pt-4 border-t space-y-4">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Due Date</span>
                                                <span className="font-semibold">{addDays(new Date(), 14).toLocaleDateString()}</span>
                                            </div>
                                            <Button
                                                className="w-full"
                                                onClick={handleCheckout}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? (
                                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                                                ) : (
                                                    "Complete Checkout"
                                                )}
                                            </Button>
                                            <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>
                                                Back to Patron
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {selectedPatron && (
                                <Card className="bg-muted/50 border-none shadow-none">
                                    <CardContent className="pt-6 text-sm">
                                        <div className="font-semibold mb-2">Checkout Summary</div>
                                        <p className="text-muted-foreground">Patron: {selectedPatron.firstName} {selectedPatron.lastName}</p>
                                        <p className="text-muted-foreground">Limit: {selectedPatron.currentCheckouts + cart.length} / {selectedPatron.maxBooksAllowed}</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <Card className="text-center py-12">
                        <CardContent className="space-y-6">
                            <div className="flex justify-center">
                                <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <CardTitle className="text-2xl">Checkout Successful!</CardTitle>
                                <CardDescription>
                                    The transaction has been recorded. All counters and inventory have been updated.
                                </CardDescription>
                            </div>
                            <div className="flex justify-center gap-4">
                                <Button variant="outline" onClick={resetCheckout}>Next Checkout</Button>
                                <Link href="/dashboard">
                                    <Button>Go to Dashboard</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
