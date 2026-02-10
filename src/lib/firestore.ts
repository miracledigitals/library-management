import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    addDoc,
    updateDoc,
    deleteDoc,
    CollectionReference,
    DocumentData
} from "firebase/firestore";
import { db } from "./firebase";
import { Book, Patron, Checkout, ActivityLog, BorrowRequest } from "../types";

// Collection helper
const createCollection = <T = DocumentData>(path: string) => {
    return collection(db, path) as CollectionReference<T>;
};

// Collection references
export const booksRef = createCollection<Book>("books");
export const patronsRef = createCollection<Patron>("patrons");
export const checkoutsRef = createCollection<Checkout>("checkouts");
export const activityLogsRef = createCollection<ActivityLog>("activity_logs");
export const borrowRequestsRef = createCollection<BorrowRequest>("borrow_requests");

// Generic CRUD helpers
export const getDocument = async <T>(collectionPath: string, id: string) => {
    const docRef = doc(db, collectionPath, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
};

export const createActivityLog = async (log: Omit<ActivityLog, "id" | "timestamp">) => {
    return addDoc(activityLogsRef, {
        ...log,
        timestamp: Timestamp.now(),
    } as any);
};
