/**
 * HTTP Server for URL Content Saver MCP Server
 *
 * This file implements an Express server with Streamable HTTP transport
 * for the URL Content Saver MCP Server.
 */

import express from "express";
import { randomUUID } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import fetch from "node-fetch";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validates a URL string
 * @param url The URL to validate
 * @returns True if the URL is valid, false otherwise
 */
function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Ensures the directory for a file path exists
 * @param filePath The file path
 */
async function ensureDirectoryExists(filePath: string): Promise<void> {
    const directory = path.dirname(filePath);
    await fs.ensureDir(directory);
}

/**
 * Fetches content from a URL and saves it to a file
 * @param url The URL to fetch content from
 * @param filePath The file path to save the content to
 * @returns A result object with success status and detailed information
 */
async function saveUrlContent(
    url: string,
    filePath: string
): Promise<{
    success: boolean;
    filePath?: string;
    fileSize?: number;
    contentType?: string;
    url?: string;
    statusCode?: number;
    error?: string;
}> {
    try {
        // Validate URL
        if (!isValidUrl(url)) {
            return {
                success: false,
                error: `Invalid URL: ${url}`,
            };
        }

        // Ensure the URL has a protocol
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return {
                success: false,
                error: "URL must include http:// or https:// protocol",
            };
        }

        // Validate file path
        if (!filePath) {
            return {
                success: false,
                error: "File path is required",
            };
        }

        // Convert to absolute path if it's not already
        const absoluteFilePath = path.isAbsolute(filePath)
            ? filePath
            : path.resolve(process.cwd(), filePath);

        // Ensure the directory exists
        await ensureDirectoryExists(absoluteFilePath);

        // Fetch the content
        const response = await fetch(url);

        if (!response.ok) {
            return {
                success: false,
                error: `Failed to fetch URL: ${url}. Status: ${response.status} ${response.statusText}`,
                url,
                statusCode: response.status,
            };
        }

        // Get the content as a buffer
        const content = await response.buffer();

        // Get content type from headers
        const contentType =
            response.headers.get("content-type") || "application/octet-stream";

        // Write the content to the file
        await fs.writeFile(absoluteFilePath, content);

        // Get the file size
        const stats = await fs.stat(absoluteFilePath);
        const fileSize = stats.size;

        return {
            success: true,
            filePath: absoluteFilePath,
            fileSize,
            contentType,
            url,
            statusCode: response.status,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: `Error saving URL content: ${errorMessage}`,
        };
    }
}

/**
 * Creates a new MCP server instance
 * @returns A configured MCP server
 */
function createServer(): McpServer {
    const server = new McpServer({
        name: "URL Content Saver",
        version: "1.0.0",
    });

    // Add the saveUrlContent tool
    server.tool(
        "saveUrlContent",
        {
            url: z
                .string()
                .describe(
                    "The complete URL to fetch content from (must include http:// or https://)"
                ),
            filePath: z
                .string()
                .describe(
                    "The complete target file path where the content should be saved"
                ),
        },
        async ({ url, filePath }) => {
            const result = await saveUrlContent(url, filePath);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    },
                ],
                isError: !result.success,
            };
        }
    );

    return server;
}

/**
 * Start the HTTP server
 * @param port The port to listen on
 */
export async function startHttpServer(port: number = 3000): Promise<void> {
    const app = express();
    app.use(express.json());

    // Map to store transports by session ID
    const transports: { [sessionId: string]: StreamableHTTPServerTransport } =
        {};

    // Handle POST requests for client-to-server communication
    app.post("/mcp", async (req, res) => {
        // Check for existing session ID
        const sessionId = req.headers["mcp-session-id"] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports[sessionId]) {
            // Reuse existing transport
            transport = transports[sessionId];
        } else if (!sessionId && isInitializeRequest(req.body)) {
            // New initialization request
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: (sessionId) => {
                    // Store the transport by session ID
                    transports[sessionId] = transport;
                },
            });

            // Clean up transport when closed
            transport.onclose = () => {
                if (transport.sessionId) {
                    delete transports[transport.sessionId];
                }
            };

            // Create and connect to the MCP server
            const server = createServer();
            await server.connect(transport);
        } else {
            // Invalid request
            res.status(400).json({
                jsonrpc: "2.0",
                error: {
                    code: -32000,
                    message: "Bad Request: No valid session ID provided",
                },
                id: null,
            });
            return;
        }

        // Handle the request
        await transport.handleRequest(req, res, req.body);
    });

    // Reusable handler for GET and DELETE requests
    const handleSessionRequest = async (
        req: express.Request,
        res: express.Response
    ) => {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;
        if (!sessionId || !transports[sessionId]) {
            res.status(400).send("Invalid or missing session ID");
            return;
        }

        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
    };

    // Handle GET requests for server-to-client notifications via SSE
    app.get("/mcp", handleSessionRequest);

    // Handle DELETE requests for session termination
    app.delete("/mcp", handleSessionRequest);

    // Start the server
    app.listen(port, () => {
        console.log(`URL Content Saver MCP Server listening on port ${port}`);
    });
}

// If this file is run directly, start the HTTP server
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    startHttpServer(port);
}
