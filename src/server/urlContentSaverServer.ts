import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchUrlAsStream } from "../utils/urlUtils.js";
import {
    isPathSafe,
    saveStreamToFile,
    getBaseDirectory,
} from "../utils/fileUtils.js";
import path from "path";
import os from "os";
import fs from "fs-extra";

/**
 * Creates and configures the URL Content Saver MCP Server
 * @returns Configured MCP Server instance
 */
export function createUrlContentSaverServer(): McpServer {
    // Log environment information for debugging
    console.log("Creating URL Content Saver MCP Server");
    console.log(`Current working directory: ${process.cwd()}`);
    console.log(`Home directory: ${os.homedir()}`);
    console.log(`Base directory for file operations: ${getBaseDirectory()}`);
    console.log(`Node.js version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);

    // Set environment variables for VS Code extensions if needed
    if (!process.env.MCP_ALLOW_ANY_PATH) {
        console.log("Setting MCP_ALLOW_ANY_PATH=true for VS Code extensions");
        process.env.MCP_ALLOW_ANY_PATH = "true";
    }

    // Log VS Code specific environment variables if they exist
    if (process.env.VSCODE_CWD) {
        console.log(`VS Code CWD: ${process.env.VSCODE_CWD}`);
    }
    if (process.env.VSCODE_EXTENSION_PATH) {
        console.log(
            `VS Code Extension Path: ${process.env.VSCODE_EXTENSION_PATH}`
        );
    }
    if (process.env.VSCODE_WORKSPACE_FOLDER) {
        console.log(
            `VS Code Workspace Folder: ${process.env.VSCODE_WORKSPACE_FOLDER}`
        );
    }

    // Log MCP-specific environment variables
    if (process.env.MCP_BASE_DIR) {
        console.log(`MCP Base Directory: ${process.env.MCP_BASE_DIR}`);
    }
    if (process.env.MCP_ALLOW_ANY_PATH) {
        console.log(`MCP Allow Any Path: ${process.env.MCP_ALLOW_ANY_PATH}`);
    }

    const server = new McpServer({
        name: "URL Content Saver",
        version: "1.0.0",
    });

    // Add the saveUrlContent tool
    server.tool(
        "saveUrlContent",
        {
            url: z.string().min(1, "URL cannot be empty"),
            filePath: z.string().min(1, "File path cannot be empty"),
        },
        async ({ url, filePath }) => {
            console.log(
                `Tool called: saveUrlContent with URL: ${url}, filePath: ${filePath}`
            );

            try {
                // Get the base directory for file operations
                const baseDir = getBaseDirectory();
                console.log(`Using base directory: ${baseDir}`);

                // Validate the file path is safe
                console.log(`Validating file path: ${filePath}`);
                if (!isPathSafe(filePath, baseDir)) {
                    console.error(
                        `Invalid file path: ${filePath} is outside the base directory: ${baseDir}`
                    );
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    success: false,
                                    error: `Invalid file path: Path is outside the base directory (${baseDir})`,
                                }),
                            },
                        ],
                        isError: true,
                    };
                }

                // Normalize the file path
                const normalizedPath = path.normalize(filePath);
                console.log(`Normalized file path: ${normalizedPath}`);

                // Special case for Augment Code environment
                let absolutePath;
                if (
                    process.cwd().includes("AppData\\Local\\Programs\\Trae") ||
                    process.cwd().includes("AppData/Local/Programs/Trae")
                ) {
                    // If it's a relative path and we're in Augment Code, try to use D:\AM\GitHub\web-chatter
                    if (!path.isAbsolute(normalizedPath)) {
                        const webChatterDir = "D:\\AM\\GitHub\\web-chatter";
                        if (fs.existsSync(webChatterDir)) {
                            absolutePath = path.resolve(
                                webChatterDir,
                                normalizedPath
                            );
                            console.log(
                                `Using web-chatter directory for relative path: ${absolutePath}`
                            );
                        } else {
                            // Fallback to normal resolution
                            absolutePath = path.isAbsolute(normalizedPath)
                                ? normalizedPath
                                : path.resolve(baseDir, normalizedPath);
                        }
                    } else {
                        // It's already an absolute path
                        absolutePath = normalizedPath;
                    }
                } else {
                    // Normal case - resolve relative to base directory
                    absolutePath = path.isAbsolute(normalizedPath)
                        ? normalizedPath
                        : path.resolve(baseDir, normalizedPath);
                }

                console.log(`Absolute file path: ${absolutePath}`);

                // Fetch the URL content as a stream
                console.log(`Fetching content from URL: ${url}`);
                const { stream, metadata } = await fetchUrlAsStream(url);
                console.log(`Successfully fetched content from URL: ${url}`);

                // Save the stream to a file
                console.log(`Saving content to file: ${absolutePath}`);
                const { filePath: savedPath, fileSize } =
                    await saveStreamToFile(absolutePath, stream);
                console.log(
                    `Successfully saved content to file: ${savedPath} (${fileSize} bytes)`
                );

                // Return success response with metadata
                const response = {
                    success: true,
                    filePath: savedPath,
                    fileSize,
                    contentType: metadata.contentType,
                    url: metadata.url,
                    statusCode: metadata.statusCode,
                };
                console.log(
                    `Returning success response: ${JSON.stringify(response)}`
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response),
                        },
                    ],
                };
            } catch (error) {
                // Handle errors
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error";
                console.error(`Error in saveUrlContent tool: ${errorMessage}`);

                if (error instanceof Error && error.stack) {
                    console.error(`Stack trace: ${error.stack}`);
                }

                const response = {
                    success: false,
                    error: errorMessage,
                };
                console.log(
                    `Returning error response: ${JSON.stringify(response)}`
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response),
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    return server;
}
