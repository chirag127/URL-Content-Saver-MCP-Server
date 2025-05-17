# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-05-17

### Changed

-   Enhanced response format for the `saveUrlContent` tool to include more detailed information:
    -   Added `filePath` field with the absolute path to the saved file
    -   Added `fileSize` field with the size of the saved file in bytes
    -   Added `contentType` field with the content type from the response headers
    -   Added `url` field with the original URL
    -   Added `statusCode` field with the HTTP status code
    -   Changed error format to use an `error` field instead of `message`
-   Updated documentation to reflect the new response format

## [1.0.0] - 2025-05-17

### Added

-   Initial release of URL Content Saver MCP Server
-   Implemented `saveUrlContent` tool for downloading content from URLs and saving to files
-   Added support for stdio transport for command-line integration
-   Added support for Streamable HTTP transport for remote integration
-   Implemented error handling for invalid URLs, network failures, and file system issues
-   Created comprehensive documentation in README.md
