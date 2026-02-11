"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Book,
    Users,
    ArrowRightLeft,
    RotateCcw,
    AlertTriangle,
    Plus,
    UserPlus
} from "lucide-react";
import { useBooks } from "@/lib/api/books";
import { usePatrons, usePatron } from "@/lib/api/patrons";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { LoansCarousel } from "@/components/dashboard/LoansCarousel";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
    const { profile, user } = useAuth();
    const { data: books, isLoading: booksLoading } = useBooks();
    const { data: patrons, isLoading: patronsLoading } = usePatrons();
    const { data: patronData } = usePatron(profile?.id || "");

    // For patrons, we might want to fetch their specific checkouts too
    // But for now we can derive some info from the profile or mock data

    const isPatron = profile?.role === "patron";

    const stats = isPatron ? [
        {
            title: "Books in My Possession",
            value: patronData?.currentCheckouts || 0,
            icon: Book,
            color: "text-blue-600"
        },
        {
            title: "My Active Loans",
            value: patronData?.currentCheckouts || 0,
            icon: ArrowRightLeft,
            color: "text-indigo-600"
        },
        {
            title: "Account Standing",
            value: patronData?.finesDue ? `$${patronData.finesDue.toFixed(2)}` : "Good",
            icon: AlertTriangle,
            color: patronData?.finesDue ? "text-rose-600" : "text-emerald-600"
        }
    ] : [
        {
            title: "Total Books",
            value: booksLoading ? "..." : books?.length || 0,
            icon: Book,
            color: "text-blue-600"
        },
        {
            title: "Active Members",
            value: patronsLoading ? "..." : patrons?.length || 0,
            icon: Users,
            color: "text-emerald-600"
        },
        {
            title: "Checked Out",
            value: booksLoading ? "..." : books?.filter(b => b.availableCopies < b.totalCopies).length || 0,
            icon: ArrowRightLeft,
            color: "text-indigo-600"
        },
        {
            title: "Overdue Items",
            value: "0",
            icon: AlertTriangle,
            color: "text-rose-600"
        },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground">
                            {isPatron
                                ? "Welcome back! Here is an overview of your borrowed items."
                                : "Overview of your library's operations and recent highlights."}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <Card key={stat.title}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {stat.title}
                                </CardTitle>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {isPatron && profile && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold tracking-tight">Active Book Loans</h2>
                            <Link href="/books">
                                <Button variant="link" size="sm" className="text-primary font-bold">Browse More Books</Button>
                            </Link>
                        </div>
                        <LoansCarousel patronId={patronData?.id || ""} />
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            {isPatron ? (
                                <>
                                    <Link href="/books" className="w-full">
                                        <Button className="w-full h-16 text-lg gap-2" variant="outline">
                                            <Book className="h-5 w-5" /> Browse Catalog
                                        </Button>
                                    </Link>
                                    <Link href="/profile" className="w-full">
                                        <Button className="w-full h-16 text-lg gap-2" variant="outline">
                                            <Users className="h-5 w-5" /> My Membership
                                        </Button>
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link href="/checkout" className="w-full">
                                        <Button className="w-full h-16 text-lg gap-2" variant="outline">
                                            <ArrowRightLeft className="h-5 w-5" /> Checkout
                                        </Button>
                                    </Link>
                                    <Link href="/returns" className="w-full">
                                        <Button className="w-full h-16 text-lg gap-2" variant="outline">
                                            <RotateCcw className="h-5 w-5" /> Return
                                        </Button>
                                    </Link>
                                    <Link href="/books/new" className="w-full">
                                        <Button className="w-full h-16 text-lg gap-2" variant="outline">
                                            <Plus className="h-5 w-5" /> Add Book
                                        </Button>
                                    </Link>
                                    <Link href="/patrons/new" className="w-full">
                                        <Button className="w-full h-16 text-lg gap-2" variant="outline">
                                            <UserPlus className="h-5 w-5" /> New Member
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="col-span-3">
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <RecentActivity userId={isPatron ? user?.id : undefined} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
