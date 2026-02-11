import { supabase, isSupabaseConfigured } from "../supabase";

export async function performCheckout(
    patronId: string,
    bookIds: string[],
    staffUserId: string,
    dueDate: Date
) {
    if (!isSupabaseConfigured) {
        console.log("Mock checkout performed for patron:", patronId, "books:", bookIds);
        return { success: true, count: bookIds.length };
    }

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
