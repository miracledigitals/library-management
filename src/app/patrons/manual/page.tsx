"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useCreatePatron } from "@/lib/api/patrons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Loader2,
    X,
    Camera,
    IdCard,
    Check,
    Printer,
    UserPlus,
    AlertCircle,
    Mail,
    Shield
} from "lucide-react";
import { MembershipType, MembershipStatus } from "@/types";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";

export default function ManualRegistrationPage() {
    const router = useRouter();
    const createPatron = useCreatePatron();

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        dob: "",
        idType: "Driver's License",
        idNumber: "",
        email: "",
        hasNoEmail: false,
        phone: "",
        smsOptIn: true,
        address: {
            street: "",
            city: "",
            zipCode: "",
        },
        membershipType: "standard" as MembershipType,
        membershipStatus: "active" as MembershipStatus,
        guardianName: "",
        notes: "",
    });

    const [isRegistered, setIsRegistered] = useState(false);
    const [memberId, setMemberId] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Generate member ID: MEM-YYYY-RANDOM
        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000);
        const newMemberId = `MEM-${year}-${random}`;

        try {
            await createPatron.mutateAsync({
                memberId: newMemberId,
                email: formData.hasNoEmail ? `no-email-${newMemberId}@library.system` : formData.email,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                address: formData.address,
                membershipType: formData.membershipType,
                membershipStatus: formData.membershipStatus,
                notes: formData.notes,
                maxBooksAllowed: formData.membershipType === "premium" ? 5 : (formData.membershipType === "student" ? 2 : 3),
                currentCheckouts: 0,
                totalCheckoutsHistory: 0,
                finesDue: 0,
                expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
            });
            setMemberId(newMemberId);
            setIsRegistered(true);
            toast.success("Patron registered successfully!");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to register patron";
            toast.error(message);
        }
    };

    if (isRegistered) {
        return (
            <ProtectedRoute allowedRoles={["admin", "librarian"]}>
                <DashboardLayout>
                    <div className="max-w-2xl mx-auto py-12">
                    <Card className="border-2 border-emerald-500 shadow-lg overflow-hidden">
                        <CardHeader className="text-center bg-emerald-500 text-white p-8">
                            <div className="mx-auto h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                                <Check className="h-8 w-8 text-white" />
                            </div>
                            <CardTitle className="text-2xl font-bold">Registration Complete</CardTitle>
                            <CardDescription className="text-emerald-50/80">
                                The new member has been successfully onboarded.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="flex justify-center">
                                <div className="border border-muted rounded-xl p-6 w-full max-w-[320px] bg-gradient-to-br from-card to-muted/30 shadow-sm relative">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <Shield className="h-6 w-6 text-primary" />
                                        </div>
                                        <Badge variant="secondary" className="text-[10px]">TEMPORARY CARD</Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-xl uppercase tracking-tight">{formData.firstName} {formData.lastName}</h3>
                                        <p className="text-xs font-mono text-muted-foreground">{memberId}</p>
                                    </div>
                                    <div className="mt-8 flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[8px] uppercase font-bold text-muted-foreground">Valid Until</p>
                                            <p className="text-xs font-semibold">{format(addDays(new Date(), 30), "MMM dd, yyyy")}</p>
                                        </div>
                                        <div className="h-14 w-14 bg-white border rounded p-1 flex items-center justify-center">
                                            <div className="h-full w-full bg-slate-900 rounded-[2px] flex items-center justify-center text-[6px] font-bold text-white text-center leading-tight">
                                                ID<br />QR
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4">
                                <Button variant="outline" className="gap-2 h-11" onClick={() => window.print()}>
                                    <Printer className="h-4 w-4" /> Print Card
                                </Button>
                                <Button className="gap-2 h-11" onClick={() => router.push("/patrons")}>
                                    View Repository
                                </Button>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-muted/30 border-t justify-center py-4">
                            <Button variant="link" size="sm" onClick={() => setIsRegistered(false)}>Register Another Patron</Button>
                        </CardFooter>
                    </Card>
                </div>
            </DashboardLayout>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute allowedRoles={["admin", "librarian"]}>
            <DashboardLayout>
                <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Manual Onboarding Flow</h1>
                        <p className="text-muted-foreground">Guided registration for walk-in library members.</p>
                    </div>
                    <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                        <X className="h-4 w-4" /> Exit
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
                    <div className="md:col-span-2 space-y-6">
                        {/* Section 1: Identification */}
                        <Card>
                            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <IdCard className="h-4 w-4 text-blue-600" />
                                </div>
                                <CardTitle className="text-lg">Section 1: Identification</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input
                                        id="firstName"
                                        required
                                        value={formData.firstName}
                                        onChange={(e) => setFormData(d => ({ ...d, firstName: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        required
                                        value={formData.lastName}
                                        onChange={(e) => setFormData(d => ({ ...d, lastName: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dob">Date of Birth</Label>
                                    <Input
                                        id="dob"
                                        type="date"
                                        required
                                        value={formData.dob}
                                        onChange={(e) => setFormData(d => ({ ...d, dob: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="idType">Identification Type</Label>
                                    <Select value={formData.idType} onValueChange={(v) => setFormData(d => ({ ...d, idType: v }))}>
                                        <SelectTrigger id="idType">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Driver's License">Driver&apos;s License</SelectItem>
                                            <SelectItem value="Student ID">Student ID</SelectItem>
                                            <SelectItem value="Passport">Passport</SelectItem>
                                            <SelectItem value="State ID">State ID</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="idNumber">Valid ID Reference Number</Label>
                                    <Input
                                        id="idNumber"
                                        placeholder="Enter number for system verification"
                                        value={formData.idNumber}
                                        onChange={(e) => setFormData(d => ({ ...d, idNumber: e.target.value }))}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Section 2: Contact */}
                        <Card>
                            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
                                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                                    <Mail className="h-4 w-4 text-amber-600" />
                                </div>
                                <CardTitle className="text-lg">Section 2: Contact Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="email">Email Address</Label>
                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded border">
                                                <Checkbox
                                                    id="no-email"
                                                    checked={formData.hasNoEmail}
                                                    onCheckedChange={(v) => setFormData(d => ({ ...d, hasNoEmail: v as boolean }))}
                                                />
                                                <Label htmlFor="no-email" className="text-[10px] cursor-pointer font-bold">No Email</Label>
                                            </div>
                                        </div>
                                        <Input
                                            id="email"
                                            type="email"
                                            disabled={formData.hasNoEmail}
                                            required={!formData.hasNoEmail}
                                            value={formData.email}
                                            onChange={(e) => setFormData(d => ({ ...d, email: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) => setFormData(d => ({ ...d, phone: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="street">Street Address</Label>
                                    <Input
                                        id="street"
                                        value={formData.address.street}
                                        onChange={(e) => setFormData(d => ({ ...d, address: { ...d.address, street: e.target.value } }))}
                                    />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Input
                                        placeholder="City"
                                        value={formData.address.city}
                                        onChange={(e) => setFormData(d => ({ ...d, address: { ...d.address, city: e.target.value } }))}
                                    />
                                    <Input
                                        placeholder="Zip Code"
                                        value={formData.address.zipCode}
                                        onChange={(e) => setFormData(d => ({ ...d, address: { ...d.address, zipCode: e.target.value } }))}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        {/* Photo Capture Mock */}
                        <Card>
                            <CardHeader className="pb-3 px-4">
                                <CardTitle className="text-sm font-semibold">Security Photo</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-4 px-4 pb-4">
                                <div className="h-32 w-32 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30 relative group transition-colors hover:bg-muted/80">
                                    <Camera className="h-8 w-8 text-muted-foreground/50 group-hover:text-muted-foreground" />
                                </div>
                                <Button variant="outline" size="sm" type="button" className="w-full gap-2 text-xs h-9">
                                    <Camera className="h-3.5 w-3.5" /> Initialize Camera
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Section 3: Membership */}
                        <Card className="bg-emerald-50/30 border-emerald-100">
                            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
                                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Shield className="h-4 w-4 text-emerald-600" />
                                </div>
                                <CardTitle className="text-lg text-emerald-900">Membership</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="membershipType" className="text-emerald-800">Tier Selection</Label>
                                    <Select
                                        value={formData.membershipType}
                                        onValueChange={(v: string) =>
                                            setFormData(d => ({
                                                ...d,
                                                membershipType:
                                                    v === "premium" || v === "student" ? v : "standard"
                                            }))
                                        }
                                    >
                                        <SelectTrigger id="membershipType" className="bg-background border-emerald-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">Standard Membership</SelectItem>
                                            <SelectItem value="premium">Premium Membership</SelectItem>
                                            <SelectItem value="student">Student Membership</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {formData.dob && new Date().getFullYear() - new Date(formData.dob).getFullYear() < 18 && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Label htmlFor="guardian" className="text-rose-700">Guardian Card Linking</Label>
                                        <Input
                                            id="guardian"
                                            placeholder="Scan parent card or ID"
                                            className="border-rose-200 focus-visible:ring-rose-200"
                                            value={formData.guardianName}
                                            onChange={(e) => setFormData(d => ({ ...d, guardianName: e.target.value }))}
                                        />
                                        <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" /> Minor registration requires guardian linking
                                        </p>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Onboarding Notes</Label>
                                    <Textarea
                                        id="notes"
                                        className="h-24 bg-background border-emerald-200 resize-none"
                                        placeholder="Note any physical limitations or special requests..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData(d => ({ ...d, notes: e.target.value }))}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Button
                            className="w-full h-14 text-lg gap-2 shadow-lg bg-emerald-600 hover:bg-emerald-700"
                            type="submit"
                            disabled={createPatron.isPending}
                        >
                            {createPatron.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
                            Commit Registration
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
        </ProtectedRoute>
    );
}
