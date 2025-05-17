/**
 * Test client for URL Content Saver MCP Server
 * 
 * This script tests the URL Content Saver MCP Server by connecting to it
 * and calling the saveUrlContent tool.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main function to test the URL Content Saver MCP Server
 */
async function main() {
  try {
    // Create a transport to connect to the server
    const transport = new StreamableHTTPClientTransport(
      new URL('http://localhost:3000/mcp')
    );

    // Create a client
    const client = new Client({
      name: 'test-client',
      version: '1.0.0'
    });

    // Connect to the server
    console.log('Connecting to URL Content Saver MCP Server...');
    await client.connect(transport);
    console.log('Connected successfully');

    // List available tools
    console.log('Listing available tools...');
    const tools = await client.listTools();
    console.log('Available tools:', tools);

    // Define the test URL and file path
    const testUrl = 'https://example.com';
    const testFilePath = path.resolve(process.cwd(), 'test-download.html');

    // Call the saveUrlContent tool
    console.log(`Calling saveUrlContent tool to download ${testUrl} to ${testFilePath}...`);
    const result = await client.callTool({
      name: 'saveUrlContent',
      arguments: {
        url: testUrl,
        filePath: testFilePath
      }
    });

    // Log the result
    console.log('Result:', result);
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
main();
