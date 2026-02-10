"use client";

import { db } from "../lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { Book, Patron, Checkout } from "./types";

const BOOKS = [
    { title: "Clean Code", author: "Robert C. Martin", isbn: "9780132350884", genre: ["Technology"], totalCopies: 5, availableCopies: 5, status: "available", location: "Shelf T-1" },
    { title: "The Hobbit", author: "J.R.R. Tolkien", isbn: "9780547928227", genre: ["Fiction", "Fantasy"], totalCopies: 3, availableCopies: 2, status: "available", location: "Shelf F-4" },
    { title: "JavaScript: The Good Parts", author: "Douglas Crockford", isbn: "9780596517748", genre: ["Technology"], totalCopies: 2, availableCopies: 2, status: "available", location: "Shelf T-2" },
    { title: "Steve Jobs", author: "Walter Isaacson", isbn: "9781451648539", genre: ["Biography"], totalCopies: 4, availableCopies: 4, status: "available", location: "Shelf B-1" },
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald", isbn: "9780743273565", genre: ["Fiction"], totalCopies: 3, availableCopies: 3, status: "available", location: "Shelf F-1" },
];

const PATRONS = [
    { firstName: "John", lastName: "Doe", email: "john@example.com", memberId: "MEM-2024-001", membershipType: "standard", membershipStatus: "active", currentCheckouts: 0, totalCheckoutsHistory: 5, finesDue: 0, maxBooksAllowed: 3 },
    { firstName: "Jane", lastName: "Smith", email: "jane@example.com", memberId: "MEM-2024-002", membershipType: "premium", membershipStatus: "active", currentCheckouts: 1, totalCheckoutsHistory: 12, finesDue: 5.50, maxBooksAllowed: 5 },
    { firstName: "Alice", lastName: "Johnson", email: "alice@student.test", memberId: "MEM-2024-003", membershipType: "student", membershipStatus: "active", currentCheckouts: 0, totalCheckoutsHistory: 2, finesDue: 0, maxBooksAllowed: 2 },
];

export async function seedLibraryData() {
    console.log("Starting seed...");
    try {
        const booksRef = collection(db, "books");
        const patronsRef = collection(db, "patrons");
        const now = Timestamp.now();

        for (const book of BOOKS) {
            await addDoc(booksRef, { ...book, addedAt: now, updatedAt: now, metadata: { language: "en" } });
        }
        console.log("Books seeded!");

        for (const patron of PATRONS) {
            await addDoc(patronsRef, { ...patron, joinedAt: now, address: { street: "123 Main St", city: "Library City", zipCode: "12345" }, phone: "555-0123" });
        }
        console.log("Patrons seeded!");

        return { success: true };
    } catch (error) {
        console.error("Seed failed:", error);
        return { success: false, error };
    }
}
