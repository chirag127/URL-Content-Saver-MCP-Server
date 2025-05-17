import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { randomUUID } from "crypto";
import { createUrlContentSaverServer } from "./server/urlContentSaverServer.js";
import os from "os";
import { getBaseDirectory } from "./utils/fileUtils.js";

// Log startup information
console.log("Starting URL Content Saver MCP Server...");
console.log(`Current working directory: ${process.cwd()}`);
console.log(`Home directory: ${os.homedir()}`);
console.log(`Base directory for file operations: ${getBaseDirectory()}`);
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);

// Log VS Code specific environment variables if they exist
if (process.env.VSCODE_CWD) {
    console.log(`VS Code CWD: ${process.env.VSCODE_CWD}`);
}
if (process.env.VSCODE_EXTENSION_PATH) {
    console.log(`VS Code Extension Path: ${process.env.VSCODE_EXTENSION_PATH}`);
}

// Log all environment variables for debugging (uncomment if needed)
// console.log('Environment variables:', process.env);

// Determine transport type from command line arguments
const useHttp = process.argv.includes("--http");
const port = parseInt(process.env.PORT || "3000", 10);

console.log(`Transport type: ${useHttp ? "HTTP" : "stdio"}`);
if (useHttp) {
    console.log(`HTTP port: ${port}`);
}

async function startStdioServer() {
    console.log(
        "Starting URL Content Saver MCP Server with stdio transport..."
    );

    try {
        const server = createUrlContentSaverServer();
        console.log("Server created successfully");

        console.log("Creating StdioServerTransport");
        const transport = new StdioServerTransport();

        console.log("Connecting server to transport");
        await server.connect(transport);

        console.log(
            "URL Content Saver MCP Server running with stdio transport"
        );

        // Set up error handling for the transport
        transport.onclose = () => {
            console.log("Transport closed");
        };

        // Handle process termination
        process.on("SIGINT", () => {
            console.log("Received SIGINT signal, shutting down");
            server.close();
            process.exit(0);
        });

        process.on("SIGTERM", () => {
            console.log("Received SIGTERM signal, shutting down");
            server.close();
            process.exit(0);
        });

        // Handle uncaught exceptions
        process.on("uncaughtException", (error) => {
            console.error("Uncaught exception:", error);
        });

        // Handle unhandled promise rejections
        process.on("unhandledRejection", (reason, promise) => {
            console.error("Unhandled promise rejection:", reason);
        });
    } catch (error) {
        console.error("Error starting stdio server:", error);
        if (error instanceof Error && error.stack) {
            console.error("Stack trace:", error.stack);
        }
        throw error;
    }
}

async function startHttpServer() {
    console.log(
        `Starting URL Content Saver MCP Server with HTTP transport on port ${port}...`
    );

    const app = express();
    app.use(express.json());

    // Map to store transports by session ID
    const transports: Record<string, StreamableHTTPServerTransport> = {};

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

            const server = createUrlContentSaverServer();

            // Connect to the MCP server
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
        console.log(
            `URL Content Saver MCP Server running with HTTP transport on port ${port}`
        );
    });
}

// Set up global error handlers
process.on("uncaughtException", (error) => {
    console.error("Global uncaught exception:", error);
    if (error instanceof Error && error.stack) {
        console.error("Stack trace:", error.stack);
    }
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Global unhandled promise rejection:", reason);
});

// Start the appropriate server based on the transport type
try {
    if (useHttp) {
        startHttpServer().catch((error) => {
            console.error("Failed to start HTTP server:", error);
            if (error instanceof Error && error.stack) {
                console.error("Stack trace:", error.stack);
            }
            process.exit(1);
        });
    } else {
        startStdioServer().catch((error) => {
            console.error("Failed to start stdio server:", error);
            if (error instanceof Error && error.stack) {
                console.error("Stack trace:", error.stack);
            }
            process.exit(1);
        });
    }
} catch (error) {
    console.error("Error during server startup:", error);
    if (error instanceof Error && error.stack) {
        console.error("Stack trace:", error.stack);
    }
    process.exit(1);
}
