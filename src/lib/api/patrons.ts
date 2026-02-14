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
    if (patron.firstName !== undefined) data.first_name = patron.firstName;
    if (patron.lastName !== undefined) data.last_name = patron.lastName;
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
    const normalizedEmail = email?.trim().toLowerCase() || "";
    return useQuery({
        queryKey: ["patrons", "email", normalizedEmail],
        queryFn: async () => {
            if (!normalizedEmail) return null;
            assertSupabaseConfigured();

            console.log("Debug: Looking up patron with normalized email:", normalizedEmail);
            const { data, error } = await supabase
                .from('patrons')
                .select('*')
                .ilike('email', normalizedEmail)
                .maybeSingle();

            console.log("Debug: Supabase response - data:", data, "error:", error);

            if (error) {
                console.error(`Supabase error fetching patron by email ${normalizedEmail}:`, error);
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

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                throw new Error("No active session");
            }

            const response = await fetch('/api/patrons', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dbData)
            });

            const responseText = await response.text();
            let data: PatronRow | { error?: string } | null = null;
            if (responseText) {
                try {
                    data = JSON.parse(responseText);
                } catch {
                    data = null;
                }
            }

            const errorMessage =
                data && typeof data === "object" && "error" in data ? data.error : undefined;

            if (!response.ok) {
                console.error("API error creating patron:", {
                    status: response.status,
                    statusText: response.statusText,
                    body: data ?? responseText
                });
                throw new Error(errorMessage || `Failed to create patron (status ${response.status})`);
            }

            if (!data || typeof data !== "object" || !("id" in data)) {
                throw new Error("Failed to create patron (invalid response)");
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
