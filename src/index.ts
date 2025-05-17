/**
 * URL Content Saver MCP Server
 *
 * This server provides a tool for AI agents to download content from any URL
 * and save it directly to a specified file path.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create an MCP server instance
 */
const server = new McpServer({
    name: "URL Content Saver",
    version: "1.0.0",
});

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
 * Add the saveUrlContent tool to the server
 */
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

/**
 * Start the server with stdio transport
 */
async function startServer() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error(
            "URL Content Saver MCP Server started with stdio transport"
        );
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

// Start the server
startServer();
