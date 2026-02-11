"use client";

import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBook, useDeleteBook } from "@/lib/api/books";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Edit,
    Trash2,
    Book as BookIcon,
    MapPin,
    Calendar,
    Hash,
    Languages
} from "lucide-react";
import Link from "next/link";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function BookDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: book, isLoading } = useBook(id as string);
    const deleteBook = useDeleteBook();

    const handleDelete = async () => {
        try {
            await deleteBook.mutateAsync(id as string);
            toast.success("Book deleted successfully");
            router.push("/books");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to delete book";
            toast.error(message);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            </DashboardLayout>
        );
    }

    if (!book) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-muted-foreground">Book not found</h2>
                    <Button variant="link" onClick={() => router.push("/books")}>Back to list</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => router.push("/books")} className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to List
                    </Button>
                    <div className="flex gap-2">
                        <Link href={`/books/${id}/edit`}>
                            <Button variant="outline" className="gap-2">
                                <Edit className="h-4 w-4" /> Edit
                            </Button>
                        </Link>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="gap-2">
                                    <Trash2 className="h-4 w-4" /> Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the book
                                        &quot;{book.title}&quot; from the library database.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                                        Delete Book
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="md:col-span-1">
                        <CardContent className="pt-6">
                            <div className="aspect-[2/3] relative rounded-lg bg-muted flex items-center justify-center overflow-hidden border">
                                {book.coverImage ? (
                                    <img
                                        src={book.coverImage}
                                        alt={book.title}
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <BookIcon className="h-16 w-16 text-muted-foreground/50" />
                                )}
                            </div>
                            <div className="mt-4 space-y-2">
                                <Badge className="w-full justify-center py-1 text-sm" variant={
                                    book.status === "available" ? "default" :
                                        book.status === "low_stock" ? "secondary" : "destructive"
                                }>
                                    {book.status.replace("_", " ").toUpperCase()}
                                </Badge>
                                <div className="text-center text-sm font-medium">
                                    {book.availableCopies} available of {book.totalCopies} total
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="md:col-span-2 space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight">{book.title}</h1>
                            <p className="text-xl text-muted-foreground">{book.author}</p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex items-center gap-3 text-sm">
                                <Hash className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold w-24">ISBN</span>
                                <span className="font-mono">{book.isbn}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold w-24">Location</span>
                                <span>{book.location || "Not assigned"}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold w-24">Published</span>
                                <span>{book.publisher}, {book.publishedYear}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Languages className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold w-24">Language</span>
                                <span className="capitalize">{book.metadata.language}</span>
                            </div>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                    {book.description || "No description available for this book."}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground italic">
                                    Checkout history functionality will be implemented in the next phase.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
