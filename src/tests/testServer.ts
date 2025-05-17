import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTest() {
    console.log("Starting test for URL Content Saver MCP Server...");

    // Start the server as a child process
    const serverPath = path.resolve(__dirname, "../../dist/index.js");
    console.log(`Starting server from: ${serverPath}`);

    const serverProcess = spawn("node", [serverPath], {
        stdio: ["pipe", "pipe", "pipe"],
    });

    serverProcess.stderr.on("data", (data) => {
        console.error(`Server error: ${data}`);
    });

    // Create the client transport
    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
    });

    // Handle cleanup when the transport closes
    transport.onclose = () => {
        serverProcess.kill();
    };

    // Create and connect the client
    const client = new Client({
        name: "url-content-saver-test-client",
        version: "1.0.0",
    });

    try {
        await client.connect(transport);
        console.log("Connected to server");

        // List available tools
        const tools = await client.listTools();
        console.log("Available tools:", tools);

        // Test parameters
        const testUrl = "https://example.com";
        const testFilePath = "test-output/example.html";

        // Ensure test directory exists
        await fs.ensureDir(path.dirname(testFilePath));

        // Call the saveUrlContent tool
        console.log(`Saving content from ${testUrl} to ${testFilePath}...`);
        const result = await client.callTool({
            name: "saveUrlContent",
            arguments: {
                url: testUrl,
                filePath: testFilePath,
            },
        });

        // Parse the result
        const resultContent = result.content as Array<{
            type: string;
            text: string;
        }>;
        const response = JSON.parse(resultContent[0].text);

        if (response.success) {
            console.log("✅ Content saved successfully:");
            console.log(`- File path: ${response.filePath}`);
            console.log(`- File size: ${response.fileSize} bytes`);
            console.log(`- Content type: ${response.contentType}`);
            console.log(`- Status code: ${response.statusCode}`);

            // Verify the file exists
            const fileExists = await fs.pathExists(testFilePath);
            console.log(`- File exists: ${fileExists ? "✅" : "❌"}`);

            if (fileExists) {
                const fileSize = (await fs.stat(testFilePath)).size;
                console.log(`- Verified file size: ${fileSize} bytes`);
                console.log(
                    `- Size matches: ${
                        fileSize === response.fileSize ? "✅" : "❌"
                    }`
                );
            }
        } else {
            console.error("❌ Failed to save content:", response.error);
        }

        console.log("Test completed");
    } catch (error) {
        console.error("❌ Test error:", error);
    } finally {
        // Close the connection
        await client.close();
    }
}

runTest().catch(console.error);
