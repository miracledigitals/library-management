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
