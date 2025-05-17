import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { randomUUID } from "crypto";
import { createUrlContentSaverServer } from "./server/urlContentSaverServer.js";
import os from "os";
import { getBaseDirectory } from "./utils/fileUtils.js";

// Determine transport type from command line arguments
const useHttp = process.argv.includes("--http");
const port = parseInt(process.env.PORT || "3000", 10);

async function startStdioServer() {
    console.log(
        "Starting URL Content Saver MCP Server with stdio transport..."
    );

    const server = createUrlContentSaverServer();
    const transport = new StdioServerTransport();

    await server.connect(transport);

    console.log("URL Content Saver MCP Server running with stdio transport");
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

// Start the appropriate server based on the transport type
if (useHttp) {
    startHttpServer().catch((error) => {
        console.error("Failed to start HTTP server:", error);
        process.exit(1);
    });
} else {
    startStdioServer().catch((error) => {
        console.error("Failed to start stdio server:", error);
        process.exit(1);
    });
}
