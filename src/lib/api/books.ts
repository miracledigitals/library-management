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
            assertSupabaseConfigured();

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
