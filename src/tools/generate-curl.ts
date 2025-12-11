// Tool: generate_curl - Generate cURL command for an endpoint

import { specService } from "../openapi";
import { generateCurl } from "../openapi/curl-generator";
import { successResponse, errorResponse } from "../types/mcp";
import { OpenAPIError } from "../utils/errors";

interface GenerateCurlInput {
  path: string;
  method: string;
  baseUrl?: string;
  authToken?: string;
  authType?: "bearer" | "basic" | "api-key";
  apiKeyHeader?: string;
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
  includeOptional?: boolean;
}

export async function handleGenerateCurl(input: GenerateCurlInput) {
  try {
    const endpoint = specService.getEndpoint(input.path, input.method);
    const servers = specService.getServers();
    const requestSchema = specService.getRequestSchema(input.path, input.method);

    // Parse pathParams and queryParams if they're strings (from MCP)
    let pathParams = input.pathParams || {};
    let queryParams = input.queryParams || {};
    
    if (typeof pathParams === "string") {
      try { pathParams = JSON.parse(pathParams); } catch { pathParams = {}; }
    }
    if (typeof queryParams === "string") {
      try { queryParams = JSON.parse(queryParams); } catch { queryParams = {}; }
    }

    const curl = generateCurl(
      endpoint,
      requestSchema?.schema || null,
      servers,
      {
        baseUrl: input.baseUrl,
        authToken: input.authToken,
        authType: input.authType,
        apiKeyHeader: input.apiKeyHeader,
        pathParams,
        queryParams,
        includeOptionalFields: input.includeOptional ?? false,
        pretty: true,
      }
    );

    return successResponse({
      path: input.path,
      method: input.method.toUpperCase(),
      curl,
      hint: "Copy and paste this command into your terminal or import into Postman",
    });
  } catch (error) {
    if (error instanceof OpenAPIError) {
      return errorResponse(error.message, error.code, error.context);
    }
    return errorResponse(`Failed to generate cURL: ${(error as Error).message}`);
  }
}
