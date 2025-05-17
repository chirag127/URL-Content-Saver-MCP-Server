// Simple test client for URL Content Saver MCP Server
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Start the server as a child process
  console.log('Starting server as child process...');
  const serverPath = path.resolve(__dirname, './dist/index.js');
  const serverProcess = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server error: ${data.toString()}`);
  });

  // Create the client transport
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath]
  });

  // Create and connect the client
  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  });

  try {
    await client.connect(transport);
    console.log('Connected to server');

    // List available tools
    const tools = await client.listTools();
    console.log('Available tools:', JSON.stringify(tools, null, 2));

    // Test parameters
    const testUrl = 'https://example.com';
    const testFilePath = 'test-output.html';

    // Call the saveUrlContent tool
    console.log(`Saving content from ${testUrl} to ${testFilePath}...`);
    const result = await client.callTool({
      name: 'saveUrlContent',
      arguments: {
        url: testUrl,
        filePath: testFilePath
      }
    });

    // Parse the result
    console.log('Raw result:', result);
    const resultContent = result.content;
    const response = JSON.parse(resultContent[0].text);
    
    console.log('Parsed response:', response);

    if (response.success) {
      console.log('Content saved successfully:');
      console.log(`- File path: ${response.filePath}`);
      console.log(`- File size: ${response.fileSize} bytes`);
      console.log(`- Content type: ${response.contentType}`);
      console.log(`- Status code: ${response.statusCode}`);
      
      // Verify the file exists
      const fileExists = fs.existsSync(testFilePath);
      console.log(`- File exists: ${fileExists ? '✅' : '❌'}`);
      
      if (fileExists) {
        const fileSize = fs.statSync(testFilePath).size;
        console.log(`- Verified file size: ${fileSize} bytes`);
        console.log(`- Size matches: ${fileSize === response.fileSize ? '✅' : '❌'}`);
      }
    } else {
      console.error('Failed to save content:', response.error);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    if (client) {
      await client.close();
    }
    
    // Kill the server process
    serverProcess.kill();
  }
}

main().catch(console.error);
