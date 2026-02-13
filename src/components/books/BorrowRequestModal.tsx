"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
    Book,
    ArrowRight,
    Calendar as CalendarIcon,
    Clock,
    ShieldCheck,
    Loader2
} from "lucide-react";
import { format, addDays } from "date-fns";
import { Book as BookType } from "@/types";
import { useCreateBorrowRequest } from "@/lib/api/requests";
import { toast } from "sonner";

interface BorrowRequestModalProps {
    book: BookType;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patronId: string;
    patronName: string;
}

export function BorrowRequestModal({
    book,
    open,
    onOpenChange,
    patronId,
    patronName
}: BorrowRequestModalProps) {
    const [step, setStep] = useState(1);
    const [isSlowReader, setIsSlowReader] = useState(false);
    const [pickupDate, setPickupDate] = useState<Date | undefined>(addDays(new Date(), 1));
    const [pickupLocation, setPickupLocation] = useState("Main Branch");
    const [termsAgreed, setTermsAgreed] = useState(false);

    const createRequest = useCreateBorrowRequest();

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        if (!termsAgreed) return;

        console.log("Submitting borrow request with:", {
            bookId: book.id,
            patronId,
            patronName,
            bookTitle: book.title
        });

        try {
            await createRequest.mutateAsync({
                bookId: book.id || "",
                patronId,
                requesterName: patronName,
                bookTitle: book.title,
                // These would be stored in metadata or specific fields if we update the schema, 
                // but for now we'll stick to the basic schema and add notes
                adminNotes: `Pickup: ${pickupLocation} on ${pickupDate ? format(pickupDate, "PPP") : "TBD"}. ${isSlowReader ? "Requested slow reader extension." : ""}`
            });
            toast.success("Borrow application submitted!");
            onOpenChange(false);
            setStep(1); // Reset for next time
        } catch (error: any) {
            console.error("Borrow request error:", error);
            const message = error?.message || error?.details || (typeof error === 'string' ? error : "Failed to submit application");
            toast.error(message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => {
            onOpenChange(v);
            if (!v) setTimeout(() => setStep(1), 300); // Reset after close animation
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                            <Book className="h-4 w-4 text-primary" />
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                            Step {step} of 3
                        </Badge>
                    </div>
                    <DialogTitle>{book.title}</DialogTitle>
                    <DialogDescription>
                        {step === 1 && "Confirm book details and options."}
                        {step === 2 && "Choose when and where to pick up."}
                        {step === 3 && "Review terms and submit application."}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="flex gap-4 p-3 bg-muted/50 rounded-lg border">
                                {book.coverImage ? (
                                    <img src={book.coverImage} alt="" className="h-20 w-15 object-cover rounded shadow-sm" />
                                ) : (
                                    <div className="h-20 w-15 bg-muted flex items-center justify-center rounded border border-dashed">
                                        <Book className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <p className="font-medium text-sm">{book.author}</p>
                                    <p className="text-xs text-muted-foreground">Format: Hardcover</p>
                                    <p className="text-xs text-muted-foreground">Location: Shelf {book.isbn.slice(-2)}-{book.isbn.slice(-1)}</p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="slow-reader"
                                        checked={isSlowReader}
                                        onCheckedChange={(v) => setIsSlowReader(v as boolean)}
                                    />
                                    <Label htmlFor="slow-reader" className="text-sm cursor-pointer">
                                        I&apos;m a slow reader - request extended loan (21 days)
                                    </Label>
                                </div>
                                <p className="text-[10px] text-muted-foreground ml-6 italic">
                                    Standard loan period is 14 days. Verification may apply.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" /> Pickup Date
                                </Label>
                                <div className="border rounded-md p-1 bg-card">
                                    <Calendar
                                        mode="single"
                                        selected={pickupDate}
                                        onSelect={setPickupDate}
                                        disabled={(date) => date < new Date() || date > addDays(new Date(), 14)}
                                        className="rounded-md"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> Collection Point
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {["Main Branch", "Express Locker"].map((loc) => (
                                        <Button
                                            key={loc}
                                            variant={pickupLocation === loc ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setPickupLocation(loc)}
                                            className="text-xs"
                                        >
                                            {loc}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                                <h4 className="text-sm font-bold flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Loan Terms
                                </h4>
                                <ul className="text-xs space-y-2 text-muted-foreground">
                                    <li className="flex gap-2">
                                        <span className="text-emerald-600">•</span>
                                        Loan Duration: {isSlowReader ? "21" : "14"} days from pickup.
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-emerald-600">•</span>
                                        Late Fee: $0.50/day (max $10.00).
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-emerald-600">•</span>
                                        Replacement Cost: $25.00 if lost or damaged.
                                    </li>
                                </ul>
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox
                                    id="terms"
                                    checked={termsAgreed}
                                    onCheckedChange={(v) => setTermsAgreed(v as boolean)}
                                />
                                <Label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                                    I agree to the library loan terms and conditions.
                                </Label>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-row gap-2 sm:justify-between border-t pt-4">
                    {step > 1 ? (
                        <Button variant="ghost" onClick={handleBack} disabled={createRequest.isPending}>
                            Back
                        </Button>
                    ) : (
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                    )}

                    {step < 3 ? (
                        <Button onClick={handleNext} className="gap-2">
                            Continue <ArrowRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={!termsAgreed || createRequest.isPending}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {createRequest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Submit Application
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
