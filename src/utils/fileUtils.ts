import fs from "fs-extra";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import os from "os";

/**
 * Ensures that the directory for a file path exists
 * @param filePath The file path to ensure directory for
 */
export async function ensureDirectoryExists(filePath: string): Promise<void> {
    const directory = path.dirname(filePath);
    await fs.ensureDir(directory);
}

/**
 * Saves content to a file
 * @param filePath The path to save the file to
 * @param content The content to save
 * @returns Object containing the file size and path
 */
export async function saveContentToFile(
    filePath: string,
    content: string | Buffer
): Promise<{ filePath: string; fileSize: number }> {
    await ensureDirectoryExists(filePath);
    await fs.writeFile(filePath, content);
    const stats = await fs.stat(filePath);
    return {
        filePath,
        fileSize: stats.size,
    };
}

/**
 * Saves a readable stream to a file
 * @param filePath The path to save the file to
 * @param stream The readable stream to save
 * @returns Object containing the file size and path
 */
export async function saveStreamToFile(
    filePath: string,
    stream: Readable
): Promise<{ filePath: string; fileSize: number }> {
    try {
        console.log(`Saving stream to file: ${filePath}`);

        // Ensure the directory exists
        const directory = path.dirname(filePath);
        console.log(`Ensuring directory exists: ${directory}`);
        await fs.ensureDir(directory);

        // Create the write stream
        console.log(`Creating write stream for: ${filePath}`);
        const writeStream = fs.createWriteStream(filePath);

        // Set up error handling for the write stream
        writeStream.on("error", (err) => {
            console.error(`Error in write stream: ${err.message}`);
        });

        // Pipe the stream to the file
        console.log(`Piping stream to file: ${filePath}`);
        await pipeline(stream, writeStream);

        // Get the file stats
        console.log(`Getting stats for file: ${filePath}`);
        const stats = await fs.stat(filePath);

        console.log(
            `Successfully saved stream to file: ${filePath} (${stats.size} bytes)`
        );
        return {
            filePath,
            fileSize: stats.size,
        };
    } catch (error) {
        console.error(
            `Error saving stream to file ${filePath}: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
        throw error;
    }
}

/**
 * Gets the most appropriate base directory for file operations
 * @returns The base directory to use for file operations
 */
export function getBaseDirectory(): string {
    // Check for explicitly set environment variable for base directory
    if (process.env.MCP_BASE_DIR && fs.existsSync(process.env.MCP_BASE_DIR)) {
        console.log(
            `Using MCP_BASE_DIR environment variable: ${process.env.MCP_BASE_DIR}`
        );
        return process.env.MCP_BASE_DIR;
    }

    // For Augment Code or other environments, try to use a configuration file
    const cwd = process.cwd();
    console.log(`Checking for configuration in: ${cwd}`);

    // Try to find a configuration file in the current directory
    try {
        const configPaths = [
            path.join(cwd, ".mcp-config.json"),
            path.join(cwd, "mcp-config.json"),
            path.join(os.homedir(), ".mcp-config.json"),
        ];

        for (const configPath of configPaths) {
            if (fs.existsSync(configPath)) {
                console.log(`Found configuration file: ${configPath}`);
                try {
                    const config = JSON.parse(
                        fs.readFileSync(configPath, "utf8")
                    );
                    if (config.baseDir && fs.existsSync(config.baseDir)) {
                        console.log(
                            `Using base directory from config: ${config.baseDir}`
                        );
                        return config.baseDir;
                    }
                } catch (parseError) {
                    console.error(`Error parsing config file: ${parseError}`);
                }
            }
        }
    } catch (error) {
        console.error(`Error reading configuration: ${error}`);
    }

    // If we're in a special environment like Augment Code, log it but don't use hardcoded paths
    if (
        cwd.includes("AppData\\Local\\Programs\\Trae") ||
        cwd.includes("AppData/Local/Programs/Trae")
    ) {
        console.log("Detected Augment Code environment");
        console.log("No configuration found. Using current working directory.");
        console.log(
            "To specify a custom base directory, set the MCP_BASE_DIR environment variable"
        );
        console.log(
            "or create a .mcp-config.json file in the current directory or home directory."
        );
    }

    // Try to use the current working directory
    console.log(`Current working directory: ${cwd}`);

    // If we're in a VS Code extension, try to use the workspace folder
    if (process.env.VSCODE_CWD) {
        console.log(`Found VSCODE_CWD: ${process.env.VSCODE_CWD}`);
        return process.env.VSCODE_CWD;
    }

    // If we're in a VS Code extension but VSCODE_CWD is not set, try other environment variables
    if (process.env.VSCODE_EXTENSION_PATH) {
        console.log(
            `Found VSCODE_EXTENSION_PATH: ${process.env.VSCODE_EXTENSION_PATH}`
        );
        return process.env.VSCODE_EXTENSION_PATH;
    }

    // Check if we're in a VS Code workspace
    if (process.env.VSCODE_WORKSPACE_FOLDER) {
        console.log(
            `Found VSCODE_WORKSPACE_FOLDER: ${process.env.VSCODE_WORKSPACE_FOLDER}`
        );
        return process.env.VSCODE_WORKSPACE_FOLDER;
    }

    // If all else fails, use the home directory
    if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
        console.log(
            `CWD not accessible, using home directory: ${os.homedir()}`
        );
        return os.homedir();
    }

    console.log(`Using current working directory: ${cwd}`);
    return cwd;
}

/**
 * Validates if a file path is safe (not outside the project directory)
 * @param filePath The file path to validate
 * @param baseDir The base directory to check against (defaults to determined base directory)
 * @returns True if the path is safe, false otherwise
 */
export function isPathSafe(filePath: string, baseDir?: string): boolean {
    // If no base directory is provided, determine the appropriate one
    const baseDirToUse = baseDir || getBaseDirectory();

    try {
        console.log(`Checking if path is safe: ${filePath}`);
        console.log(`Base directory: ${baseDirToUse}`);

        // Special case for VS Code extensions - allow any path if we're in a VS Code extension
        // and the MCP_ALLOW_ANY_PATH environment variable is set
        if (process.env.MCP_ALLOW_ANY_PATH === "true") {
            console.log("MCP_ALLOW_ANY_PATH is set to true, allowing any path");
            return true;
        }

        // Special case for Augment Code - allow any path if we're in the Augment Code environment
        if (
            baseDirToUse.includes("AppData\\Local\\Programs\\Trae") ||
            baseDirToUse.includes("AppData/Local/Programs/Trae")
        ) {
            console.log("Detected Augment Code environment, allowing any path");
            return true;
        }

        // Special case for VS Code extensions - if the path starts with a drive letter
        // and we're in a VS Code extension, check if it's a valid drive
        if (
            path.isAbsolute(filePath) &&
            /^[a-zA-Z]:\\/.test(filePath) &&
            (process.env.VSCODE_CWD ||
                process.env.VSCODE_EXTENSION_PATH ||
                process.env.VSCODE_WORKSPACE_FOLDER)
        ) {
            // Extract the drive letter from the file path
            const driveLetter = filePath.substring(0, 1).toUpperCase();

            // Check if the drive exists
            try {
                const drives = fs.readdirSync("/");
                if (drives.includes(`${driveLetter}:`)) {
                    console.log(`Drive ${driveLetter}: exists, allowing path`);
                    return true;
                }
            } catch (error) {
                console.log(`Error checking drives: ${error}`);
                // Continue with normal path safety check
            }
        }

        // Handle absolute paths
        if (path.isAbsolute(filePath)) {
            const resolvedPath = path.resolve(filePath);
            const resolvedBaseDir = path.resolve(baseDirToUse);
            const isSafe = resolvedPath.startsWith(resolvedBaseDir);
            console.log(
                `Absolute path check: ${resolvedPath} starts with ${resolvedBaseDir}: ${isSafe}`
            );
            return isSafe;
        }

        // Handle relative paths
        const normalizedPath = path.normalize(filePath);
        const resolvedPath = path.resolve(baseDirToUse, normalizedPath);
        const resolvedBaseDir = path.resolve(baseDirToUse);
        const isSafe = resolvedPath.startsWith(resolvedBaseDir);
        console.log(
            `Relative path check: ${resolvedPath} starts with ${resolvedBaseDir}: ${isSafe}`
        );
        return isSafe;
    } catch (error) {
        console.error(
            `Error validating path safety: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
        return false;
    }
}
