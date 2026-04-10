#!/usr/bin/env node

/**
 * WHOOP MCP Server entry point.
 *
 * Creates the MCP server, handles OAuth authentication,
 * and starts the stdio transport.
 */
async function main(): Promise<void> {
  // TODO: Initialize OAuth, create API client, start MCP server
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
