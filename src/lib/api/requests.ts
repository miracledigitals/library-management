import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getDocs,
    query,
    where,
    addDoc,
    updateDoc,
    doc,
    Timestamp,
    orderBy
} from "firebase/firestore";
import { borrowRequestsRef } from "../firestore";
import { BorrowRequest } from "../../types";
import { db } from "../firebase";
import { performCheckout } from "./checkout-transaction";

export function useBorrowRequests(status?: BorrowRequest['status']) {
    return useQuery({
        queryKey: ["borrow_requests", status],
        queryFn: async () => {
            let q = query(borrowRequestsRef, orderBy("requestDate", "desc"));
            if (status) {
                q = query(borrowRequestsRef, where("status", "==", status), orderBy("requestDate", "desc"));
            }
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BorrowRequest));
        },
    });
}

export function usePatronRequests(patronId: string) {
    return useQuery({
        queryKey: ["borrow_requests", "patron", patronId],
        queryFn: async () => {
            const q = query(borrowRequestsRef, where("patronId", "==", patronId), orderBy("requestDate", "desc"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BorrowRequest));
        },
        enabled: !!patronId,
    });
}

export function useCreateBorrowRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (request: Omit<BorrowRequest, "id" | "requestDate" | "status">) => {
            return addDoc(borrowRequestsRef, {
                ...request,
                requestDate: Timestamp.now(),
                status: "pending",
            } as any);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["borrow_requests"] });
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
            const requestRef = doc(db, "borrow_requests", requestId);

            // If approved, we also need to trigger the checkout transaction
            if (status === "approved") {
                // We need to fetch the request first to get patronId and bookId
                const { getDoc } = await import("firebase/firestore");
                const requestSnap = await getDoc(requestRef);
                if (!requestSnap.exists()) throw new Error("Request not found");
                const requestData = requestSnap.data() as BorrowRequest;

                // Typical due date is 14 days from now
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 14);

                await performCheckout(
                    requestData.patronId,
                    [requestData.bookId],
                    staffUserId,
                    dueDate
                );
            }

            return updateDoc(requestRef, {
                status,
                adminNotes: adminNotes || "",
                processedAt: Timestamp.now(),
                processedBy: staffUserId
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["borrow_requests"] });
            queryClient.invalidateQueries({ queryKey: ["books"] });
            queryClient.invalidateQueries({ queryKey: ["checkouts"] });
        },
    });
}
