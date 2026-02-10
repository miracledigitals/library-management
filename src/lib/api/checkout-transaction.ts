import { db } from "../firebase";
import {
    collection,
    doc,
    runTransaction,
    Timestamp,
    addDoc
} from "firebase/firestore";
import { Book, Patron, Checkout, ActivityLog } from "../../types";

export async function performCheckout(
    patronId: string,
    bookIds: string[],
    staffUserId: string,
    dueDate: Date
) {
    return runTransaction(db, async (transaction) => {
        // 1. Read patron document
        const patronRef = doc(db, "patrons", patronId);
        const patronSnap = await transaction.get(patronRef);
        if (!patronSnap.exists()) {
            throw new Error("Patron not found");
        }
        const patron = patronSnap.data() as Patron;

        // 2. Initial Patron Validations
        if (patron.membershipStatus !== "active") {
            throw new Error("Patron membership is not active");
        }
        if (patron.finesDue > 20) {
            throw new Error(`Checkout blocked: Patron has outstanding fines of $${patron.finesDue.toFixed(2)}`);
        }
        if (patron.currentCheckouts + bookIds.length > patron.maxBooksAllowed) {
            throw new Error(`Checkout blocked: Limit of ${patron.maxBooksAllowed} books exceeded`);
        }

        // 3. Read and Validate all books
        const bookRefs = bookIds.map(id => doc(db, "books", id));
        const bookSnaps = await Promise.all(bookRefs.map(ref => transaction.get(ref)));

        const books: (Book & { id: string })[] = [];
        for (let i = 0; i < bookSnaps.length; i++) {
            const snap = bookSnaps[i];
            if (!snap.exists()) {
                throw new Error(`Book with ID ${bookIds[i]} not found`);
            }
            const book = snap.data() as Book;
            if (book.availableCopies < 1 || book.status === "unavailable") {
                throw new Error(`Book "${book.title}" is currently unavailable`);
            }
            books.push({ ...book, id: snap.id });
        }

        // 4. Update Documents
        const now = Timestamp.now();
        const tsDueDate = Timestamp.fromDate(dueDate);

        // Update Patron counters
        transaction.update(patronRef, {
            currentCheckouts: patron.currentCheckouts + books.length,
            totalCheckoutsHistory: patron.totalCheckoutsHistory + books.length,
        });

        // For each book, update inventory and create checkout doc
        for (const book of books) {
            const bookRef = doc(db, "books", book.id);
            const newAvailable = book.availableCopies - 1;

            transaction.update(bookRef, {
                availableCopies: newAvailable,
                status: newAvailable === 0 ? "unavailable" : (newAvailable < 2 ? "low_stock" : "available"),
                updatedAt: now,
            });

            // Create Checkout record
            const checkoutId = doc(collection(db, "checkouts")).id;
            const checkoutRef = doc(db, "checkouts", checkoutId);

            const checkoutData: Omit<Checkout, "id"> = {
                bookId: book.id,
                patronId: patronId,
                checkoutDate: now,
                dueDate: tsDueDate,
                status: "active",
                renewalsCount: 0,
                maxRenewals: 2,
                fineAccrued: 0,
                checkedOutBy: staffUserId,
                notes: "",
                bookTitle: book.title,
                bookIsbn: book.isbn,
                patronName: `${patron.firstName} ${patron.lastName}`,
                patronMemberId: patron.memberId,
            };

            transaction.set(checkoutRef, checkoutData);

            // Create Activity Log
            const logRef = doc(collection(db, "activity_logs"));
            const logData: Omit<ActivityLog, "id"> = {
                type: "checkout",
                description: `Checked out "${book.title}" to ${patron.firstName} ${patron.lastName}`,
                userId: staffUserId,
                targetId: book.id,
                metadata: {
                    patronId: patronId,
                    checkoutId: checkoutId,
                    isbn: book.isbn
                },
                timestamp: now,
            };
            transaction.set(logRef, logData);
        }

        return { success: true, count: books.length };
    });
}
