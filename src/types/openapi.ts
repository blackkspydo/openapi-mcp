// OpenAPI Types - Core type definitions for parsed OpenAPI specs

import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

export type OpenAPIDocument = OpenAPIV3.Document | OpenAPIV3_1.Document;
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "options" | "head" | "trace";

export interface ParsedSpec {
  raw: OpenAPIDocument;
  version: string;
  info: SpecInfo;
  servers: ServerInfo[];
  endpoints: Map<string, Endpoint>;
  schemas: Map<string, JsonSchema>;
  securitySchemes: SecurityScheme[];
  loadedAt: number;
  source: string;
}

export interface SpecInfo {
  title: string;
  description?: string;
  version: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export interface ServerInfo {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

export interface ServerVariable {
  default: string;
  description?: string;
  enum?: string[];
}

export interface Endpoint {
  path: string;
  method: HttpMethod;
  operationId?: string;
  summary: string;
  description: string;
  tags: string[];
  deprecated: boolean;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Map<string, ResponseDefinition>;
  security: SecurityRequirement[];
}

export interface Parameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  deprecated: boolean;
  schema: JsonSchema;
  description: string;
  example?: unknown;
}

export interface RequestBody {
  required: boolean;
  description: string;
  content: Map<string, MediaType>;
}

export interface MediaType {
  schema: JsonSchema;
  example?: unknown;
  examples?: Map<string, ExampleObject>;
}

export interface ExampleObject {
  summary?: string;
  description?: string;
  value: unknown;
}

export interface ResponseDefinition {
  statusCode: string;
  description: string;
  content?: Map<string, MediaType>;
  headers?: Record<string, Parameter>;
}

export interface SecurityScheme {
  name: string;
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  description?: string;
  // For apiKey
  in?: "query" | "header" | "cookie";
  parameterName?: string;
  // For http
  scheme?: string;
  bearerFormat?: string;
  // For oauth2
  flows?: OAuthFlows;
  // For openIdConnect
  openIdConnectUrl?: string;
}

export interface OAuthFlows {
  implicit?: OAuthFlow;
  password?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  authorizationCode?: OAuthFlow;
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface SecurityRequirement {
  [schemeName: string]: string[];
}

// JSON Schema (simplified for OpenAPI usage)
export interface JsonSchema {
  type?: string | string[];
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  example?: unknown;
  enum?: unknown[];
  const?: unknown;
  
  // Object
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  
  // Array
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  
  // String
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  
  // Number
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  
  // Composition
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  not?: JsonSchema;
  
  // Nullable (OpenAPI 3.0)
  nullable?: boolean;
  
  // Discriminator
  discriminator?: {
    propertyName: string;
    mapping?: Record<string, string>;
  };
  
  // Allow additional properties for extensions
  [key: string]: unknown;
}
