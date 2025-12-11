// cURL Generator - Generate cURL commands for API endpoints

import type { Endpoint, JsonSchema, ServerInfo } from "../types/openapi";
import { generateSample } from "./sample-generator";

interface CurlOptions {
  baseUrl?: string;
  authToken?: string;
  authType?: "bearer" | "basic" | "api-key";
  apiKeyHeader?: string;
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
  includeOptionalFields?: boolean;
  pretty?: boolean;
}

/**
 * Generate a cURL command for an endpoint
 */
export function generateCurl(
  endpoint: Endpoint,
  requestSchema: JsonSchema | null,
  servers: ServerInfo[],
  options: CurlOptions = {}
): string {
  const {
    baseUrl,
    authToken,
    authType = "bearer",
    apiKeyHeader = "X-API-Key",
    pathParams = {},
    queryParams = {},
    includeOptionalFields = false,
    pretty = true,
  } = options;

  const parts: string[] = [];
  
  // Determine base URL
  let url = baseUrl || servers[0]?.url || "https://api.example.com";
  
  // Remove trailing slash from base URL
  url = url.replace(/\/$/, "");
  
  // Build path with parameters substituted
  let path = endpoint.path;
  for (const [key, value] of Object.entries(pathParams)) {
    path = path.replace(`{${key}}`, value);
  }
  
  // Replace remaining path params with placeholders
  path = path.replace(/\{(\w+)\}/g, (_, name) => {
    // Try to infer from parameter schema
    const param = endpoint.parameters.find(p => p.name === name);
    if (param?.example) return String(param.example);
    if (param?.schema?.example) return String(param.schema.example);
    if (param?.schema?.type === "integer" || param?.schema?.type === "number") return "1";
    return `<${name}>`;
  });
  
  // Build query string
  const queryParts: string[] = [];
  
  // Add explicit query params
  for (const [key, value] of Object.entries(queryParams)) {
    queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  
  // Add query params from spec (optional ones as examples)
  for (const param of endpoint.parameters) {
    if (param.in === "query" && (param.required || includeOptionalFields)) {
      if (!queryParams[param.name]) {
        let value = "<value>";
        if (param.example) value = String(param.example);
        else if (param.schema?.example) value = String(param.schema.example);
        else if (param.schema?.default) value = String(param.schema.default);
        else if (param.schema?.enum?.[0]) value = String(param.schema.enum[0]);
        
        queryParts.push(`${encodeURIComponent(param.name)}=${encodeURIComponent(value)}`);
      }
    }
  }
  
  const fullUrl = queryParts.length > 0 
    ? `${url}${path}?${queryParts.join("&")}`
    : `${url}${path}`;
  
  // Start building cURL command
  parts.push("curl");
  
  // Method
  if (endpoint.method.toUpperCase() !== "GET") {
    parts.push(`-X ${endpoint.method.toUpperCase()}`);
  }
  
  // URL (quoted)
  parts.push(`'${fullUrl}'`);
  
  // Headers
  const headers: [string, string][] = [];
  
  // Content-Type for methods with body
  if (requestSchema && ["post", "put", "patch"].includes(endpoint.method)) {
    headers.push(["Content-Type", "application/json"]);
  }
  
  // Accept header
  headers.push(["Accept", "application/json"]);
  
  // Auth header
  if (authToken) {
    switch (authType) {
      case "bearer":
        headers.push(["Authorization", `Bearer ${authToken}`]);
        break;
      case "basic":
        headers.push(["Authorization", `Basic ${authToken}`]);
        break;
      case "api-key":
        headers.push([apiKeyHeader, authToken]);
        break;
    }
  } else {
    // Add placeholder for auth if endpoint requires it
    if (endpoint.security.length > 0) {
      headers.push(["Authorization", "Bearer <YOUR_TOKEN>"]);
    }
  }
  
  // Add header params from spec
  for (const param of endpoint.parameters) {
    if (param.in === "header" && param.required) {
      let value = "<value>";
      if (param.example) value = String(param.example);
      else if (param.schema?.example) value = String(param.schema.example);
      headers.push([param.name, value]);
    }
  }
  
  for (const [name, value] of headers) {
    parts.push(`-H '${name}: ${value}'`);
  }
  
  // Request body
  if (requestSchema && Object.keys(requestSchema).length > 0 && ["post", "put", "patch"].includes(endpoint.method)) {
    const sample = generateSample(requestSchema, { includeOptional: includeOptionalFields });
    const jsonBody = JSON.stringify(sample, null, pretty ? 2 : 0);
    
    if (pretty) {
      // For multiline JSON, use heredoc-style
      parts.push(`-d '${jsonBody}'`);
    } else {
      parts.push(`-d '${jsonBody}'`);
    }
  }
  
  // Join with appropriate separator
  if (pretty) {
    return parts.join(" \\\n  ");
  }
  return parts.join(" ");
}

/**
 * Generate shell-safe string with proper escaping
 */
export function escapeShell(str: string): string {
  return str.replace(/'/g, "'\\''");
}
