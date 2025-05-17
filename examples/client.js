// Example client for URL Content Saver MCP Server
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse command line arguments
const args = process.argv.slice(2);
const useHttp = args.includes("--http");
const url =
    args.find((arg) => arg.startsWith("--url="))?.split("=")[1] ||
    "https://example.com";
const filePath =
    args.find((arg) => arg.startsWith("--file="))?.split("=")[1] ||
    "example.html";

async function main() {
    let client;
    let transport;

    if (useHttp) {
        // Connect to HTTP server
        console.log("Connecting to HTTP server...");
        transport = new StreamableHTTPClientTransport(
            new URL("http://localhost:3000/mcp")
        );
    } else {
        // Start the server as a child process and connect via stdio
        console.log("Starting server as child process...");
        const serverPath = path.resolve(__dirname, "../dist/index.js");
        const serverProcess = spawn("node", [serverPath], {
            stdio: ["pipe", "pipe", "pipe"],
        });

        serverProcess.stderr.on("data", (data) => {
            console.error(`Server error: ${data}`);
        });

        transport = new StdioClientTransport({
            command: "node",
            args: [serverPath],
        });

        // Handle cleanup when the transport closes
        transport.onclose = () => {
            serverProcess.kill();
        };
    }

    // Create and connect the client
    client = new Client({
        name: "url-content-saver-client",
        version: "1.0.0",
    });

    try {
        await client.connect(transport);
        console.log("Connected to server");

        // List available tools
        const tools = await client.listTools();
        console.log("Available tools:", tools);

        // Call the saveUrlContent tool
        console.log(`Saving content from ${url} to ${filePath}...`);
        const result = await client.callTool({
            name: "saveUrlContent",
            arguments: {
                url,
                filePath,
            },
        });

        // Parse the result
        const resultContent = result.content;
        const response = JSON.parse(resultContent[0].text);

        if (response.success) {
            console.log("Content saved successfully:");
            console.log(`- File path: ${response.filePath}`);
            console.log(`- File size: ${response.fileSize} bytes`);
            console.log(`- Content type: ${response.contentType}`);
            console.log(`- Status code: ${response.statusCode}`);
        } else {
            console.error("Failed to save content:", response.error);
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        // Close the connection
        if (client) {
            await client.close();
        }
    }
}

main().catch(console.error);
