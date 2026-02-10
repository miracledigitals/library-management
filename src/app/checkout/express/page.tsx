"use client";

import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePatrons } from "@/lib/api/patrons";
import { useBooks } from "@/lib/api/books";
import { performCheckout } from "@/lib/api/checkout-transaction";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Zap,
    Scan,
    User,
    Book as BookIcon,
    X,
    CheckCircle2,
    AlertCircle,
    ShoppingCart,
    Loader2,
    ArrowRight,
    Keyboard
} from "lucide-react";
import { toast } from "sonner";
import { Patron, Book } from "@/types";
import { addDays, format } from "date-fns";
import { Separator } from "@/components/ui/separator";

export default function ExpressCheckoutPage() {
    const { user } = useAuth();
    const [scanInput, setScanInput] = useState("");
    const [activePatron, setActivePatron] = useState<Patron | null>(null);
    const [cart, setCart] = useState<Book[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastAction, setLastAction] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    // Dynamic Queries based on input
    const { data: patrons } = usePatrons({ search: scanInput });
    const { data: books } = useBooks({ search: scanInput });

    // Keep input focused
    useEffect(() => {
        const timer = setInterval(() => {
            if (document.activeElement?.tagName !== "INPUT") {
                inputRef.current?.focus();
            }
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        const input = scanInput.trim();
        if (!input) return;

        setScanInput(""); // Clear for next scan
        setLastAction(null);

        // Logic 1: Is it a Member ID? (Starts with MEM-)
        if (input.toUpperCase().startsWith("MEM-")) {
            const patron = patrons?.find(p => p.memberId === input);
            if (patron) {
                if (patron.membershipStatus !== "active" || patron.finesDue > 20) {
                    setLastAction({ type: 'error', message: `Patron BLOCKED: ${patron.firstName} ${patron.lastName}` });
                    toast.error("Patron blocked: Verification required");
                } else {
                    setActivePatron(patron);
                    setLastAction({ type: 'success', message: `Patron ACTIVATED: ${patron.firstName} ${patron.lastName}` });
                    toast.success("Patron identified");
                }
            } else {
                setLastAction({ type: 'error', message: `Member ID NOT FOUND: ${input}` });
            }
            return;
        }

        // Logic 2: Is it a Book? (Check ISBN or Title match)
        const book = books?.find(b => b.isbn === input || b.id === input);
        if (book) {
            if (book.availableCopies < 1) {
                setLastAction({ type: 'error', message: `OUT OF STOCK: ${book.title}` });
                toast.error("No copies available");
            } else if (cart.find(item => item.id === book.id)) {
                setLastAction({ type: 'error', message: `ALREADY IN CART: ${book.title}` });
            } else {
                setCart(prev => [...prev, book]);
                setLastAction({ type: 'success', message: `ADDED: ${book.title}` });
                toast.success("Book added to session");
            }
            return;
        }

        setLastAction({ type: 'error', message: `UNRECOGNIZED SCAN: ${input}` });
    };

    const handleCheckout = async () => {
        if (!activePatron || cart.length === 0 || !user) return;

        setIsProcessing(true);
        try {
            const dueDate = addDays(new Date(), 14);
            await performCheckout(
                activePatron.id as string,
                cart.map(b => b.id as string),
                user.uid as string,
                dueDate
            );
            toast.success("Express Checkout Successful!");
            setActivePatron(null);
            setCart([]);
            setLastAction({ type: 'success', message: `CHECKOUT COMPLETE for ${activePatron.firstName}` });
        } catch (error: any) {
            toast.error(error.message || "Checkout failed");
            setLastAction({ type: 'error', message: "System Error: Transaction Failed" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Zap className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Express Circulation</h1>
                            <p className="text-muted-foreground">Scan-to-process checkout workflow.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1 gap-2">
                            <Scan className="h-3 w-3 animate-pulse text-emerald-500" /> Scanner Ready
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Scanner Input & Status Overlay */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-2 focus-within:border-primary transition-colors bg-slate-900 text-white overflow-hidden">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs uppercase tracking-widest text-slate-400">Scanner Input</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <form onSubmit={handleScan} className="relative">
                                    <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-500" />
                                    <Input
                                        ref={inputRef}
                                        value={scanInput}
                                        onChange={(e) => setScanInput(e.target.value)}
                                        className="h-20 bg-slate-800 border-slate-700 text-3xl pl-16 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-600"
                                        placeholder="Scan ID or Book..."
                                        autoFocus
                                    />
                                </form>

                                {/* Action Feedback Bar */}
                                {lastAction && (
                                    <div className={`p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${lastAction.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                        }`}>
                                        {lastAction.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                        <span className="font-bold text-lg uppercase tracking-tight">{lastAction.message}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Active Patron Card */}
                            <Card className={activePatron ? "border-emerald-500/50 bg-emerald-50/10" : "bg-muted/30 border-dashed"}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <User className="h-4 w-4" /> Active Patron
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {activePatron ? (
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl">
                                                {activePatron.firstName[0]}{activePatron.lastName[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg">{activePatron.firstName} {activePatron.lastName}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{activePatron.memberId}</p>
                                                <Badge variant="outline" className="mt-1 text-[10px]">{activePatron.membershipType} MEMBER</Badge>
                                            </div>
                                            <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setActivePatron(null)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="h-16 flex items-center justify-center text-muted-foreground text-sm italic">
                                            No patron active. Scan member card.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Cart Summary Card */}
                            <Card className={cart.length > 0 ? "border-blue-500/50 bg-blue-50/10" : "bg-muted/30 border-dashed"}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <ShoppingCart className="h-4 w-4" /> Cart
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-2xl font-bold">{cart.length} <span className="text-sm font-normal text-muted-foreground">Items</span></p>
                                            <p className="text-xs text-muted-foreground">Remaining: {activePatron ? activePatron.maxBooksAllowed - activePatron.currentCheckouts - cart.length : '--'}</p>
                                        </div>
                                        {cart.length > 0 && (
                                            <Button variant="outline" size="sm" onClick={() => setCart([])}>Clear</Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Session Log & Commit */}
                    <div className="space-y-6">
                        <Card className="h-[calc(100vh-320px)] flex flex-col">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <BookIcon className="h-4 w-4" /> Session Log
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto space-y-2 p-4">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                                        <ShoppingCart className="h-12 w-12 border-2 rounded-full p-2 border-dashed" />
                                        <p className="text-xs">Scan books to add</p>
                                    </div>
                                ) : (
                                    cart.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between group p-2 rounded hover:bg-muted border border-transparent hover:border-border">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-8 w-6 bg-muted rounded flex-shrink-0 flex items-center justify-center text-[10px]">
                                                    {idx + 1}
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-semibold truncate leading-none mb-1">{item.title}</p>
                                                    <p className="text-[10px] text-muted-foreground font-mono">{item.isbn}</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                                onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )).reverse()
                                )}
                            </CardContent>
                            <Separator />
                            <div className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Estimated Due Date</span>
                                        <span className="font-bold text-foreground">{format(addDays(new Date(), 14), "PPP")}</span>
                                    </div>
                                </div>
                                <Button
                                    className="w-full h-14 text-xl font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg text-white"
                                    disabled={!activePatron || cart.length === 0 || isProcessing}
                                    onClick={handleCheckout}
                                >
                                    {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Zap className="h-6 w-6" />}
                                    Commit Loan
                                </Button>
                                {!activePatron && cart.length > 0 && (
                                    <p className="text-[10px] text-rose-500 font-bold text-center uppercase tracking-widest animate-pulse">
                                        Scanning Member ID Required
                                    </p>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
