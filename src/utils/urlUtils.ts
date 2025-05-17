import { Readable } from "stream";

/**
 * Interface for URL fetch response metadata
 */
export interface UrlFetchMetadata {
    contentType: string;
    contentLength: number | null;
    url: string;
    statusCode: number;
    headers: Record<string, string>;
}

/**
 * Interface for URL fetch response
 */
export interface UrlFetchResponse {
    stream: Readable;
    metadata: UrlFetchMetadata;
}

/**
 * Fetches content from a URL and returns it as a readable stream
 * @param url The URL to fetch
 * @returns A promise that resolves to a UrlFetchResponse
 * @throws Error if the URL is invalid or the fetch fails
 */
export async function fetchUrlAsStream(url: string): Promise<UrlFetchResponse> {
    console.log(`Fetching URL as stream: ${url}`);

    try {
        // Validate URL
        console.log(`Validating URL: ${url}`);
        try {
            new URL(url);
            console.log(`URL is valid: ${url}`);
        } catch (urlError) {
            console.error(`Invalid URL format: ${url}`);
            throw new Error(`Invalid URL format: ${url}`);
        }

        // Fetch the URL
        console.log(`Sending fetch request to: ${url}`);
        let response;
        try {
            response = await fetch(url);
            console.log(
                `Received response from ${url}: status ${response.status}`
            );
        } catch (fetchError) {
            console.error(
                `Fetch request failed: ${
                    fetchError instanceof Error
                        ? fetchError.message
                        : String(fetchError)
                }`
            );
            throw new Error(
                `Failed to fetch URL: ${
                    fetchError instanceof Error
                        ? fetchError.message
                        : String(fetchError)
                }`
            );
        }

        // Check if the response is OK
        if (!response.ok) {
            console.error(
                `HTTP error: ${response.status} ${response.statusText}`
            );
            throw new Error(
                `Failed to fetch URL: ${response.status} ${response.statusText}`
            );
        }

        // Check if the response body exists
        if (!response.body) {
            console.error("Response body is null");
            throw new Error("Response body is null");
        }

        // Convert the ReadableStream to a Node.js Readable stream
        console.log(`Converting response body to Node.js Readable stream`);
        let stream;
        try {
            stream = Readable.fromWeb(response.body as any);
            console.log(`Successfully converted response body to stream`);
        } catch (streamError) {
            console.error(
                `Failed to convert response body to stream: ${
                    streamError instanceof Error
                        ? streamError.message
                        : String(streamError)
                }`
            );
            throw new Error(
                `Failed to convert response body to stream: ${
                    streamError instanceof Error
                        ? streamError.message
                        : String(streamError)
                }`
            );
        }

        // Extract headers into a simple object
        console.log(`Extracting response headers`);
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });

        // Get content type and length
        const contentType =
            response.headers.get("content-type") || "application/octet-stream";
        const contentLengthStr = response.headers.get("content-length");
        const contentLength = contentLengthStr
            ? parseInt(contentLengthStr, 10)
            : null;

        console.log(
            `Content type: ${contentType}, Content length: ${
                contentLength || "unknown"
            }`
        );

        return {
            stream,
            metadata: {
                contentType,
                contentLength,
                url,
                statusCode: response.status,
                headers,
            },
        };
    } catch (error) {
        console.error(
            `Error in fetchUrlAsStream: ${
                error instanceof Error ? error.message : String(error)
            }`
        );

        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error(`Unknown error fetching URL: ${String(error)}`);
        }
    }
}

/**
 * Fetches content from a URL and returns it as a string
 * @param url The URL to fetch
 * @returns A promise that resolves to the content as a string and metadata
 * @throws Error if the URL is invalid or the fetch fails
 */
export async function fetchUrlAsString(
    url: string
): Promise<{ content: string; metadata: UrlFetchMetadata }> {
    const { stream, metadata } = await fetchUrlAsStream(url);

    // Convert stream to string
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }

    const content = Buffer.concat(chunks).toString("utf-8");
    return { content, metadata };
}
