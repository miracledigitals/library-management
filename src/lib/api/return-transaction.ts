import { supabase, isSupabaseConfigured } from "../supabase";
import { Book, Patron, Checkout } from "../../types";
import { differenceInDays } from "date-fns";

export const DAMAGE_FINES: Record<string, number> = {
    "water": 15.00,
    "torn": 5.00,
    "spine": 10.00,
    "writing": 3.00,
    "cover": 8.00,
    "lost": 50.00
};

export async function processReturn(
    checkoutId: string,
    staffUserId: string,
    condition: "good" | "worn" | "damaged" | "lost" = "good",
    damageTypes: string[] = [],
    notes: string = ""
) {
    if (!isSupabaseConfigured) {
        console.log("Mock return processed for:", checkoutId);
        return { success: true, fineCharged: 0 };
    }

    // 1. Fetch current checkout to calculate overdue fine (client-side calculation for ease, or could be in RPC)
    const { data: checkout, error: fetchError } = await supabase
        .from('checkouts')
        .select('*')
        .eq('id', checkoutId)
        .single();

    if (fetchError || !checkout) throw new Error("Checkout record not found");

    // 2. Logic & Fine Calculation (matching the original logic)
    const now = new Date();
    const dueDate = new Date(checkout.due_date);

    let fine = 0;

    // Condition/Damage Fine
    if (condition === "lost") {
        fine = DAMAGE_FINES.lost;
    } else if (condition === "damaged") {
        fine = damageTypes.reduce((acc, type) => acc + (DAMAGE_FINES[type] || 0), 0);
    }

    // Overdue Fine
    const daysOverdue = differenceInDays(now, dueDate);
    if (daysOverdue > 0) {
        const overdueFine = daysOverdue * 0.5; // $0.50 per day
        fine += Math.min(overdueFine, 50); // Cap overdue fine at $50
    }

    // 3. Call the atomic RPC
    const { data, error } = await supabase.rpc('process_return', {
        p_checkout_id: checkoutId,
        p_staff_user_id: staffUserId,
        p_condition: condition,
        p_damage_types: damageTypes,
        p_notes: notes,
        p_fine_amount: fine
    });

    if (error) throw error;
    if (data && !data.success) throw new Error(data.error);

    return { success: true, fineCharged: fine };
}

// Helper to find active checkout by ISBN/BookID
export async function findActiveCheckout(bookId: string) {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
        .from('checkouts')
        .select('*')
        .eq('book_id', bookId)
        .in('status', ['active', 'overdue'])
        .limit(1)
        .maybeSingle();

    if (error) return null;
    if (!data) return null;

    return {
        id: data.id,
        bookId: data.book_id,
        patronId: data.patron_id,
        checkoutDate: data.checkout_date,
        dueDate: data.due_date,
        status: data.status,
        bookTitle: data.book_title,
        bookIsbn: data.book_isbn,
        patronName: data.patron_name,
        patronMemberId: data.patron_member_id
    } as Checkout;
}
