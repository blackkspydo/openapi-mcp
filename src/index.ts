#!/usr/bin/env node
// OpenAPI MCP Server - Entry Point

import { startServer } from "./server";

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
