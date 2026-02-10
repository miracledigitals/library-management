"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBooks } from "@/lib/api/books";
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
import { Plus, Search, FilterX } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useDeleteBook } from "@/lib/api/books";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateBorrowRequest, usePatronRequests } from "@/lib/api/requests";
import { Loader2, BookCheck, LayoutGrid, List as ListIcon } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BorrowRequestModal } from "@/components/books/BorrowRequestModal";
import { Book as BookType } from "@/types";

export default function BooksPage() {
    const [search, setSearch] = useState("");
    const [genre, setGenre] = useState("All");
    const [status, setStatus] = useState("All");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
    const [selectedBookForModal, setSelectedBookForModal] = useState<BookType | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { profile, user } = useAuth();
    const { data: books, isLoading, refetch } = useBooks({ search, genre, status });
    const { data: myRequests } = usePatronRequests(user?.uid || "");
    const deleteBook = useDeleteBook();
    const createRequest = useCreateBorrowRequest();

    const isPatron = profile?.role === "patron";
    const canManageBooks = profile?.role === "admin" || profile?.role === "librarian";
    const canBulkDelete = profile?.role === "admin";

    const resetFilters = () => {
        setSearch("");
        setGenre("All");
        setStatus("All");
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        try {
            await Promise.all(selectedIds.map(id => deleteBook.mutateAsync(id)));
            toast.success(`${selectedIds.length} books deleted.`);
            setSelectedIds([]);
            refetch(); // Re-fetch books after deletion
        } catch (error) {
            toast.error("Failed to delete some books.");
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (!canBulkDelete) return;
        if (books && selectedIds.length === books.length) {
            setSelectedIds([]);
        } else if (books) {
            setSelectedIds(books.map(book => book.id));
        }
    };

    const handleRequestBorrow = (book: any) => {
        setSelectedBookForModal(book);
        setIsModalOpen(true);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Books</h1>
                        <p className="text-muted-foreground">
                            Manage your library's collection and inventory.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {selectedIds.length > 0 && (
                            <Button variant="destructive" onClick={handleBulkDelete}>
                                Delete Selected ({selectedIds.length})
                            </Button>
                        )}
                        <Link href="/books/new">
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add New Book
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by title, author, or ISBN..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Select value={genre} onValueChange={setGenre}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Genre" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Genres</SelectItem>
                            <SelectItem value="Fiction">Fiction</SelectItem>
                            <SelectItem value="Non-Fiction">Non-Fiction</SelectItem>
                            <SelectItem value="Science">Science</SelectItem>
                            <SelectItem value="Technology">Technology</SelectItem>
                            <SelectItem value="Biography">Biography</SelectItem>
                            <SelectItem value="History">History</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Status</SelectItem>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="low_stock">Low Stock</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="ghost" onClick={resetFilters} className="gap-2">
                        <FilterX className="h-4 w-4" />
                        Reset
                    </Button>

                    <div className="flex border rounded-md ml-auto">
                        <Button
                            variant={viewMode === "grid" ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-r-none"
                            onClick={() => setViewMode("grid")}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-l-none"
                            onClick={() => setViewMode("list")}
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {viewMode === "list" ? (
                    <div className="rounded-md border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={books && selectedIds.length === books.length && books.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>ISBN</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Availability</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : books?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground italic">
                                            No books found. Try adjusting your filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    books?.map((book) => (
                                        <TableRow key={book.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(book.id)}
                                                    onCheckedChange={() => toggleSelect(book.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{book.title}</TableCell>
                                            <TableCell>{book.author}</TableCell>
                                            <TableCell className="font-mono text-xs">{book.isbn}</TableCell>
                                            <TableCell>
                                                {book.availableCopies} / {book.totalCopies}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    book.status === "available" ? "default" :
                                                        book.status === "low_stock" ? "secondary" : "destructive"
                                                }>
                                                    {book.status.replace("_", " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`/books/${book.id}`}>
                                                        <Button variant="ghost" size="sm">View</Button>
                                                    </Link>
                                                    {isPatron && (
                                                        (() => {
                                                            const existingRequest = myRequests?.find(r => r.bookId === book.id && r.status === "pending");
                                                            const isApproved = myRequests?.find(r => r.bookId === book.id && r.status === "approved");

                                                            if (isApproved) return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Approved</Badge>;
                                                            if (existingRequest) return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Pending</Badge>;

                                                            return (
                                                                <Button
                                                                    size="sm"
                                                                    className="gap-1.5"
                                                                    disabled={book.availableCopies === 0 || createRequest.isPending}
                                                                    onClick={() => handleRequestBorrow(book)}
                                                                >
                                                                    {createRequest.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookCheck className="h-3.5 w-3.5" />}
                                                                    Apply
                                                                </Button>
                                                            );
                                                        })()
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {isLoading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <Card key={i} className="overflow-hidden">
                                    <Skeleton className="aspect-[3/4] w-full" />
                                    <CardHeader className="p-4">
                                        <Skeleton className="h-5 w-2/3" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </CardHeader>
                                    <CardFooter className="p-4 pt-0">
                                        <Skeleton className="h-9 w-full" />
                                    </CardFooter>
                                </Card>
                            ))
                        ) : books?.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-muted-foreground italic bg-card border rounded-lg">
                                No books found. Try adjusting your filters.
                            </div>
                        ) : (
                            books?.map((book) => (
                                <Card key={book.id} className="overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
                                    <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                                        {book.coverImage ? (
                                            <img
                                                src={book.coverImage}
                                                alt={book.title}
                                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground italic text-xs p-4 text-center">
                                                No cover available
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 flex flex-col gap-2">
                                            <Badge variant={
                                                book.status === "available" ? "default" :
                                                    book.status === "low_stock" ? "secondary" : "destructive"
                                            } className="shadow-sm">
                                                {book.status.replace("_", " ")}
                                            </Badge>
                                        </div>
                                    </div>
                                    <CardHeader className="p-4 flex-1">
                                        <CardTitle className="text-lg line-clamp-1">{book.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground line-clamp-1">{book.author}</p>
                                        <div className="mt-2 text-xs flex justify-between text-muted-foreground">
                                            <span>{book.genre}</span>
                                            <span>{book.availableCopies} available</span>
                                        </div>
                                    </CardHeader>
                                    <CardFooter className="p-4 pt-0 flex gap-2">
                                        <Link href={`/books/${book.id}`} className="flex-1">
                                            <Button variant="outline" size="sm" className="w-full">View Details</Button>
                                        </Link>
                                        {isPatron && (
                                            (() => {
                                                const existingRequest = myRequests?.find(r => r.bookId === book.id && r.status === "pending");
                                                const isApproved = myRequests?.find(r => r.bookId === book.id && r.status === "approved");

                                                if (isApproved) return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 py-1.5 h-9 grow">Approved</Badge>;
                                                if (existingRequest) return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 py-1.5 h-9 grow">Pending</Badge>;

                                                return (
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 gap-1.5"
                                                        disabled={book.availableCopies === 0 || createRequest.isPending}
                                                        onClick={() => handleRequestBorrow(book)}
                                                    >
                                                        {createRequest.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookCheck className="h-3.5 w-3.5" />}
                                                        Apply
                                                    </Button>
                                                );
                                            })()
                                        )}
                                    </CardFooter>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>

            {selectedBookForModal && (
                <BorrowRequestModal
                    book={selectedBookForModal}
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    patronId={user?.uid || ""}
                    patronName={profile?.displayName || profile?.email || ""}
                />
            )}
        </DashboardLayout>
    );
}
