"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePatrons } from "@/lib/api/patrons";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, FilterX, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatronsPage() {
    const [search, setSearch] = useState("");
    const [type, setType] = useState("All");
    const [status, setStatus] = useState("All");

    const { data: patrons, isLoading } = usePatrons({ search, type, status });

    const resetFilters = () => {
        setSearch("");
        setType("All");
        setStatus("All");
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Members</h1>
                        <p className="text-muted-foreground">
                            Manage member registrations, memberships, and accounts.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/patrons/manual">
                            <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5">
                                <FileText className="h-4 w-4" />
                                Manual Onboarding
                            </Button>
                        </Link>
                        <Link href="/patrons/new">
                            <Button className="gap-2">
                                <UserPlus className="h-4 w-4" />
                                Register Member
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, email, or member ID..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Membership" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Types</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="ghost" onClick={resetFilters} className="gap-2">
                        <FilterX className="h-4 w-4" />
                        Reset
                    </Button>
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Member ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Membership</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Checkouts</TableHead>
                                <TableHead>Fines</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : patrons?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No patrons found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                patrons?.map((patron) => (
                                    <TableRow key={patron.id} className={patron.finesDue > 20 ? "bg-rose-50/50" : ""}>
                                        <TableCell className="font-mono text-xs">{patron.memberId}</TableCell>
                                        <TableCell className="font-medium">
                                            {patron.lastName}, {patron.firstName}
                                            <div className="text-xs text-muted-foreground">{patron.email}</div>
                                        </TableCell>
                                        <TableCell className="capitalize">{patron.membershipType}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                patron.membershipStatus === "active" ? "default" :
                                                    patron.membershipStatus === "suspended" ? "destructive" : "secondary"
                                            }>
                                                {patron.membershipStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {patron.currentCheckouts} / {patron.maxBooksAllowed}
                                        </TableCell>
                                        <TableCell>
                                            <span className={patron.finesDue > 0 ? "text-rose-600 font-semibold" : ""}>
                                                ${patron.finesDue.toFixed(2)}
                                            </span>
                                            {patron.finesDue > 20 && (
                                                <AlertCircle className="h-3 w-3 inline ml-1 text-rose-600" />
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/patrons/${patron.id}`}>
                                                <Button variant="ghost" size="sm">View</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </DashboardLayout>
    );
}
