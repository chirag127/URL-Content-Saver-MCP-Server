import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchUrlAsStream } from '../utils/urlUtils.js';
import { isPathSafe, saveStreamToFile } from '../utils/fileUtils.js';
import path from 'path';

/**
 * Creates and configures the URL Content Saver MCP Server
 * @returns Configured MCP Server instance
 */
export function createUrlContentSaverServer(): McpServer {
  const server = new McpServer({
    name: 'URL Content Saver',
    version: '1.0.0',
  });

  // Add the saveUrlContent tool
  server.tool(
    'saveUrlContent',
    {
      url: z.string().url('Invalid URL format'),
      filePath: z.string().min(1, 'File path cannot be empty'),
    },
    async ({ url, filePath }) => {
      try {
        // Validate the file path is safe
        if (!isPathSafe(filePath)) {
          return {
            content: [{ 
              type: 'text', 
              text: JSON.stringify({
                success: false,
                error: 'Invalid file path: Path is outside the project directory'
              })
            }],
            isError: true
          };
        }

        // Normalize the file path
        const normalizedPath = path.normalize(filePath);
        
        // Fetch the URL content as a stream
        const { stream, metadata } = await fetchUrlAsStream(url);
        
        // Save the stream to a file
        const { filePath: savedPath, fileSize } = await saveStreamToFile(normalizedPath, stream);
        
        // Return success response with metadata
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              success: true,
              filePath: savedPath,
              fileSize,
              contentType: metadata.contentType,
              url: metadata.url,
              statusCode: metadata.statusCode
            })
          }]
        };
      } catch (error) {
        // Handle errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              success: false,
              error: errorMessage
            })
          }],
          isError: true
        };
      }
    }
  );

  return server;
}
