[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/chirag127-url-content-saver-mcp-server-badge.png)](https://mseep.ai/app/chirag127-url-content-saver-mcp-server)

# URL Content Saver MCP Server
[![smithery badge](https://smithery.ai/badge/@chirag127/url-content-saver-mcp-server)](https://smithery.ai/server/@chirag127/url-content-saver-mcp-server)

A Model Context Protocol (MCP) server that allows AI agents to download content from any URL and save it directly to a specified file path.

## Features

-   Provides a tool for AI agents to download content from any URL and save it to a specified file path
-   Handles large content that would exceed the AI's token limit by processing the download and file writing operations server-side
-   Supports saving files to any valid path specified by the AI agent
-   Implements proper error handling for cases such as invalid URLs, network failures, or permission issues
-   Returns a success confirmation or detailed error message to the AI agent

## Prerequisites

-   Node.js 18.x or higher
-   npm or yarn

## Installation

### Installing via Smithery

To install url-content-saver-mcp-server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@chirag127/url-content-saver-mcp-server):

```bash
npx -y @smithery/cli install @chirag127/url-content-saver-mcp-server --client claude
```

### Manual Installation
1. Clone the repository:

```bash
git clone https://github.com/chirag127/URL-Content-Saver-MCP-Server.git
cd URL-Content-Saver-MCP-Server
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Usage

### Command Line (stdio)

Run the server with stdio transport (for direct integration with AI agents):

```bash
npm start
```

### HTTP Server

Run the server with HTTP transport (for remote integration):

```bash
npm run start:http
```

By default, the HTTP server listens on port 3000. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm run start:http
```

## Tool Documentation

The server provides a single tool:

### saveUrlContent

Downloads content from a URL and saves it to a specified file path.

#### Parameters

-   `url` (string, required): The complete URL to fetch content from (must include http:// or https://)
-   `filePath` (string, required): The complete target file path where the content should be saved

#### Returns

On success:

```json
{
    "success": true,
    "filePath": "/absolute/path/to/saved/file.html",
    "fileSize": 12345,
    "contentType": "text/html",
    "url": "https://example.com",
    "statusCode": 200
}
```

On error:

```json
{
    "success": false,
    "error": "Detailed error message"
}
```

#### Example

```json
{
    "name": "saveUrlContent",
    "arguments": {
        "url": "https://example.com/sample.pdf",
        "filePath": "/path/to/save/sample.pdf"
    }
}
```

## Integration with AI Agents

### Claude for Desktop

1. Start the HTTP server:

```bash
npm run start:http
```

2. In Claude for Desktop, add the MCP server:

    - Go to Settings > MCP Servers
    - Click "Add Server"
    - Enter the URL: `http://localhost:3000/mcp`
    - Name it "URL Content Saver"

3. Claude can now use the `saveUrlContent` tool to download and save content.

### Programmatic Integration

For programmatic integration with the MCP TypeScript SDK:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
    const transport = new StreamableHTTPClientTransport(
        new URL("http://localhost:3000/mcp")
    );

    const client = new Client({
        name: "example-client",
        version: "1.0.0",
    });

    await client.connect(transport);

    // Call the saveUrlContent tool
    const result = await client.callTool({
        name: "saveUrlContent",
        arguments: {
            url: "https://example.com/sample.pdf",
            filePath: "/path/to/save/sample.pdf",
        },
    });

    console.log(result);
}

main().catch(console.error);
```

## Development

For development with auto-reloading:

```bash
# For stdio transport
npm run dev

# For HTTP transport
npm run dev:http
```

## License

ISC

## Author

Chirag Singhal
