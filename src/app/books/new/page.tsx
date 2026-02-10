"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCreateBook } from "@/lib/api/books";
import { lookupISBN } from "@/lib/google-books";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Loader2, Save, X } from "lucide-react";
import { BookStatus } from "@/types";

export default function NewBookPage() {
    const router = useRouter();
    const createBook = useCreateBook();
    const [isLookingUp, setIsLookingUp] = useState(false);

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
        } catch (error) {
            toast.error("Failed to lookup ISBN");
        } finally {
            setIsLookingUp(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createBook.mutateAsync(formData);
            toast.success("Book added successfully");
            router.push("/books");
        } catch (error) {
            toast.error("Failed to add book");
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Add New Book</h1>
                        <p className="text-muted-foreground">Register a new title in the library catalog.</p>
                    </div>
                    <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                        <X className="h-4 w-4" /> Cancel
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Catalog Information</CardTitle>
                            <CardDescription>Use ISBN lookup to automatically fill book details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4 items-end">
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="isbn">ISBN-10 or ISBN-13</Label>
                                    <Input
                                        id="isbn"
                                        placeholder="9780123456789"
                                        value={formData.isbn}
                                        onChange={(e) => setFormData(prev => ({ ...prev, isbn: e.target.value }))}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleLookup}
                                    disabled={isLookingUp}
                                    className="gap-2"
                                >
                                    {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    Lookup
                                </Button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title</Label>
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
                                <div className="space-y-2">
                                    <Label htmlFor="year">Published Year</Label>
                                    <Input
                                        id="year"
                                        type="number"
                                        value={formData.publishedYear}
                                        onChange={(e) => setFormData(prev => ({ ...prev, publishedYear: parseInt(e.target.value) }))}
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
                            <CardTitle>Inventory & Location</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="totalCopies">Total Copies</Label>
                                <Input
                                    id="totalCopies"
                                    type="number"
                                    min="1"
                                    value={formData.totalCopies}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setFormData(prev => ({ ...prev, totalCopies: val, availableCopies: val }));
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">Physical Location</Label>
                                <Input
                                    id="location"
                                    placeholder="Shelf A-1"
                                    value={formData.location}
                                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="language">Language</Label>
                                <Input
                                    id="language"
                                    value={formData.metadata.language}
                                    onChange={(e) => setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, language: e.target.value } }))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" disabled={createBook.isPending} className="gap-2">
                            {createBook.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            <Save className="h-4 w-4" />
                            Save Book
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
