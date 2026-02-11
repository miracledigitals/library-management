import {
    useQuery,
    useMutation,
    useQueryClient
} from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../supabase";
import { Patron } from "../../types";

const MOCK_PATRONS: Patron[] = [
    {
        id: "p1",
        memberId: "LIB-2024-001",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "555-0101",
        address: { street: "123 Main St", city: "Library Village", zipCode: "12345" },
        joinedAt: new Date().toISOString(),
        expiryDate: new Date().toISOString(),
        membershipStatus: "active",
        membershipType: "standard",
        finesDue: 0,
        currentCheckouts: 1,
        maxBooksAllowed: 5,
        totalCheckoutsHistory: 12,
        notes: ""
    }
];

function mapPatronFromDB(data: any): Patron {
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
        finesDue: parseFloat(data.fines_due),
        currentCheckouts: data.current_checkouts,
        maxBooksAllowed: data.max_books_allowed,
        totalCheckoutsHistory: data.total_checkouts_history,
        notes: data.notes
    };
}

function mapPatronToDB(patron: Partial<Patron>) {
    const data: any = {};
    if (patron.memberId) data.member_id = patron.memberId;
    if (patron.email) data.email = patron.email;
    if (patron.firstName) data.first_name = patron.firstName;
    if (patron.lastName) data.last_name = patron.lastName;
    if (patron.phone) data.phone = patron.phone;
    if (patron.address) data.address = patron.address;
    if (patron.membershipStatus) data.membership_status = patron.membershipStatus;
    if (patron.membershipType) data.membership_type = patron.membershipType;
    if (patron.notes !== undefined) data.notes = patron.notes;
    // ... add more as needed
    return data;
}

export function usePatrons(filters?: { search?: string; type?: string; status?: string }) {
    return useQuery({
        queryKey: ["patrons", filters],
        queryFn: async () => {
            if (!isSupabaseConfigured) {
                let patrons = [...MOCK_PATRONS];
                if (filters?.search) {
                    const s = filters.search.toLowerCase();
                    patrons = patrons.filter(p =>
                        p.firstName.toLowerCase().includes(s) ||
                        p.lastName.toLowerCase().includes(s)
                    );
                }
                return patrons;
            }

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
            if (error) throw error;
            return (data || []).map(mapPatronFromDB);
        },
    });
}

export function usePatron(id: string) {
    return useQuery({
        queryKey: ["patrons", id],
        queryFn: async () => {
            if (!id) return null;
            if (!isSupabaseConfigured) {
                return MOCK_PATRONS.find(p => p.id === id) || null;
            }

            const { data, error } = await supabase
                .from('patrons')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return mapPatronFromDB(data);
        },
        enabled: !!id,
    });
}

export function useCreatePatron() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (patron: Omit<Patron, "id" | "joinedAt">) => {
            const dbData = {
                ...mapPatronToDB(patron as any),
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

            if (error) throw error;
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
            const { error } = await supabase
                .from('patrons')
                .update(mapPatronToDB(data))
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["patrons"] });
            queryClient.invalidateQueries({ queryKey: ["patrons", variables.id] });
        },
    });
}
