// MCP Response Types

export interface ToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  context?: Record<string, unknown>;
}

export function successResponse<T>(data: T): ToolResponse<T> {
  return { success: true, data };
}

export function errorResponse(error: string, code?: string, context?: Record<string, unknown>): ToolResponse<never> {
  return { success: false, error, code, context };
}

// List Endpoints Response
export interface ListEndpointsResponse {
  endpoints: EndpointSummary[];
  totalCount: number;
}

export interface EndpointSummary {
  path: string;
  method: string;
  operationId?: string;
  summary: string;
  tags: string[];
  deprecated: boolean;
}

// Endpoint Details Response
export interface EndpointDetailsResponse {
  path: string;
  method: string;
  operationId?: string;
  summary: string;
  description: string;
  tags: string[];
  deprecated: boolean;
  parameters: ParameterInfo[];
  requestBody?: RequestBodyInfo;
  responses: ResponseInfo[];
  security: SecurityInfo[];
}

export interface ParameterInfo {
  name: string;
  in: string;
  required: boolean;
  deprecated: boolean;
  description: string;
  schema: unknown;
  example?: unknown;
}

export interface RequestBodyInfo {
  required: boolean;
  description: string;
  contentTypes: string[];
  schema: unknown;
  example?: unknown;
}

export interface ResponseInfo {
  statusCode: string;
  description: string;
  contentTypes: string[];
  schema?: unknown;
  example?: unknown;
}

export interface SecurityInfo {
  schemes: string[];
  scopes: string[];
}

// Schema Response
export interface SchemaResponse {
  contentType: string;
  required: boolean;
  description: string;
  schema: unknown;
  example?: unknown;
}

// Validation Response
export interface ValidationResponse {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  params?: Record<string, unknown>;
}

// Sample Response
export interface SampleResponse {
  sample: unknown;
  contentType: string;
}

// Auth Schemes Response
export interface AuthSchemesResponse {
  schemes: AuthSchemeInfo[];
  globalSecurity: string[];
  endpointRequirements: Record<string, string[]>;
}

export interface AuthSchemeInfo {
  name: string;
  type: string;
  description?: string;
  in?: string;
  parameterName?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: unknown;
  openIdConnectUrl?: string;
}

// Servers Response
export interface ServersResponse {
  servers: ServerInfoResponse[];
}

export interface ServerInfoResponse {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariableInfo>;
}

export interface ServerVariableInfo {
  default: string;
  description?: string;
  enum?: string[];
}
