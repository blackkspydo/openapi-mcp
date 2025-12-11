// Tool Input Types - Zod schemas for tool inputs

import { z } from "zod";

// load_spec
export const LoadSpecInputSchema = z.object({
  url: z.string().url().optional().describe("URL to fetch the OpenAPI spec from"),
  filePath: z.string().optional().describe("Local file path to the OpenAPI spec"),
}).refine(data => data.url || data.filePath, {
  message: "Either url or filePath must be provided"
});
export type LoadSpecInput = z.infer<typeof LoadSpecInputSchema>;

// list_endpoints
export const ListEndpointsInputSchema = z.object({
  tag: z.string().optional().describe("Filter by OpenAPI tag"),
  method: z.enum(["get", "post", "put", "patch", "delete", "options", "head", "trace"]).optional().describe("Filter by HTTP method"),
  deprecated: z.boolean().optional().describe("Include deprecated endpoints (default: true)"),
  limit: z.number().int().positive().optional().describe("Maximum number of results to return"),
});
export type ListEndpointsInput = z.infer<typeof ListEndpointsInputSchema>;

// search_endpoints
export const SearchEndpointsInputSchema = z.object({
  query: z.string().min(1).describe("Search query to match against path, summary, description, and operationId"),
  limit: z.number().int().positive().optional().describe("Maximum number of results (default: 20)"),
});
export type SearchEndpointsInput = z.infer<typeof SearchEndpointsInputSchema>;

// get_endpoint_details
export const GetEndpointDetailsInputSchema = z.object({
  path: z.string().min(1).describe("API path (e.g., /users/{id})"),
  method: z.enum(["get", "post", "put", "patch", "delete", "options", "head", "trace"]).describe("HTTP method"),
});
export type GetEndpointDetailsInput = z.infer<typeof GetEndpointDetailsInputSchema>;

// get_request_schema
export const GetRequestSchemaInputSchema = z.object({
  path: z.string().min(1).describe("API path (e.g., /users)"),
  method: z.enum(["get", "post", "put", "patch", "delete", "options", "head", "trace"]).describe("HTTP method"),
});
export type GetRequestSchemaInput = z.infer<typeof GetRequestSchemaInputSchema>;

// get_response_schema
export const GetResponseSchemaInputSchema = z.object({
  path: z.string().min(1).describe("API path (e.g., /users/{id})"),
  method: z.enum(["get", "post", "put", "patch", "delete", "options", "head", "trace"]).describe("HTTP method"),
  statusCode: z.string().regex(/^[1-5][0-9X]{2}$/).optional().describe("HTTP status code (e.g., 200, 404, 2XX). Default: 200"),
});
export type GetResponseSchemaInput = z.infer<typeof GetResponseSchemaInputSchema>;

// validate_payload
export const ValidatePayloadInputSchema = z.object({
  path: z.string().min(1).describe("API path"),
  method: z.enum(["get", "post", "put", "patch", "delete", "options", "head", "trace"]).describe("HTTP method"),
  payload: z.unknown().describe("JSON payload to validate against the request schema"),
});
export type ValidatePayloadInput = z.infer<typeof ValidatePayloadInputSchema>;

// generate_sample
export const GenerateSampleInputSchema = z.object({
  path: z.string().min(1).describe("API path"),
  method: z.enum(["get", "post", "put", "patch", "delete", "options", "head", "trace"]).describe("HTTP method"),
  includeOptional: z.boolean().optional().describe("Include optional fields in the sample (default: false)"),
});
export type GenerateSampleInput = z.infer<typeof GenerateSampleInputSchema>;

// get_auth_schemes (no input required)
export const GetAuthSchemesInputSchema = z.object({});
export type GetAuthSchemesInput = z.infer<typeof GetAuthSchemesInputSchema>;

// get_servers (no input required)
export const GetServersInputSchema = z.object({});
export type GetServersInput = z.infer<typeof GetServersInputSchema>;
