export type MembershipType = 'standard' | 'premium' | 'student';
export type MembershipStatus = 'active' | 'suspended' | 'expired';
export type BookStatus = 'available' | 'low_stock' | 'unavailable';
export type CheckoutStatus = 'active' | 'returned' | 'overdue' | 'lost';
export type ActivityType =
    | 'checkout'
    | 'return'
    | 'renew'
    | 'fine_paid'
    | 'patron_added'
    | 'book_added'
    | 'borrow_request'
    | 'request_approved'
    | 'request_denied'
    | 'return_request'
    | 'return_approved'
    | 'return_denied'
    | 'due_soon';

export interface Book {
    id?: string;
    isbn: string;                    // UNIQUE - primary identifier
    title: string;
    author: string;
    publisher: string;
    publishedYear: number;
    genre: string[];
    description: string;
    coverImage: string | null;
    totalCopies: number;             // total owned
    availableCopies: number;         // currently on shelf
    location: string;                // physical shelf location
    status: BookStatus;
    addedAt: string;
    updatedAt: string;
    metadata: {
        pages?: number;
        language: string;
        edition?: string;
    };
}

export interface Patron {
    id?: string;
    memberId: string;                // auto-generated (e.g., "MEM-2024-001")
    email: string;
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
    joinedAt: string;
    expiryDate: string;
    maxBooksAllowed: number;
    currentCheckouts: number;
    totalCheckoutsHistory: number;
    finesDue: number;                // dollars
    notes: string;
}

export interface Checkout {
    id: string;
    bookId: string;
    patronId: string;
    checkoutDate: string;
    dueDate: string;
    returnedDate?: string;
    status: CheckoutStatus;
    renewalsCount: number;
    maxRenewals: number;
    fineAccrued: number;
    checkedOutBy: string;
    returnedTo?: string;
    notes: string;
    bookTitle: string;
    bookIsbn: string;
    patronName: string;
    patronMemberId: string;
}

export interface ActivityLog {
    id: string;
    type: ActivityType;
    description: string;
    userId: string;
    targetId: string;
    metadata: Record<string, unknown>;
    timestamp: string;
}

export interface BorrowRequest {
    id: string;
    bookId: string;
    patronId: string;
    requesterName: string;
    bookTitle: string;
    requestDate: string;
    status: 'pending' | 'approved' | 'denied';
    adminNotes?: string;
}

export interface ReturnRequest {
    id: string;
    checkoutId: string;
    bookId: string;
    patronId: string;
    requesterName: string;
    bookTitle: string;
    requestDate: string;
    status: 'pending' | 'approved' | 'denied';
    adminNotes?: string;
}

export interface UserProfile {
    id: string;
    email: string;
    role: 'admin' | 'librarian' | 'patron';
    displayName?: string;
    currentCheckouts?: number;
    finesDue?: number;
    language?: string;
}
