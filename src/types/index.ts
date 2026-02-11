import { Timestamp } from "firebase/firestore";

export type MembershipType = 'standard' | 'premium' | 'student';
export type MembershipStatus = 'active' | 'suspended' | 'expired';
export type BookStatus = 'available' | 'low_stock' | 'unavailable';
export type CheckoutStatus = 'active' | 'returned' | 'overdue' | 'lost';
export type ActivityType = 'checkout' | 'return' | 'renew' | 'fine_paid' | 'patron_added' | 'book_added' | 'borrow_request' | 'request_approved' | 'request_denied';

export interface Book {
    id?: string;
    isbn: string;                    // UNIQUE - primary identifier
    title: string;
    author: string;
    publisher: string;
    publishedYear: number;
    genre: string[];
    description: string;
    coverImage: string | null;       // Firebase Storage URL
    totalCopies: number;             // total owned
    availableCopies: number;         // currently on shelf
    location: string;                // physical shelf location
    status: BookStatus;
    addedAt: Timestamp;
    updatedAt: Timestamp;
    metadata: {
        pages?: number;
        language: string;
        edition?: string;
    };
}

export interface Patron {
    id?: string;
    memberId: string;                // auto-generated (e.g., "MEM-2024-001")
    email: string;                   // linked to Firebase Auth
    firstName: string;
    lastName: string;
    phone: string;
    address: {
        street: string;
        city: string;
        zipCode: string;
    };
    membershipType: MembershipType;
    membershipStatus: MembershipStatus;
    joinedAt: Timestamp;
    expiryDate: Timestamp;
    maxBooksAllowed: number;         // 3 for standard, 5 for premium, 2 for student
    currentCheckouts: number;        // DENORMALIZED counter
    totalCheckoutsHistory: number;
    finesDue: number;                // dollars
    notes: string;
}

export interface Checkout {
    id: string;
    bookId: string;                  // reference to books collection
    patronId: string;                // reference to patrons collection
    checkoutDate: Timestamp;
    dueDate: Timestamp;              // 14 days from checkout
    returnedDate?: Timestamp;
    status: CheckoutStatus;
    renewalsCount: number;           // max 2 renewals
    maxRenewals: number;
    fineAccrued: number;             // $0.50 per day overdue
    checkedOutBy: string;            // staff user ID
    returnedTo?: string;             // staff user ID
    notes: string;
    // DENORMALIZED fields for display performance:
    bookTitle: string;
    bookIsbn: string;
    patronName: string;
    patronMemberId: string;
}

export interface ActivityLog {
    id: string;
    type: ActivityType;
    description: string;
    userId: string;                  // who performed the action
    targetId: string;                // affected book or patron ID
    metadata: Record<string, any>;
    timestamp: Timestamp;
}

export interface BorrowRequest {
    id: string;
    bookId: string;
    patronId: string;
    requesterName: string;
    bookTitle: string;
    requestDate: Timestamp;
    status: 'pending' | 'approved' | 'denied';
    adminNotes?: string;
}

export interface UserProfile {
    uid: string;
    email: string;
    role: 'admin' | 'librarian' | 'patron';
    displayName?: string;
    currentCheckouts?: number;
    finesDue?: number;
}
