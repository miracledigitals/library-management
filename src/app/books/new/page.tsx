"use client";

import { useState, useRef } from "react";
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
import { Search, Loader2, Save, X, Upload, FileText, CheckCircle2, AlertCircle, Download, Database, Trash2, Check, AlertTriangle, Play } from "lucide-react";
import { BookStatus } from "@/types";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface CSVBook {
    isbn: string;
    title: string;
    author: string;
    publisher: string;
    publishedYear: number;
    genre: string[];
    description: string;
    totalCopies: number;
    availableCopies: number;
    location: string;
    status: BookStatus;
    coverImage: null | string;
    metadata: {
        language: string;
    };
    validationError?: string;
    uploadStatus: "pending" | "uploading" | "success" | "failed";
    uploadError?: string;
}

export default function NewBookPage() {
    const router = useRouter();
    const createBook = useCreateBook();
    
    // Single Book Form State
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

    // Bulk Upload CSV State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [parsedBooks, setParsedBooks] = useState<CSVBook[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({
        total: 0,
        current: 0,
        success: 0,
        failed: 0
    });
    const [dragActive, setDragActive] = useState(false);

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
        
        if (!formData.title || !formData.author) {
            toast.error("Title and Author are required fields.");
            return;
        }

        const generatedIsbn = formData.isbn.trim() || `AUTO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        try {
            await createBook.mutateAsync({
                ...formData,
                isbn: generatedIsbn
            });
            toast.success("Book added successfully");
            router.push("/books");
        } catch (error: unknown) {
            const errorData = error as { message?: string; details?: string };
            console.error("Full error object:", error);
            const message = errorData?.message || errorData?.details || (typeof error === 'string' ? error : "Failed to add book");
            toast.error(message);
        }
    };

    // Robust CSV Parser (RFC 4180 compliant)
    const parseCSV = (text: string): string[][] => {
        const lines: string[][] = [];
        let row: string[] = [""];
        let insideQuote = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"') {
                if (insideQuote && nextChar === '"') {
                    row[row.length - 1] += '"';
                    i++;
                } else {
                    insideQuote = !insideQuote;
                }
            } else if (char === ',' && !insideQuote) {
                row.push("");
            } else if ((char === '\r' || char === '\n') && !insideQuote) {
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
                lines.push(row);
                row = [""];
            } else {
                row[row.length - 1] += char;
            }
        }
        if (row.length > 1 || row[0] !== "") {
            lines.push(row);
        }
        return lines;
    };

    // Download CSV template
    const downloadCSVTemplate = () => {
        const csvContent = 
            "isbn,title,author,publisher,published_year,genre,description,total_copies,location\n" +
            '9780743273565,"The Great Gatsby","F. Scott Fitzgerald","Scribner",2004,"Classic, Fiction","A portrait of the Jazz Age in all its decadence and excess.",3,"Shelf A-12"\n' +
            '9780451524935,"1984","George Orwell","Signet Classics",1950,"Dystopian, Sci-Fi","A chilling depiction of a totalitarian society under Big Brother.",5,"Shelf B-04"\n' +
            '9780061120084,"To Kill a Mockingbird","Harper Lee","Harper Perennial",2006,"Fiction, Historical","A gripping and compassionate story of race relations in the American South.",4,"Shelf A-03"';
        
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "library_books_template.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Template CSV downloaded!");
    };

    const processFile = async (file: File) => {
        if (!file) return;
        if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
            toast.error("Please upload a valid CSV file");
            return;
        }

        setCsvFile(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
                toast.error("Could not read file content");
                return;
            }

            try {
                const parsedRows = parseCSV(text);
                if (parsedRows.length <= 1) {
                    toast.error("The CSV file is empty or only contains headers");
                    return;
                }

                const header = parsedRows[0].map(h => h.trim().toLowerCase());
                
                // Find column indices
                const isbnIdx = header.findIndex(h => h === "isbn");
                const titleIdx = header.findIndex(h => h === "title");
                const authorIdx = header.findIndex(h => h === "author" || h === "authors");
                const publisherIdx = header.findIndex(h => h === "publisher");
                const yearIdx = header.findIndex(h => h.includes("year") || h === "published_year" || h === "publishedyear");
                const genreIdx = header.findIndex(h => h === "genre" || h === "genres");
                const descIdx = header.findIndex(h => h === "description" || h === "desc");
                const copiesIdx = header.findIndex(h => h.includes("copies") || h === "total_copies" || h === "totalcopies");
                const locIdx = header.findIndex(h => h === "location" || h === "shelf" || h.includes("shelf"));

                // Require at least Title and Author columns
                if (titleIdx === -1 || authorIdx === -1) {
                    toast.error("CSV columns must include: 'title' and 'author'");
                    return;
                }

                const books: CSVBook[] = [];
                
                for (let i = 1; i < parsedRows.length; i++) {
                    const row = parsedRows[i];
                    if (row.length === 1 && row[0] === "") {
                        continue; // skip empty lines
                    }

                    const rawIsbn = isbnIdx !== -1 && row[isbnIdx] ? row[isbnIdx].trim() : "";
                    const rawTitle = titleIdx !== -1 && row[titleIdx] ? row[titleIdx].trim() : "";
                    const rawAuthor = authorIdx !== -1 && row[authorIdx] ? row[authorIdx].trim() : "";
                    const rawPublisher = publisherIdx !== -1 && row[publisherIdx] ? row[publisherIdx].trim() : "";
                    const rawYear = yearIdx !== -1 && row[yearIdx] ? row[yearIdx].trim() : "";
                    const rawGenre = genreIdx !== -1 && row[genreIdx] ? row[genreIdx].trim() : "";
                    const rawDesc = descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : "";
                    const rawCopies = copiesIdx !== -1 && row[copiesIdx] ? row[copiesIdx].trim() : "";
                    const rawLoc = locIdx !== -1 && row[locIdx] ? row[locIdx].trim() : "";

                    // Parsing & Normalization
                    const isbn = rawIsbn || `AUTO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}-${i}`;

                    let publishedYear = new Date().getFullYear();
                    if (rawYear) {
                        const parsed = parseInt(rawYear);
                        if (!isNaN(parsed)) publishedYear = parsed;
                    }

                    let genre: string[] = [];
                    if (rawGenre) {
                        // Split genres by comma or semicolon
                        genre = rawGenre.split(/[;,]/).map(g => g.trim()).filter(g => g.length > 0);
                    }

                    let totalCopies = 1;
                    if (rawCopies) {
                        const parsed = parseInt(rawCopies);
                        if (!isNaN(parsed) && parsed > 0) totalCopies = parsed;
                    }

                    let validationError = "";
                    if (!rawTitle) {
                        validationError = "Missing Title";
                    } else if (!rawAuthor) {
                        validationError = "Missing Author";
                    }

                    books.push({
                        isbn,
                        title: rawTitle,
                        author: rawAuthor,
                        publisher: rawPublisher,
                        publishedYear,
                        genre,
                        description: rawDesc,
                        totalCopies,
                        availableCopies: totalCopies,
                        location: rawLoc,
                        status: "available",
                        coverImage: null,
                        metadata: { language: "en" },
                        validationError,
                        uploadStatus: "pending"
                    });
                }

                setParsedBooks(books);
                toast.success(`Successfully parsed ${books.length} books.`);
            } catch (error) {
                console.error("Error processing CSV:", error);
                toast.error("Failed to parse CSV. Ensure it has a valid format.");
            }
        };
        reader.readAsText(file);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const clearCSV = () => {
        setCsvFile(null);
        setParsedBooks([]);
        setIsUploading(false);
        setUploadProgress({ total: 0, current: 0, success: 0, failed: 0 });
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        toast.info("CSV uploads cleared.");
    };

    const handleBulkUpload = async () => {
        const booksToUpload = parsedBooks.filter(b => !b.validationError && b.uploadStatus !== "success");
        if (booksToUpload.length === 0) {
            toast.error("No valid books ready to upload.");
            return;
        }

        setIsUploading(true);
        setUploadProgress({
            total: parsedBooks.length,
            current: parsedBooks.filter(b => b.uploadStatus === "success" || b.validationError).length,
            success: parsedBooks.filter(b => b.uploadStatus === "success").length,
            failed: parsedBooks.filter(b => b.validationError).length
        });

        let successCount = parsedBooks.filter(b => b.uploadStatus === "success").length;
        let failedCount = parsedBooks.filter(b => b.validationError).length;

        for (let idx = 0; idx < parsedBooks.length; idx++) {
            const book = parsedBooks[idx];
            
            // Skip invalid or already successful entries
            if (book.validationError) continue;
            if (book.uploadStatus === "success") continue;

            setParsedBooks(prev => prev.map((b, i) => i === idx ? { ...b, uploadStatus: "uploading" } : b));

            try {
                const payload = {
                    isbn: book.isbn,
                    title: book.title,
                    author: book.author,
                    publisher: book.publisher,
                    publishedYear: book.publishedYear,
                    genre: book.genre,
                    description: book.description,
                    totalCopies: book.totalCopies,
                    availableCopies: book.availableCopies,
                    location: book.location,
                    status: book.status,
                    coverImage: book.coverImage,
                    metadata: book.metadata
                };
                await createBook.mutateAsync(payload);
                
                successCount++;
                setParsedBooks(prev => prev.map((b, i) => i === idx ? { ...b, uploadStatus: "success" } : b));
            } catch (error: any) {
                failedCount++;
                const errMsg = error?.message || error?.details || "Failed to add book";
                setParsedBooks(prev => prev.map((b, i) => i === idx ? { ...b, uploadStatus: "failed", uploadError: errMsg } : b));
            }

            setUploadProgress(prev => ({
                ...prev,
                current: successCount + failedCount,
                success: successCount,
                failed: failedCount
            }));
        }

        setIsUploading(false);
        toast.success(`Import complete! ${successCount} successfully imported, ${failedCount} failed.`);
    };

    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout>
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Page Header */}
                    <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                        <div className="text-center sm:text-left">
                            <h1 className="text-3xl font-bold tracking-tight">Add New Book</h1>
                            <p className="text-muted-foreground">Register single or multiple titles in the library catalog.</p>
                        </div>
                        <Button variant="ghost" onClick={() => router.back()} className="gap-2 w-full sm:w-auto">
                            <X className="h-4 w-4" /> Cancel
                        </Button>
                    </div>

                    {/* Navigation Tabs */}
                    <Tabs defaultValue="single" className="w-full space-y-6">
                        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                            <TabsTrigger value="single" className="gap-2">
                                <Database className="h-4 w-4" /> Single Book Form
                            </TabsTrigger>
                            <TabsTrigger value="bulk" className="gap-2">
                                <Upload className="h-4 w-4" /> Bulk CSV Upload
                            </TabsTrigger>
                        </TabsList>

                        {/* Tab 1: Single Book Form */}
                        <TabsContent value="single">
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
                                                <div className="border rounded-md divide-y max-h-60 overflow-y-auto bg-card shadow-sm">
                                                    {searchResults.map((result) => (
                                                        <button
                                                            key={result.id}
                                                            type="button"
                                                            onClick={() => handleSelectResult(result)}
                                                            className="w-full text-left px-3 py-2 hover:bg-muted focus:outline-none transition-colors"
                                                        >
                                                            <div className="font-medium text-sm">{result.title}</div>
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
                                                            availableCopies: val
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
                                                    className="bg-muted text-muted-foreground"
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
                        </TabsContent>

                        {/* Tab 2: Bulk CSV Upload */}
                        <TabsContent value="bulk" className="space-y-6">
                            <Card className="border-2 border-dashed border-muted transition-all duration-300">
                                <CardHeader className="text-center">
                                    <CardTitle>CSV Import Center</CardTitle>
                                    <CardDescription>
                                        Quickly add multiple titles by uploading a CSV. Fill out the library template below to get started.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Action Box: Template Download & Guidance */}
                                    <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-muted/40 rounded-lg border gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 text-primary rounded">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="font-semibold text-sm">Need the CSV Template?</h4>
                                                <p className="text-xs text-muted-foreground">Download the correct column format to avoid parsing errors.</p>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={downloadCSVTemplate}
                                            className="w-full md:w-auto gap-2"
                                        >
                                            <Download className="h-4 w-4" /> Download Sample CSV
                                        </Button>
                                    </div>

                                    {/* File Drag and Drop Zone */}
                                    {!csvFile ? (
                                        <div
                                            onDragEnter={handleDrag}
                                            onDragOver={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
                                                dragActive 
                                                    ? "border-primary bg-primary/5 scale-[1.01]" 
                                                    : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
                                            }`}
                                        >
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".csv"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                            <div className="p-4 bg-background border rounded-full shadow-sm mb-4 text-muted-foreground group-hover:text-primary transition-colors">
                                                <Upload className="h-8 w-8 animate-pulse text-primary" />
                                            </div>
                                            <h3 className="font-semibold text-base mb-1">Drag and drop your CSV file here</h3>
                                            <p className="text-xs text-muted-foreground mb-4">or click to browse files from your computer</p>
                                            <Badge variant="secondary" className="text-[10px]">Supports .csv extension</Badge>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-muted/20 border rounded-lg gap-4">
                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                                <div className="text-left overflow-hidden">
                                                    <h4 className="font-semibold text-sm truncate max-w-[250px] sm:max-w-md">{csvFile.name}</h4>
                                                    <p className="text-xs text-muted-foreground font-mono">{(csvFile.size / 1024).toFixed(2)} KB</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={clearCSV} 
                                                    className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                                    disabled={isUploading}
                                                >
                                                    <Trash2 className="h-4 w-4" /> Remove CSV
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Parsed Books Preview and Control Panel */}
                            {parsedBooks.length > 0 && (
                                <Card className="border shadow-md">
                                    <CardHeader>
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div>
                                                <CardTitle>Catalog Preview</CardTitle>
                                                <CardDescription>Review raw parsed rows and verification checks before uploading.</CardDescription>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={clearCSV}
                                                    disabled={isUploading}
                                                    className="gap-2"
                                                >
                                                    <X className="h-4 w-4" /> Cancel
                                                </Button>
                                                <Button 
                                                    variant="default" 
                                                    size="sm" 
                                                    onClick={handleBulkUpload}
                                                    disabled={isUploading || parsedBooks.filter(b => !b.validationError && b.uploadStatus !== "success").length === 0}
                                                    className="gap-2 shadow-sm font-semibold"
                                                >
                                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                                    Import Valid Books ({parsedBooks.filter(b => !b.validationError && b.uploadStatus !== "success").length})
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Status Metric Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="p-3 bg-muted/40 border rounded-lg text-center">
                                                <div className="text-2xl font-bold text-foreground">{parsedBooks.length}</div>
                                                <div className="text-xs text-muted-foreground">Total Parsed</div>
                                            </div>
                                            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-center">
                                                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                    {parsedBooks.filter(b => b.uploadStatus === "success").length}
                                                </div>
                                                <div className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">Successfully Added</div>
                                            </div>
                                            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-center">
                                                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                                    {parsedBooks.filter(b => !b.validationError && b.uploadStatus === "pending").length}
                                                </div>
                                                <div className="text-xs text-amber-600 dark:text-amber-500 font-medium">Pending Import</div>
                                            </div>
                                            <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-center">
                                                <div className="text-2xl font-bold text-destructive">
                                                    {parsedBooks.filter(b => b.validationError || b.uploadStatus === "failed").length}
                                                </div>
                                                <div className="text-xs text-destructive font-medium">Errors / Failed</div>
                                            </div>
                                        </div>

                                        {/* Live Progress Bar */}
                                        {(isUploading || uploadProgress.current > 0) && (
                                            <div className="space-y-2 border p-4 rounded-lg bg-muted/10">
                                                <div className="flex items-center justify-between text-xs font-semibold">
                                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                                        {isUploading ? (
                                                            <>
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                                                Importing catalog items...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                                Import Process Finished
                                                            </>
                                                        )}
                                                    </span>
                                                    <span className="font-mono text-primary">
                                                        {uploadProgress.current} / {uploadProgress.total} ({Math.round((uploadProgress.current / uploadProgress.total) * 100)}%)
                                                    </span>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                                                    <div 
                                                        className="bg-primary h-2.5 rounded-full transition-all duration-300"
                                                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Preview Table */}
                                        <div className="border rounded-md max-h-96 overflow-y-auto shadow-sm">
                                            <Table>
                                                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                                                    <TableRow>
                                                        <TableHead className="w-32">Status</TableHead>
                                                        <TableHead className="w-40">ISBN</TableHead>
                                                        <TableHead>Title</TableHead>
                                                        <TableHead>Author</TableHead>
                                                        <TableHead className="w-32 text-center">Copies</TableHead>
                                                        <TableHead className="w-32">Location</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {parsedBooks.map((book, idx) => (
                                                        <TableRow key={idx} className={book.validationError ? "bg-destructive/5 hover:bg-destructive/10" : ""}>
                                                            <TableCell className="py-2">
                                                                {/* Status Column Badge rendering */}
                                                                {book.uploadStatus === "uploading" && (
                                                                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 gap-1 border-blue-500/20">
                                                                        <Loader2 className="h-3 w-3 animate-spin" /> Uploading
                                                                    </Badge>
                                                                )}
                                                                {book.uploadStatus === "success" && (
                                                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 border-emerald-500/20">
                                                                        <CheckCircle2 className="h-3 w-3" /> Success
                                                                    </Badge>
                                                                )}
                                                                {book.uploadStatus === "failed" && (
                                                                    <div className="space-y-1">
                                                                        <Badge variant="destructive" className="gap-1">
                                                                            <AlertCircle className="h-3 w-3" /> Failed
                                                                        </Badge>
                                                                        <p className="text-[10px] text-destructive leading-tight break-words max-w-[120px]">{book.uploadError}</p>
                                                                    </div>
                                                                )}
                                                                {book.uploadStatus === "pending" && book.validationError && (
                                                                    <Badge variant="destructive" className="gap-1 bg-amber-500 text-white hover:bg-amber-600">
                                                                        <AlertTriangle className="h-3 w-3" /> {book.validationError}
                                                                    </Badge>
                                                                )}
                                                                {book.uploadStatus === "pending" && !book.validationError && (
                                                                    <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                                                                        Ready
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs py-2">{book.isbn}</TableCell>
                                                            <TableCell className="font-medium py-2 max-w-[200px] truncate" title={book.title}>
                                                                {book.title}
                                                            </TableCell>
                                                            <TableCell className="py-2 truncate max-w-[150px]" title={book.author}>
                                                                {book.author}
                                                            </TableCell>
                                                            <TableCell className="text-center font-mono py-2">{book.totalCopies}</TableCell>
                                                            <TableCell className="py-2 text-muted-foreground text-xs">{book.location || "—"}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
