import { Readable } from 'stream';

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
  try {
    // Validate URL
    new URL(url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    if (!response.body) {
      throw new Error('Response body is null');
    }
    
    // Convert the ReadableStream to a Node.js Readable stream
    const stream = Readable.fromWeb(response.body as any);
    
    // Extract headers into a simple object
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Get content type and length
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLengthStr = response.headers.get('content-length');
    const contentLength = contentLengthStr ? parseInt(contentLengthStr, 10) : null;
    
    return {
      stream,
      metadata: {
        contentType,
        contentLength,
        url,
        statusCode: response.status,
        headers
      }
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      throw new Error(`Invalid URL: ${url}`);
    }
    throw error;
  }
}

/**
 * Fetches content from a URL and returns it as a string
 * @param url The URL to fetch
 * @returns A promise that resolves to the content as a string and metadata
 * @throws Error if the URL is invalid or the fetch fails
 */
export async function fetchUrlAsString(url: string): Promise<{ content: string; metadata: UrlFetchMetadata }> {
  const { stream, metadata } = await fetchUrlAsStream(url);
  
  // Convert stream to string
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  
  const content = Buffer.concat(chunks).toString('utf-8');
  return { content, metadata };
}
