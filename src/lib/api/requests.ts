import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, assertSupabaseConfigured } from "../supabase";
import { BorrowRequest, ReturnRequest } from "../../types";
import { performCheckout } from "./checkout-transaction";
import { processReturn } from "./return-transaction";

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

type ReturnRequestRow = {
    id: string;
    checkout_id: string;
    book_id: string;
    patron_id: string;
    requester_name: string;
    book_title: string;
    created_at: string;
    status: ReturnRequest["status"];
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

function mapReturnRequestFromDB(data: ReturnRequestRow): ReturnRequest {
    return {
        id: data.id,
        checkoutId: data.checkout_id,
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
            assertSupabaseConfigured();

            let query = supabase
                .from('borrow_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;
            if (error) {
                console.error("Supabase error fetching borrow requests:", error);
                throw error;
            }
            return (data || []).map(mapBorrowRequestFromDB);
        },
    });
}

export function useReturnRequests(status?: ReturnRequest['status']) {
    return useQuery({
        queryKey: ["return_requests", status],
        queryFn: async () => {
            assertSupabaseConfigured();

            let query = supabase
                .from('return_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;
            if (error) {
                console.error("Supabase error fetching return requests:", error);
                throw error;
            }
            return (data || []).map(mapReturnRequestFromDB);
        },
    });
}

export function usePatronRequests(patronId: string) {
    return useQuery({
        queryKey: ["borrow_requests", "patron", patronId],
        queryFn: async () => {
            if (!patronId) return [];
            assertSupabaseConfigured();

            const { data, error } = await supabase
                .from('borrow_requests')
                .select('*')
                .eq('patron_id', patronId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error(`Supabase error fetching borrow requests for patron ${patronId}:`, error);
                throw error;
            }
            return (data || []).map(mapBorrowRequestFromDB);
        },
        enabled: !!patronId,
    });
}

export function usePatronReturnRequests(patronId: string) {
    return useQuery({
        queryKey: ["return_requests", "patron", patronId],
        queryFn: async () => {
            if (!patronId) return [];
            assertSupabaseConfigured();

            const { data, error } = await supabase
                .from('return_requests')
                .select('*')
                .eq('patron_id', patronId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error(`Supabase error fetching return requests for patron ${patronId}:`, error);
                throw error;
            }
            return (data || []).map(mapReturnRequestFromDB);
        },
        enabled: !!patronId,
    });
}

export function useCreateBorrowRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (request: Omit<BorrowRequest, "id" | "requestDate" | "status">) => {
            assertSupabaseConfigured();
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

            if (error) {
                console.error("Supabase error creating borrow request:", error);
                throw error;
            }
            return mapBorrowRequestFromDB(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["borrow_requests"] });
        },
    });
}

export function useCreateReturnRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (request: Omit<ReturnRequest, "id" | "requestDate" | "status">) => {
            assertSupabaseConfigured();
            const { data, error } = await supabase
                .from('return_requests')
                .insert([{
                    checkout_id: request.checkoutId,
                    book_id: request.bookId,
                    patron_id: request.patronId,
                    requester_name: request.requesterName,
                    book_title: request.bookTitle,
                    status: "pending",
                }])
                .select()
                .single();

            if (error) {
                console.error("Supabase error creating return request:", error);
                throw error;
            }
            return mapReturnRequestFromDB(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["return_requests"] });
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
            assertSupabaseConfigured();
            // 1. If approved, we also need to trigger the checkout transaction
            if (status === "approved") {
                const { data: requestData, error: fetchError } = await supabase
                    .from('borrow_requests')
                    .select('*')
                    .eq('id', requestId)
                    .single();

                if (fetchError || !requestData) {
                    console.error("Error fetching request for processing:", fetchError);
                    throw new Error("Request not found");
                }

                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 14);

                try {
                    await performCheckout(
                        requestData.patron_id,
                        [requestData.book_id],
                        staffUserId,
                        dueDate
                    );
                } catch (checkoutError: unknown) {
                    console.error("Checkout transaction failed during approval:", checkoutError);
                    throw checkoutError;
                }
            }

            const { error } = await supabase
                .from('borrow_requests')
                .update({
                    status,
                    admin_notes: adminNotes || "",
                })
                .eq('id', requestId);

            if (error) {
                console.error(`Supabase error processing request ${requestId}:`, error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["borrow_requests"] });
            queryClient.invalidateQueries({ queryKey: ["books"] });
            queryClient.invalidateQueries({ queryKey: ["checkouts"] });
        },
    });
}

export function useProcessReturnRequest() {
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
            assertSupabaseConfigured();
            if (status === "approved") {
                const { data: requestData, error: fetchError } = await supabase
                    .from('return_requests')
                    .select('*')
                    .eq('id', requestId)
                    .single();

                if (fetchError || !requestData) {
                    console.error("Error fetching return request for processing:", fetchError);
                    throw new Error("Return request not found");
                }

                try {
                    await processReturn(
                        requestData.checkout_id,
                        staffUserId,
                        "good",
                        [],
                        adminNotes || ""
                    );
                } catch (returnError: unknown) {
                    console.error("Return transaction failed during approval:", returnError);
                    throw returnError;
                }
            }

            const { error } = await supabase
                .from('return_requests')
                .update({
                    status,
                    admin_notes: adminNotes || "",
                })
                .eq('id', requestId);

            if (error) {
                console.error(`Supabase error processing return request ${requestId}:`, error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["return_requests"] });
            queryClient.invalidateQueries({ queryKey: ["checkouts"] });
            queryClient.invalidateQueries({ queryKey: ["books"] });
        },
    });
}
