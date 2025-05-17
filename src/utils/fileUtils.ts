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
    // Try to use the current working directory first
    const cwd = process.cwd();

    // If we're in a VS Code extension, try to use the workspace folder
    if (process.env.VSCODE_CWD) {
        return process.env.VSCODE_CWD;
    }

    // If we're in a VS Code extension but VSCODE_CWD is not set, try other environment variables
    if (process.env.VSCODE_EXTENSION_PATH) {
        return process.env.VSCODE_EXTENSION_PATH;
    }

    // If all else fails, use the home directory
    if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
        return os.homedir();
    }

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
        // Handle absolute paths
        if (path.isAbsolute(filePath)) {
            const resolvedPath = path.resolve(filePath);
            return resolvedPath.startsWith(path.resolve(baseDirToUse));
        }

        // Handle relative paths
        const normalizedPath = path.normalize(filePath);
        const resolvedPath = path.resolve(baseDirToUse, normalizedPath);
        return resolvedPath.startsWith(path.resolve(baseDirToUse));
    } catch (error) {
        console.error(
            `Error validating path safety: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
        return false;
    }
}
