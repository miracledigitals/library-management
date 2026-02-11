import {
    useQuery,
    useMutation,
    useQueryClient
} from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../supabase";
import { Book } from "../../types";

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
        location: "Shelf T-1",
        metadata: { language: "en" },
        publisher: "Prentice Hall",
        publishedYear: 2008,
        description: "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees.",
        coverImage: null,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
        location: "Shelf F-4",
        metadata: { language: "en" },
        publisher: "George Allen & Unwin",
        publishedYear: 1937,
        description: "Bilbo Baggins is a hobbit who enjoys a comfortable, unambitious life, rarely traveling any farther than his pantry or cellar.",
        coverImage: null,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

export function useBooks(filters?: { genre?: string; status?: string; search?: string }) {
    return useQuery({
        queryKey: ["books", filters],
        queryFn: async () => {
            if (!isSupabaseConfigured) {
                let books = [...MOCK_BOOKS];
                if (filters?.search) {
                    const s = filters.search.toLowerCase();
                    books = books.filter(b => b.title.toLowerCase().includes(s));
                }
                return books;
            }

            let query = supabase
                .from('books')
                .select('*')
                .order('title', { ascending: true });

            if (filters?.genre && filters.genre !== "All") {
                query = query.contains('genre', [filters.genre]);
            }
            if (filters?.status && filters.status !== "All") {
                query = query.eq('status', filters.status);
            }
            if (filters?.search) {
                const s = filters.search;
                query = query.or(`title.ilike.%${s}%,author.ilike.%${s}%,isbn.ilike.%${s}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as Book[];
        },
    });
}

export function useBook(id: string) {
    return useQuery({
        queryKey: ["books", id],
        queryFn: async () => {
            if (!id) return null;
            if (!isSupabaseConfigured) {
                return MOCK_BOOKS.find(b => b.id === id) || null;
            }

            const { data, error } = await supabase
                .from('books')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Book;
        },
        enabled: !!id,
    });
}

export function useCreateBook() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (book: Omit<Book, "id" | "addedAt" | "updatedAt">) => {
            const { data, error } = await supabase
                .from('books')
                .insert([{
                    ...book,
                    added_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
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
            const { error } = await supabase
                .from('books')
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (error) throw error;
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
            const { error } = await supabase
                .from('books')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["books"] });
        },
    });
}
