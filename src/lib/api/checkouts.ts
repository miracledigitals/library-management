import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../supabase";
import { Checkout } from "../../types";
import { addDays } from "date-fns";

function mapCheckoutFromDB(data: any): Checkout {
    return {
        id: data.id,
        bookId: data.book_id,
        patronId: data.patron_id,
        checkoutDate: data.checkout_date,
        dueDate: data.due_date,
        returnedDate: data.returned_date,
        status: data.status,
        renewalsCount: data.renewals_count,
        maxRenewals: data.max_renewals,
        fineAccrued: parseFloat(data.fine_accrued),
        checkedOutBy: data.checked_out_by,
        returnedTo: data.returned_to,
        notes: data.notes,
        bookTitle: data.book_title,
        bookIsbn: data.book_isbn,
        patronName: data.patron_name,
        patronMemberId: data.patron_member_id
    };
}

export function usePatronCheckouts(patronId: string | undefined) {
    return useQuery({
        queryKey: ["checkouts", "patron", patronId],
        queryFn: async () => {
            if (!patronId || !isSupabaseConfigured) return [];

            const { data, error } = await supabase
                .from('checkouts')
                .select('*')
                .eq('patron_id', patronId)
                .in('status', ['active', 'overdue']);

            if (error) throw error;
            return (data || []).map(mapCheckoutFromDB);
        },
        enabled: !!patronId,
    });
}

export function useRenewLoan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (checkout: Checkout) => {
            if (checkout.renewalsCount >= checkout.maxRenewals) {
                throw new Error("Maximum renewals reached for this item");
            }

            const newDueDate = addDays(new Date(checkout.dueDate), 14);

            const { error } = await supabase
                .from('checkouts')
                .update({
                    due_date: newDueDate.toISOString(),
                    renewals_count: checkout.renewalsCount + 1,
                })
                .eq('id', checkout.id);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["checkouts", "patron", variables.patronId] });
            queryClient.invalidateQueries({ queryKey: ["profile"] });
        },
    });
}
