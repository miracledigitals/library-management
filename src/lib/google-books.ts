export interface GoogleBookInfo {
    title: string;
    authors: string[];
    publisher: string;
    publishedDate: string;
    description: string;
    imageLinks?: {
        thumbnail: string;
    };
    pageCount?: number;
    language: string;
}

export interface GoogleBookSearchResult extends GoogleBookInfo {
    id: string;
    isbn?: string;
}

export async function lookupISBN(isbn: string): Promise<GoogleBookInfo | null> {
    try {
        const formattedIsbn = isbn.replace(/-/g, "");
        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=isbn:${formattedIsbn}`
        );
        const data = await response.json();

        if (data.totalItems > 0) {
            const volumeInfo = data.items[0].volumeInfo;
            return {
                title: volumeInfo.title || "",
                authors: volumeInfo.authors || [],
                publisher: volumeInfo.publisher || "",
                publishedDate: volumeInfo.publishedDate || "",
                description: volumeInfo.description || "",
                imageLinks: volumeInfo.imageLinks,
                pageCount: volumeInfo.pageCount,
                language: volumeInfo.language || "en",
            };
        }
        return null;
    } catch (error) {
        console.error("Error looking up ISBN:", error);
        return null;
    }
}

function getPreferredIsbn(identifiers?: { type: string; identifier: string }[]) {
    if (!identifiers?.length) return undefined;
    const isbn13 = identifiers.find((item) => item.type === "ISBN_13");
    if (isbn13) return isbn13.identifier;
    const isbn10 = identifiers.find((item) => item.type === "ISBN_10");
    return isbn10?.identifier;
}

export async function searchBooks(query: string): Promise<GoogleBookSearchResult[]> {
    try {
        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`
        );
        const data = await response.json();
        if (!data.items?.length) return [];
        return data.items.map((item: { id: string; volumeInfo: Record<string, unknown> }) => {
            const volumeInfo = item.volumeInfo as Record<string, unknown> & {
                title?: string;
                authors?: string[];
                publisher?: string;
                publishedDate?: string;
                description?: string;
                imageLinks?: { thumbnail?: string };
                pageCount?: number;
                language?: string;
                industryIdentifiers?: { type: string; identifier: string }[];
            };
            return {
                id: item.id,
                title: volumeInfo.title || "",
                authors: volumeInfo.authors || [],
                publisher: volumeInfo.publisher || "",
                publishedDate: volumeInfo.publishedDate || "",
                description: volumeInfo.description || "",
                imageLinks: volumeInfo.imageLinks?.thumbnail
                    ? { thumbnail: volumeInfo.imageLinks.thumbnail }
                    : undefined,
                pageCount: volumeInfo.pageCount,
                language: volumeInfo.language || "en",
                isbn: getPreferredIsbn(volumeInfo.industryIdentifiers),
            };
        });
    } catch (error) {
        console.error("Error searching books:", error);
        return [];
    }
}
