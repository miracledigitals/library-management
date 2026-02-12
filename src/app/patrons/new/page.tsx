"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useCreatePatron } from "@/lib/api/patrons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, X, UserPlus } from "lucide-react";
import { MembershipType, MembershipStatus } from "@/types";

export default function NewPatronPage() {
    const router = useRouter();
    const createPatron = useCreatePatron();

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: {
            street: "",
            city: "",
            zipCode: "",
        },
        membershipType: "standard" as MembershipType,
        membershipStatus: "active" as MembershipStatus,
        maxBooksAllowed: 3,
        currentCheckouts: 0,
        totalCheckoutsHistory: 0,
        finesDue: 0,
        notes: "",
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), // 1 year from now
    });

    const handleTypeChange = (value: MembershipType) => {
        let maxBooks = 3;
        if (value === "premium") maxBooks = 5;
        if (value === "student") maxBooks = 2;

        setFormData(prev => ({
            ...prev,
            membershipType: value,
            maxBooksAllowed: maxBooks
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Generate member ID: MEM-YYYY-RANDOM
        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000);
        const memberId = `MEM-${year}-${random}`;

        try {
            await createPatron.mutateAsync({
                ...formData,
                memberId,
            });
            toast.success(`Member registered with ID: ${memberId}`);
            router.push("/patrons");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to register member";
            toast.error(message);
        }
    };

    return (
        <ProtectedRoute allowedRoles={["admin", "librarian"]}>
            <DashboardLayout>
                <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                    <div className="text-center sm:text-left">
                        <h1 className="text-3xl font-bold tracking-tight">Register Member</h1>
                        <p className="text-muted-foreground">Add a new member to the library system.</p>
                    </div>
                    <Button variant="ghost" onClick={() => router.back()} className="gap-2 w-full sm:w-auto">
                        <X className="h-4 w-4" /> Cancel
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    required
                                    value={formData.firstName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    required
                                    value={formData.lastName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Address</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="street">Street Address</Label>
                                <Input
                                    id="street"
                                    value={formData.address.street}
                                    onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, street: e.target.value } }))}
                                />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        id="city"
                                        value={formData.address.city}
                                        onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="zipCode">Zip Code</Label>
                                    <Input
                                        id="zipCode"
                                        value={formData.address.zipCode}
                                        onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, zipCode: e.target.value } }))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Membership Details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="membershipType">Membership Type</Label>
                                <Select
                                    value={formData.membershipType}
                                    onValueChange={(value: string) =>
                                        handleTypeChange(
                                            value === "premium" || value === "student" ? value : "standard"
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="standard">Standard (3 books)</SelectItem>
                                        <SelectItem value="premium">Premium (5 books)</SelectItem>
                                        <SelectItem value="student">Student (2 books)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 flex flex-col justify-end">
                                <p className="text-sm text-muted-foreground px-1 pb-2">
                                    Maximum books allowed: <span className="font-bold text-foreground">{formData.maxBooksAllowed}</span>
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <Button variant="outline" type="button" onClick={() => router.back()} className="w-full sm:w-auto">Cancel</Button>
                        <Button type="submit" disabled={createPatron.isPending} className="gap-2 w-full sm:w-auto">
                            {createPatron.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            <UserPlus className="h-4 w-4" />
                            Register Member
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
        </ProtectedRoute>
    );
}
