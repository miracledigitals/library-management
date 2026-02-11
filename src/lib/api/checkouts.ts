import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Checkout, Book } from "../../types";
import { addDays } from "date-fns";

export function usePatronCheckouts(patronId: string | undefined) {
    return useQuery({
        queryKey: ["checkouts", "patron", patronId],
        queryFn: async () => {
            if (!patronId) return [];
            const q = query(
                collection(db, "checkouts"),
                where("patronId", "==", patronId),
                where("status", "in", ["active", "overdue"])
            );
            const snap = await getDocs(q);
            return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Checkout));
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

            const checkoutRef = doc(db, "checkouts", checkout.id);
            const newDueDate = addDays(checkout.dueDate.toDate(), 14);

            await updateDoc(checkoutRef, {
                dueDate: Timestamp.fromDate(newDueDate),
                renewalsCount: checkout.renewalsCount + 1,
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["checkouts", "patron", variables.patronId] });
            queryClient.invalidateQueries({ queryKey: ["profile"] });
        },
    });
}
