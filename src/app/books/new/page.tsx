"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCreateBook } from "@/lib/api/books";
import { lookupISBN, searchBooks, GoogleBookSearchResult } from "@/lib/google-books";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Loader2, Save, X } from "lucide-react";
import { BookStatus } from "@/types";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function NewBookPage() {
    const router = useRouter();
    const createBook = useCreateBook();
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<GoogleBookSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [formData, setFormData] = useState({
        isbn: "",
        title: "",
        author: "",
        publisher: "",
        publishedYear: new Date().getFullYear(),
        genre: [] as string[],
        description: "",
        totalCopies: 1,
        availableCopies: 1,
        location: "",
        status: "available" as BookStatus,
        coverImage: null as string | null,
        metadata: {
            language: "en",
        }
    });

    const handleLookup = async () => {
        if (!formData.isbn) {
            toast.error("Please enter an ISBN first");
            return;
        }

        setIsLookingUp(true);
        try {
            const info = await lookupISBN(formData.isbn);
            if (info) {
                setFormData(prev => ({
                    ...prev,
                    title: info.title,
                    author: info.authors.join(", "),
                    publisher: info.publisher,
                    publishedYear: parseInt(info.publishedDate.substring(0, 4)) || prev.publishedYear,
                    description: info.description,
                    coverImage: info.imageLinks?.thumbnail || null,
                    metadata: { ...prev.metadata, language: info.language }
                }));
                toast.success("Book details found!");
            } else {
                toast.error("No book found for this ISBN");
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to lookup ISBN";
            toast.error(message);
        } finally {
            setIsLookingUp(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            toast.error("Enter a title or author to search.");
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchBooks(searchQuery.trim());
            setSearchResults(results);
            if (results.length === 0) {
                toast.error("No books found for that search.");
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to search books";
            toast.error(message);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectResult = (result: GoogleBookSearchResult) => {
        setFormData(prev => ({
            ...prev,
            isbn: result.isbn || prev.isbn,
            title: result.title,
            author: result.authors.join(", "),
            publisher: result.publisher,
            publishedYear: parseInt(result.publishedDate.substring(0, 4)) || prev.publishedYear,
            description: result.description,
            coverImage: result.imageLinks?.thumbnail || null,
            metadata: { ...prev.metadata, language: result.language }
        }));
        toast.success("Book details filled from search.");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.isbn || !formData.title || !formData.author) {
            toast.error("ISBN, Title, and Author are required fields.");
            return;
        }

        try {
            await createBook.mutateAsync(formData);
            toast.success("Book added successfully");
            router.push("/books");
        } catch (error: any) {
            console.error("Full error object:", error);
            const message = error?.message || error?.details || (typeof error === 'string' ? error : "Failed to add book");
            toast.error(message);
        }
    };

    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout>
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                        <div className="text-center sm:text-left">
                            <h1 className="text-3xl font-bold tracking-tight">Add New Book</h1>
                            <p className="text-muted-foreground">Register a new title in the library catalog.</p>
                        </div>
                        <Button variant="ghost" onClick={() => router.back()} className="gap-2 w-full sm:w-auto">
                            <X className="h-4 w-4" /> Cancel
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Catalog Information</CardTitle>
                            <CardDescription>Search by title or author, or use ISBN lookup to fill details.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="bookSearch">Search Books</Label>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Input
                                        id="bookSearch"
                                        placeholder="Search by title or author"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleSearch}
                                        disabled={isSearching}
                                        className="w-full sm:w-auto"
                                    >
                                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="border rounded-md divide-y">
                                        {searchResults.map((result) => (
                                            <button
                                                key={result.id}
                                                type="button"
                                                onClick={() => handleSelectResult(result)}
                                                className="w-full text-left px-3 py-2 hover:bg-muted"
                                            >
                                                <div className="font-medium">{result.title}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {result.authors.join(", ") || "Unknown author"}
                                                </div>
                                                {result.isbn && (
                                                    <div className="text-xs text-muted-foreground font-mono">
                                                        {result.isbn}
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="isbn">ISBN</Label>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <Input
                                                id="isbn"
                                                placeholder="9780..."
                                                value={formData.isbn}
                                                onChange={(e) => setFormData(prev => ({ ...prev, isbn: e.target.value }))}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleLookup}
                                                disabled={isLookingUp}
                                                className="w-full sm:w-auto"
                                            >
                                                {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Book Title</Label>
                                        <Input
                                            id="title"
                                            required
                                            value={formData.title}
                                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="author">Author(s)</Label>
                                        <Input
                                            id="author"
                                            required
                                            value={formData.author}
                                            onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="publisher">Publisher</Label>
                                        <Input
                                            id="publisher"
                                            value={formData.publisher}
                                            onChange={(e) => setFormData(prev => ({ ...prev, publisher: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        rows={4}
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Inventory Details</CardTitle>
                                <CardDescription>Manage stock levels and physical location.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="totalCopies">Total Copies</Label>
                                        <Input
                                            id="totalCopies"
                                            type="number"
                                            min={1}
                                            value={formData.totalCopies}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    totalCopies: val,
                                                    availableCopies: val // Default available to total
                                                }));
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="location">Physical Location</Label>
                                        <Input
                                            id="location"
                                            placeholder="e.g. Shelf A-1"
                                            value={formData.location}
                                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="status">Initial Status</Label>
                                        <Input
                                            id="status"
                                            readOnly
                                            value={formData.status}
                                            className="bg-muted"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createBook.isPending}
                                className="gap-2 w-full sm:w-auto"
                            >
                                {createBook.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Book Title
                            </Button>
                        </div>
                    </form>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
