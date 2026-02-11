import { supabase, assertSupabaseConfigured } from "../supabase";

export async function performCheckout(
    patronId: string,
    bookIds: string[],
    staffUserId: string,
    dueDate: Date
) {
    assertSupabaseConfigured();

    const { data, error } = await supabase.rpc('perform_checkout', {
        p_patron_id: patronId,
        p_book_ids: bookIds,
        p_staff_user_id: staffUserId,
        p_due_date: dueDate.toISOString()
    });

    if (error) throw error;
    if (data && !data.success) throw new Error(data.error);

    return { success: true, count: data.count };
}
