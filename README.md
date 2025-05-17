# URL Content Saver MCP Server

A Model Context Protocol (MCP) server that allows AI agents to download and save web content directly to files in the codebase.

## Overview

This MCP server solves the problem where AI agents are unable to fetch and write large web content directly due to token limitations. It provides a simple tool that:

1. Accepts a URL and a target file path as parameters
2. Fetches the content from the specified URL
3. Saves the retrieved content to the specified file path in the codebase
4. Handles large content that would exceed AI's token limit
5. Returns a success/failure status and relevant metadata (file size, content type, etc.)

## Prerequisites

-   Node.js 18.x or higher
-   npm or yarn

## Installation

```bash
# Clone the repository
git clone https://github.com/chirag127/URL-Content-Saver-MCP-Server.git
cd URL-Content-Saver-MCP-Server

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Starting the Server

The server can be run in two modes:

#### 1. stdio mode (default)

This mode is ideal for direct integration with AI agents:

```bash
npm start
```

#### 2. HTTP mode

This mode exposes the server over HTTP, allowing for remote access:

```bash
npm start -- --http
```

By default, the HTTP server runs on port 3000. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start -- --http
```

### Using the Tool

The server exposes a single tool called `saveUrlContent` with the following parameters:

-   `url` (string): The URL to fetch content from
-   `filePath` (string): The target file path to save the content to

#### Example Response

```json
{
    "success": true,
    "filePath": "path/to/saved/file.html",
    "fileSize": 12345,
    "contentType": "text/html",
    "url": "https://example.com",
    "statusCode": 200
}
```

In case of an error:

```json
{
    "success": false,
    "error": "Error message"
}
```

## Security Considerations

-   The server validates file paths to ensure they are within the project directory
-   URLs are validated before fetching (using the built-in URL constructor)
-   Error handling is implemented for network issues and invalid inputs

## Troubleshooting

### "unknown format 'uri' ignored in schema" Error

If you encounter an error like `Invalid schema for tool saveUrlContent: unknown format "uri" ignored in schema at path "#/properties/url"`, it means there's an issue with the URL format validation. This has been fixed in the current version by using a simpler string validation approach with manual URL validation during execution.

## Project Structure

```
URL-Content-Saver-MCP-Server/
├── dist/                  # Compiled JavaScript files
├── src/                   # TypeScript source code
│   ├── index.ts           # Entry point
│   ├── server/            # MCP server implementation
│   │   └── urlContentSaverServer.ts
│   └── utils/             # Utility functions
│       ├── fileUtils.ts   # File handling utilities
│       └── urlUtils.ts    # URL fetching utilities
├── package.json           # Project metadata and dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## License

MIT

## Author

Chirag Singhal (@chirag127)
