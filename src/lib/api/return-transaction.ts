import { db } from "../firebase";
import {
    collection,
    doc,
    runTransaction,
    Timestamp,
    query,
    where,
    getDocs,
    limit
} from "firebase/firestore";
import { Book, Patron, Checkout, ActivityLog } from "../../types";
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
    return runTransaction(db, async (transaction) => {
        // 1. Read Checkout record
        const checkoutRef = doc(db, "checkouts", checkoutId);
        const checkoutSnap = await transaction.get(checkoutRef);
        if (!checkoutSnap.exists()) {
            throw new Error("Checkout record not found");
        }
        const checkout = checkoutSnap.data() as Checkout;
        if (checkout.status !== "active" && checkout.status !== "overdue") {
            throw new Error("This book has already been returned or marked as lost");
        }

        // 2. Read Book and Patron records
        const bookRef = doc(db, "books", checkout.bookId);
        const patronRef = doc(db, "patrons", checkout.patronId);
        const [bookSnap, patronSnap] = await Promise.all([
            transaction.get(bookRef),
            transaction.get(patronRef)
        ]);

        if (!bookSnap.exists() || !patronSnap.exists()) {
            throw new Error("Associated book or patron records missing");
        }

        const book = bookSnap.data() as Book;
        const patron = patronSnap.data() as Patron;

        // 3. Logic & Fine Calculation
        const now = Timestamp.now();
        const nowDate = now.toDate();
        const dueDate = checkout.dueDate.toDate();

        let fine = 0;

        // 1. Condition/Damage Fine
        if (condition === "lost") {
            fine = DAMAGE_FINES.lost;
        } else if (condition === "damaged") {
            // Aggregate fines for all selected damages
            fine = damageTypes.reduce((acc, type) => acc + (DAMAGE_FINES[type] || 0), 0);
        }

        // 2. Overdue Fine
        const daysOverdue = differenceInDays(nowDate, dueDate);
        if (daysOverdue > 0) {
            const overdueFine = daysOverdue * 0.5; // $0.50 per day
            fine += Math.min(overdueFine, 50); // Cap overdue fine at $50
        }

        // 4. Update Documents
        // Update Checkout
        transaction.update(checkoutRef, {
            status: condition === "lost" ? "lost" : "returned",
            returnedDate: now,
            returnedTo: staffUserId,
            fineAccrued: fine,
            notes: notes || checkout.notes,
        });

        // Update Book
        const newAvailable = condition === "lost" ? book.availableCopies : book.availableCopies + 1;
        transaction.update(bookRef, {
            availableCopies: newAvailable,
            status: newAvailable > 0 ? (newAvailable < 2 ? "low_stock" : "available") : "unavailable",
            updatedAt: now,
        });

        // Update Patron
        transaction.update(patronRef, {
            currentCheckouts: Math.max(0, patron.currentCheckouts - 1),
            finesDue: patron.finesDue + fine,
        });

        // Create Activity Log
        const logRef = doc(collection(db, "activity_logs"));
        const logData: Omit<ActivityLog, "id"> = {
            type: "return",
            description: `Book "${book.title}" returned by ${patron.firstName} ${patron.lastName}`,
            userId: staffUserId,
            targetId: book.id || checkout.bookId,
            metadata: {
                patronId: checkout.patronId,
                checkoutId: checkoutId,
                fineCharged: fine,
                condition,
                damageTypes
            },
            timestamp: now,
        };
        transaction.set(logRef, logData);

        return { success: true, fineCharged: fine };
    });
}

// Helper to find active checkout by ISBN/BookID
export async function findActiveCheckout(bookId: string) {
    const q = query(
        collection(db, "checkouts"),
        where("bookId", "==", bookId),
        where("status", "in", ["active", "overdue"]),
        limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Checkout;
}
