import {
    useQuery,
    useMutation,
    useQueryClient
} from "@tanstack/react-query";
import { supabase, assertSupabaseConfigured } from "../supabase";
import { Book } from "../../types";

export function useBooks(filters?: { genre?: string; status?: string; search?: string }) {
    return useQuery({
        queryKey: ["books", filters],
        queryFn: async () => {
            assertSupabaseConfigured();

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
            if (error) {
                console.error("Supabase error fetching books:", error);
                throw error;
            }
            
            return (data || []).map(book => ({
                id: book.id,
                isbn: book.isbn,
                title: book.title,
                author: book.author,
                publisher: book.publisher,
                publishedYear: book.published_year,
                genre: book.genre,
                description: book.description,
                coverImage: book.cover_image,
                totalCopies: book.total_copies,
                availableCopies: book.available_copies,
                location: book.location,
                status: book.status,
                addedAt: book.added_at,
                updatedAt: book.updated_at,
                metadata: book.metadata,
            })) as Book[];
        },
    });
}

export function useBook(id: string) {
    return useQuery({
        queryKey: ["books", id],
        queryFn: async () => {
            if (!id) return null;
            assertSupabaseConfigured();

            const { data, error } = await supabase
                .from('books')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error("Supabase error fetching book:", error);
                throw error;
            }
            
            return {
                id: data.id,
                isbn: data.isbn,
                title: data.title,
                author: data.author,
                publisher: data.publisher,
                publishedYear: data.published_year,
                genre: data.genre,
                description: data.description,
                coverImage: data.cover_image,
                totalCopies: data.total_copies,
                availableCopies: data.available_copies,
                location: data.location,
                status: data.status,
                addedAt: data.added_at,
                updatedAt: data.updated_at,
                metadata: data.metadata,
            } as Book;
        },
        enabled: !!id,
    });
}

export function useCreateBook() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (book: Omit<Book, "id" | "addedAt" | "updatedAt">) => {
            assertSupabaseConfigured();
            
            // Log the payload for debugging
            console.log("Creating book with payload:", book);

            const { data, error } = await supabase
                .from('books')
                .insert([{
                    isbn: book.isbn,
                    title: book.title,
                    author: book.author,
                    publisher: book.publisher,
                    published_year: book.publishedYear,
                    genre: book.genre,
                    description: book.description,
                    cover_image: book.coverImage,
                    total_copies: book.totalCopies,
                    available_copies: book.availableCopies,
                    location: book.location,
                    status: book.status,
                    metadata: book.metadata,
                }])
                .select();

            if (error) {
                console.error("Supabase error creating book:", error);
                throw {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                };
            }
            
            if (!data || data.length === 0) {
                throw new Error("Book was created but could not be retrieved from the database. This might be due to Row Level Security (RLS) policies.");
            }
            
            return data[0];
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
            assertSupabaseConfigured();
            
            const updatePayload: any = {
                updated_at: new Date().toISOString(),
            };

            if (data.isbn !== undefined) updatePayload.isbn = data.isbn;
            if (data.title !== undefined) updatePayload.title = data.title;
            if (data.author !== undefined) updatePayload.author = data.author;
            if (data.publisher !== undefined) updatePayload.publisher = data.publisher;
            if (data.publishedYear !== undefined) updatePayload.published_year = data.publishedYear;
            if (data.genre !== undefined) updatePayload.genre = data.genre;
            if (data.description !== undefined) updatePayload.description = data.description;
            if (data.coverImage !== undefined) updatePayload.cover_image = data.coverImage;
            if (data.totalCopies !== undefined) updatePayload.total_copies = data.totalCopies;
            if (data.availableCopies !== undefined) updatePayload.available_copies = data.availableCopies;
            if (data.location !== undefined) updatePayload.location = data.location;
            if (data.status !== undefined) updatePayload.status = data.status;
            if (data.metadata !== undefined) updatePayload.metadata = data.metadata;

            const { error } = await supabase
                .from('books')
                .update(updatePayload)
                .eq('id', id);

            if (error) {
                console.error("Supabase error updating book:", error);
                throw error;
            }
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
