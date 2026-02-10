import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

admin.initializeApp();
const db = admin.firestore();

/**
 * Scheduled function to check for overdue items every midnight.
 */
export const processOverdueCheck = functions.pubsub
    .schedule("every 24 hours")
    .onRun(async (context) => {
        const now = Timestamp.now();
        const overdueQuery = db
            .collection("checkouts")
            .where("status", "==", "active")
            .where("dueDate", "<", now);

        const snapshot = await overdueQuery.get();
        const batch = db.batch();

        snapshot.forEach((doc) => {
            batch.update(doc.ref, {
                status: "overdue",
                updatedAt: now
            });

            // Potential integration: Send email via Firebase Extension or SendGrid
        });

        await batch.commit();
        console.log(`Updated ${snapshot.size} checkouts to overdue status.`);
        return null;
    });

/**
 * Trigger to log a dashboard event when a new book is added.
 */
export const onBookAdded = functions.firestore
    .document("books/{bookId}")
    .onCreate(async (snap, context) => {
        const book = snap.data();
        await db.collection("activity_logs").add({
            type: "info",
            description: `New book added: "${book.title}"`,
            timestamp: Timestamp.now(),
            targetId: context.params.bookId,
        });
    });

/**
 * Trigger to notify librarian of low stock.
 */
export const onLowStockAlert = functions.firestore
    .document("books/{bookId}")
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();

        if (newData.availableCopies < 2 && oldData.availableCopies >= 2) {
            await db.collection("activity_logs").add({
                type: "fine", // Using Alert icon
                description: `Low stock alert: "${newData.title}" only has ${newData.availableCopies} copies left.`,
                timestamp: Timestamp.now(),
                targetId: context.params.bookId,
            });
        }
    });
