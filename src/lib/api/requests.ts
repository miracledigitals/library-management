import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../supabase";
import { BorrowRequest } from "../../types";
import { performCheckout } from "./checkout-transaction";

type BorrowRequestRow = {
    id: string;
    book_id: string;
    patron_id: string;
    requester_name: string;
    book_title: string;
    created_at: string;
    status: BorrowRequest["status"];
    admin_notes: string | null;
};

function mapBorrowRequestFromDB(data: BorrowRequestRow): BorrowRequest {
    return {
        id: data.id,
        bookId: data.book_id,
        patronId: data.patron_id,
        requesterName: data.requester_name,
        bookTitle: data.book_title,
        requestDate: data.created_at,
        status: data.status,
        adminNotes: data.admin_notes ?? undefined
    };
}

export function useBorrowRequests(status?: BorrowRequest['status']) {
    return useQuery({
        queryKey: ["borrow_requests", status],
        queryFn: async () => {
            if (!isSupabaseConfigured) return [];

            let query = supabase
                .from('borrow_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []).map(mapBorrowRequestFromDB);
        },
    });
}

export function usePatronRequests(patronId: string) {
    return useQuery({
        queryKey: ["borrow_requests", "patron", patronId],
        queryFn: async () => {
            if (!patronId || !isSupabaseConfigured) return [];

            const { data, error } = await supabase
                .from('borrow_requests')
                .select('*')
                .eq('patron_id', patronId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapBorrowRequestFromDB);
        },
        enabled: !!patronId,
    });
}

export function useCreateBorrowRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (request: Omit<BorrowRequest, "id" | "requestDate" | "status">) => {
            const { data, error } = await supabase
                .from('borrow_requests')
                .insert([{
                    book_id: request.bookId,
                    patron_id: request.patronId,
                    requester_name: request.requesterName,
                    book_title: request.bookTitle,
                    status: "pending",
                }])
                .select()
                .single();

            if (error) throw error;
            return mapBorrowRequestFromDB(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["borrow_requests"] });
        },
    });
}

export function useProcessRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            requestId,
            status,
            adminNotes,
            staffUserId
        }: {
            requestId: string,
            status: 'approved' | 'denied',
            adminNotes?: string,
            staffUserId: string
        }) => {
            // 1. If approved, we also need to trigger the checkout transaction
            if (status === "approved") {
                const { data: requestData, error: fetchError } = await supabase
                    .from('borrow_requests')
                    .select('*')
                    .eq('id', requestId)
                    .single();

                if (fetchError || !requestData) throw new Error("Request not found");

                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 14);

                await performCheckout(
                    requestData.patron_id,
                    [requestData.book_id],
                    staffUserId,
                    dueDate
                );
            }

            const { error } = await supabase
                .from('borrow_requests')
                .update({
                    status,
                    admin_notes: adminNotes || "",
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["borrow_requests"] });
            queryClient.invalidateQueries({ queryKey: ["books"] });
            queryClient.invalidateQueries({ queryKey: ["checkouts"] });
        },
    });
}
