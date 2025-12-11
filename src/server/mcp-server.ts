// MCP Server - Main server implementation

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  handleLoadSpec,
  handleListEndpoints,
  handleSearchEndpoints,
  handleGetEndpointDetails,
  handleGetRequestSchema,
  handleGetResponseSchema,
  handleValidatePayload,
  handleGenerateSample,
  handleGetAuthSchemes,
  handleGetServers,
  handleGenerateTypescriptTypes,
  handleGenerateCurl,
} from "../tools";

import { logger } from "../utils";

// HTTP method enum for reuse
const HttpMethodEnum = z.enum(["get", "post", "put", "patch", "delete", "options", "head", "trace"]);

// Create MCP server
const server = new McpServer({
  name: "openapi-mcp",
  version: "1.0.0",
});

// Register tools using the new registerTool API
function registerTools() {
  // load_spec
  server.registerTool(
    "load_spec",
    {
      description: "Load an OpenAPI specification from a URL or local file. This must be called before using other tools.",
      inputSchema: {
        url: z.string().url().optional().describe("URL to fetch the OpenAPI spec from"),
        filePath: z.string().optional().describe("Local file path to the OpenAPI spec"),
      },
    },
    async (args) => {
      const result = await handleLoadSpec(args as { url?: string; filePath?: string });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // list_endpoints
  server.registerTool(
    "list_endpoints",
    {
      description: "List all API endpoints from the loaded OpenAPI spec with optional filtering.",
      inputSchema: {
        tag: z.string().optional().describe("Filter by OpenAPI tag"),
        method: HttpMethodEnum.optional().describe("Filter by HTTP method"),
        deprecated: z.boolean().optional().describe("Include deprecated endpoints (default: true)"),
        limit: z.number().int().positive().optional().describe("Maximum number of results"),
      },
    },
    async (args) => {
      const result = await handleListEndpoints(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // search_endpoints
  server.registerTool(
    "search_endpoints",
    {
      description: "Search for endpoints by keyword across path, summary, description, and operationId.",
      inputSchema: {
        query: z.string().min(1).describe("Search query"),
        limit: z.number().int().positive().optional().describe("Maximum number of results (default: 20)"),
      },
    },
    async (args) => {
      const result = await handleSearchEndpoints(args as { query: string; limit?: number });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // get_endpoint_details
  server.registerTool(
    "get_endpoint_details",
    {
      description: "Get detailed information about a specific endpoint including parameters, request body, responses, and security.",
      inputSchema: {
        path: z.string().min(1).describe("API path (e.g., /users/{id})"),
        method: HttpMethodEnum.describe("HTTP method"),
      },
    },
    async (args) => {
      const result = await handleGetEndpointDetails(args as { path: string; method: "get" | "post" | "put" | "patch" | "delete" | "options" | "head" | "trace" });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // get_request_schema
  server.registerTool(
    "get_request_schema",
    {
      description: "Get the fully dereferenced request body schema for an endpoint.",
      inputSchema: {
        path: z.string().min(1).describe("API path"),
        method: HttpMethodEnum.describe("HTTP method"),
      },
    },
    async (args) => {
      const result = await handleGetRequestSchema(args as { path: string; method: "get" | "post" | "put" | "patch" | "delete" | "options" | "head" | "trace" });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // get_response_schema
  server.registerTool(
    "get_response_schema",
    {
      description: "Get the response schema for an endpoint by status code.",
      inputSchema: {
        path: z.string().min(1).describe("API path"),
        method: HttpMethodEnum.describe("HTTP method"),
        statusCode: z.string().optional().describe("HTTP status code (default: 200)"),
      },
    },
    async (args) => {
      const result = await handleGetResponseSchema(args as { path: string; method: "get" | "post" | "put" | "patch" | "delete" | "options" | "head" | "trace"; statusCode?: string });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // validate_payload
  server.registerTool(
    "validate_payload",
    {
      description: "Validate a JSON payload against the request schema for an endpoint.",
      inputSchema: {
        path: z.string().min(1).describe("API path"),
        method: HttpMethodEnum.describe("HTTP method"),
        payload: z.unknown().describe("JSON payload to validate"),
      },
    },
    async (args) => {
      const result = await handleValidatePayload(args as { path: string; method: "get" | "post" | "put" | "patch" | "delete" | "options" | "head" | "trace"; payload: unknown });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // generate_sample
  server.registerTool(
    "generate_sample",
    {
      description: "Generate a sample request payload for an endpoint based on its schema.",
      inputSchema: {
        path: z.string().min(1).describe("API path"),
        method: HttpMethodEnum.describe("HTTP method"),
        includeOptional: z.boolean().optional().describe("Include optional fields (default: false)"),
      },
    },
    async (args) => {
      const result = await handleGenerateSample(args as { path: string; method: "get" | "post" | "put" | "patch" | "delete" | "options" | "head" | "trace"; includeOptional?: boolean });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // get_auth_schemes
  server.registerTool(
    "get_auth_schemes",
    {
      description: "Get authentication schemes defined in the OpenAPI spec and their requirements per endpoint.",
    },
    async () => {
      const result = await handleGetAuthSchemes();
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // get_servers
  server.registerTool(
    "get_servers",
    {
      description: "Get available API servers and their variables from the OpenAPI spec.",
    },
    async () => {
      const result = await handleGetServers();
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // generate_typescript_types
  server.registerTool(
    "generate_typescript_types",
    {
      description: "Generate TypeScript interfaces/types from OpenAPI schemas. Use schemaName to generate from a component schema (e.g., 'Pet'), or use path+method to generate request/response types for an endpoint.",
      inputSchema: {
        schemaName: z.string().optional().describe("Name of the schema from components/schemas (e.g., 'Pet', 'Order')"),
        path: z.string().optional().describe("API path to generate types for (e.g., /pet)"),
        method: HttpMethodEnum.optional().describe("HTTP method (required if path is provided)"),
        includeComments: z.boolean().optional().describe("Include JSDoc comments from schema descriptions (default: true)"),
      },
    },
    async (args) => {
      const result = await handleGenerateTypescriptTypes(args as {
        schemaName?: string;
        path?: string;
        method?: string;
        includeComments?: boolean;
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // generate_curl
  server.registerTool(
    "generate_curl",
    {
      description: "Generate a ready-to-use cURL command for an API endpoint. Includes sample request body, auth headers, and path/query parameters. Copy-paste to terminal or import into Postman.",
      inputSchema: {
        path: z.string().min(1).describe("API path (e.g., /pet/{petId})"),
        method: HttpMethodEnum.describe("HTTP method"),
        baseUrl: z.string().optional().describe("Base URL to use (defaults to first server in spec)"),
        authToken: z.string().optional().describe("Auth token to include in request"),
        authType: z.enum(["bearer", "basic", "api-key"]).optional().describe("Type of auth (default: bearer)"),
        apiKeyHeader: z.string().optional().describe("Header name for API key auth (default: X-API-Key)"),
        pathParams: z.record(z.string(), z.string()).optional().describe("Path parameter values as JSON object"),
        queryParams: z.record(z.string(), z.string()).optional().describe("Query parameter values as JSON object"),
        includeOptional: z.boolean().optional().describe("Include optional fields in request body (default: false)"),
      },
    },
    async (args) => {
      const result = await handleGenerateCurl(args as {
        path: string;
        method: string;
        baseUrl?: string;
        authToken?: string;
        authType?: "bearer" | "basic" | "api-key";
        apiKeyHeader?: string;
        pathParams?: Record<string, string>;
        queryParams?: Record<string, string>;
        includeOptional?: boolean;
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  logger.info("Registered 12 MCP tools");
}

// Start the server
export async function startServer() {
  registerTools();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("OpenAPI MCP Server started", {
    name: "openapi-mcp",
    version: "1.0.0",
    transport: "stdio",
  });

  // Handle shutdown
  process.on("SIGINT", async () => {
    logger.info("Shutting down...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info("Shutting down...");
    await server.close();
    process.exit(0);
  });
}
