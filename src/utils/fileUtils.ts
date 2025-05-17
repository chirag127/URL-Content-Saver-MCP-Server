import fs from 'fs-extra';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

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
export async function saveContentToFile(filePath: string, content: string | Buffer): Promise<{ filePath: string; fileSize: number }> {
  await ensureDirectoryExists(filePath);
  await fs.writeFile(filePath, content);
  const stats = await fs.stat(filePath);
  return {
    filePath,
    fileSize: stats.size
  };
}

/**
 * Saves a readable stream to a file
 * @param filePath The path to save the file to
 * @param stream The readable stream to save
 * @returns Object containing the file size and path
 */
export async function saveStreamToFile(filePath: string, stream: Readable): Promise<{ filePath: string; fileSize: number }> {
  await ensureDirectoryExists(filePath);
  const writeStream = fs.createWriteStream(filePath);
  
  await pipeline(stream, writeStream);
  
  const stats = await fs.stat(filePath);
  return {
    filePath,
    fileSize: stats.size
  };
}

/**
 * Validates if a file path is safe (not outside the project directory)
 * @param filePath The file path to validate
 * @param baseDir The base directory to check against (defaults to current working directory)
 * @returns True if the path is safe, false otherwise
 */
export function isPathSafe(filePath: string, baseDir: string = process.cwd()): boolean {
  const normalizedPath = path.normalize(filePath);
  const resolvedPath = path.resolve(baseDir, normalizedPath);
  return resolvedPath.startsWith(path.resolve(baseDir));
}
