import {
    useQuery,
    useMutation,
    useQueryClient
} from "@tanstack/react-query";
import {
    getDocs,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    Timestamp,
    where
} from "firebase/firestore";
import { patronsRef } from "../firestore";
import { Patron } from "../../types";
import { isFirebaseConfigured } from "../firebase";

const MOCK_PATRONS: Patron[] = [
    {
        id: "p1",
        memberId: "LIB-2024-001",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "555-0101",
        address: { street: "123 Main St", city: "Library Village", zipCode: "12345" },
        joinedAt: Timestamp.now(),
        expiryDate: Timestamp.now(),
        membershipStatus: "active",
        membershipType: "standard",
        finesDue: 0,
        currentCheckouts: 1,
        maxBooksAllowed: 5,
        totalCheckoutsHistory: 12,
        notes: ""
    },
    {
        id: "p2",
        memberId: "LIB-2024-002",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        phone: "555-0102",
        address: { street: "456 Oak Ave", city: "Booktown", zipCode: "67890" },
        joinedAt: Timestamp.now(),
        expiryDate: Timestamp.now(),
        membershipStatus: "active",
        membershipType: "premium",
        finesDue: 5.50,
        currentCheckouts: 3,
        maxBooksAllowed: 10,
        totalCheckoutsHistory: 45,
        notes: ""
    }
];

export function usePatrons(filters?: { search?: string; type?: string; status?: string }) {
    return useQuery({
        queryKey: ["patrons", filters],
        queryFn: async () => {
            if (!isFirebaseConfigured) {
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

            let q = query(patronsRef, orderBy("lastName", "asc"));
            const querySnapshot = await getDocs(q);
            let patrons = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Patron));

            // ... filtering logic ...

            if (filters?.type && filters.type !== "All") {
                patrons = patrons.filter(p => p.membershipType === filters.type);
            }
            if (filters?.status && filters.status !== "All") {
                patrons = patrons.filter(p => p.membershipStatus === filters.status);
            }
            if (filters?.search) {
                const s = filters.search.toLowerCase();
                patrons = patrons.filter(p =>
                    p.firstName.toLowerCase().includes(s) ||
                    p.lastName.toLowerCase().includes(s) ||
                    p.email.toLowerCase().includes(s) ||
                    p.memberId.toLowerCase().includes(s)
                );
            }

            return patrons;
        },
    });
}

export function usePatron(id: string) {
    return useQuery({
        queryKey: ["patrons", id],
        queryFn: async () => {
            if (!id) return null;
            const docRef = doc(patronsRef, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id } as Patron;
            }
            return null;
        },
        enabled: !!id,
    });
}

export function useCreatePatron() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (patron: Omit<Patron, "id" | "joinedAt">) => {
            const now = Timestamp.now();
            return addDoc(patronsRef, {
                ...patron,
                joinedAt: now,
            });
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
            const docRef = doc(patronsRef, id);
            await updateDoc(docRef, data);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["patrons"] });
            queryClient.invalidateQueries({ queryKey: ["patrons", variables.id] });
        },
    });
}
