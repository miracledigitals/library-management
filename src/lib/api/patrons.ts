import {
    useQuery,
    useMutation,
    useQueryClient
} from "@tanstack/react-query";
import { supabase, assertSupabaseConfigured } from "../supabase";
import { Patron } from "../../types";

type PatronRow = {
    id: string;
    member_id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    address: Patron["address"];
    joined_at: string;
    expiry_date: string;
    membership_status: Patron["membershipStatus"];
    membership_type: Patron["membershipType"];
    fines_due: string | number | null;
    current_checkouts: number;
    max_books_allowed: number;
    total_checkouts_history: number;
    notes: string;
};

function mapPatronFromDB(data: PatronRow): Patron {
    const finesDue =
        typeof data.fines_due === "number" ? data.fines_due : parseFloat(data.fines_due ?? "0");
    return {
        id: data.id,
        memberId: data.member_id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        phone: data.phone,
        address: data.address,
        joinedAt: data.joined_at,
        expiryDate: data.expiry_date,
        membershipStatus: data.membership_status,
        membershipType: data.membership_type,
        finesDue,
        currentCheckouts: data.current_checkouts,
        maxBooksAllowed: data.max_books_allowed,
        totalCheckoutsHistory: data.total_checkouts_history,
        notes: data.notes
    };
}

function mapPatronToDB(patron: Partial<Patron>) {
    const data: Record<string, unknown> = {};
    if (patron.memberId) data.member_id = patron.memberId;
    if (patron.email) data.email = patron.email;
    if (patron.firstName) data.first_name = patron.firstName;
    if (patron.lastName) data.last_name = patron.lastName;
    if (patron.phone) data.phone = patron.phone;
    if (patron.address) data.address = patron.address;
    if (patron.membershipStatus) data.membership_status = patron.membershipStatus;
    if (patron.membershipType) data.membership_type = patron.membershipType;
    if (patron.maxBooksAllowed !== undefined) data.max_books_allowed = patron.maxBooksAllowed;
    if (patron.expiryDate) data.expiry_date = patron.expiryDate;
    if (patron.notes !== undefined) data.notes = patron.notes;
    return data;
}

export function usePatrons(filters?: { search?: string; type?: string; status?: string }) {
    return useQuery({
        queryKey: ["patrons", filters],
        queryFn: async () => {
            assertSupabaseConfigured();

            let query = supabase
                .from('patrons')
                .select('*')
                .order('last_name', { ascending: true });

            if (filters?.type && filters.type !== "All") {
                query = query.eq('membership_type', filters.type);
            }
            if (filters?.status && filters.status !== "All") {
                query = query.eq('membership_status', filters.status);
            }
            if (filters?.search) {
                const s = filters.search;
                query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,member_id.ilike.%${s}%`);
            }

            const { data, error } = await query;
            if (error) {
                console.error("Supabase error fetching patrons:", error);
                throw error;
            }
            return (data || []).map(mapPatronFromDB);
        },
    });
}

export function usePatron(id: string) {
    return useQuery({
        queryKey: ["patrons", id],
        queryFn: async () => {
            if (!id) return null;
            assertSupabaseConfigured();

            const { data, error } = await supabase
                .from('patrons')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error(`Supabase error fetching patron ${id}:`, error);
                throw error;
            }
            return mapPatronFromDB(data);
        },
        enabled: !!id,
    });
}

export function usePatronByEmail(email?: string | null) {
    return useQuery({
        queryKey: ["patrons", "email", email ?? ""],
        queryFn: async () => {
            if (!email) return null;
            assertSupabaseConfigured();

            const { data, error } = await supabase
                .from('patrons')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (error) {
                console.error(`Supabase error fetching patron by email ${email}:`, error);
                throw error;
            }

            return data ? mapPatronFromDB(data) : null;
        },
        enabled: !!email,
    });
}

export function useCreatePatron() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (patron: Omit<Patron, "id" | "joinedAt">) => {
            assertSupabaseConfigured();
            const dbData = {
                ...mapPatronToDB(patron),
                joined_at: new Date().toISOString(),
                current_checkouts: 0,
                total_checkouts_history: 0,
                fines_due: 0
            };

            const { data, error } = await supabase
                .from('patrons')
                .insert([dbData])
                .select()
                .single();

            if (error) {
                console.error("Supabase error creating patron:", error);
                throw error;
            }
            return mapPatronFromDB(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["patrons"] });
        },
    });
}

export function useUpdatePatron() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<Patron> & { id: string }) => {
            assertSupabaseConfigured();
            const { error } = await supabase
                .from('patrons')
                .update(mapPatronToDB(data))
                .eq('id', id);

            if (error) {
                console.error(`Supabase error updating patron ${id}:`, error);
                throw error;
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["patrons"] });
            queryClient.invalidateQueries({ queryKey: ["patrons", variables.id] });
        },
    });
}
