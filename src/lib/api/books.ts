import {
    useQuery,
    useMutation,
    useQueryClient
} from "@tanstack/react-query";
import {
    getDocs,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    limit,
    Timestamp,
    where
} from "firebase/firestore";
import { booksRef } from "../firestore";
import { Book } from "../../types";
import { isFirebaseConfigured } from "../firebase";

const MOCK_BOOKS: Book[] = [
    {
        id: "1",
        title: "Clean Code",
        author: "Robert C. Martin",
        isbn: "9780132350884",
        genre: ["Technology"],
        totalCopies: 5,
        availableCopies: 5,
        status: "available",
        addedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        location: "Shelf T-1",
        metadata: { language: "en" },
        publisher: "Prentice Hall",
        publishedYear: 2008,
        description: "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees.",
        coverImage: null
    },
    {
        id: "2",
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        isbn: "9780547928227",
        genre: ["Fiction", "Fantasy"],
        totalCopies: 3,
        availableCopies: 2,
        status: "available",
        addedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        location: "Shelf F-4",
        metadata: { language: "en" },
        publisher: "George Allen & Unwin",
        publishedYear: 1937,
        description: "Bilbo Baggins is a hobbit who enjoys a comfortable, unambitious life, rarely traveling any farther than his pantry or cellar.",
        coverImage: null
    }
];

export function useBooks(filters?: { genre?: string; status?: string; search?: string }) {
    return useQuery({
        queryKey: ["books", filters],
        queryFn: async () => {
            if (!isFirebaseConfigured) {
                let books = [...MOCK_BOOKS];
                if (filters?.search) {
                    const s = filters.search.toLowerCase();
                    books = books.filter(b => b.title.toLowerCase().includes(s));
                }
                return books;
            }

            let q = query(booksRef, orderBy("title", "asc"));
            const querySnapshot = await getDocs(q);
            let books = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Book));

            // ... filtering logic ...

            if (filters?.genre && filters.genre !== "All") {
                books = books.filter(b => b.genre.includes(filters.genre!));
            }
            if (filters?.status && filters.status !== "All") {
                books = books.filter(b => b.status === filters.status);
            }
            if (filters?.search) {
                const s = filters.search.toLowerCase();
                books = books.filter(b =>
                    b.title.toLowerCase().includes(s) ||
                    b.author.toLowerCase().includes(s) ||
                    b.isbn.includes(s)
                );
            }

            return books;
        },
    });
}

export function useBook(id: string) {
    return useQuery({
        queryKey: ["books", id],
        queryFn: async () => {
            if (!id) return null;
            const docRef = doc(booksRef, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id } as Book;
            }
            return null;
        },
        enabled: !!id,
    });
}

export function useCreateBook() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (book: Omit<Book, "id" | "addedAt" | "updatedAt">) => {
            const now = Timestamp.now();
            return addDoc(booksRef, {
                ...book,
                addedAt: now,
                updatedAt: now,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["books"] });
        },
    });
}

export function useUpdateBook() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<Book> & { id: string }) => {
            const docRef = doc(booksRef, id);
            await updateDoc(docRef, {
                ...data,
                updatedAt: Timestamp.now(),
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["books"] });
            queryClient.invalidateQueries({ queryKey: ["books", variables.id] });
        },
    });
}

export function useDeleteBook() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const docRef = doc(booksRef, id);
            await deleteDoc(docRef);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["books"] });
        },
    });
}
