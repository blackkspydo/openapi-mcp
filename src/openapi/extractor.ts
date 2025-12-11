// Schema Extractor - Extract endpoints, parameters, schemas from OpenAPI spec

import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import type {
  OpenAPIDocument,
  ParsedSpec,
  Endpoint,
  Parameter,
  RequestBody,
  ResponseDefinition,
  MediaType,
  HttpMethod,
  JsonSchema,
  SecurityScheme,
  ServerInfo,
  SpecInfo,
} from "../types/openapi";
import { createEndpointKey, normalizeMethod, isPlainObject } from "../utils/helpers";
import { logger } from "../utils/logger";

type OperationObject = OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
type ParameterObject = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;
type RequestBodyObject = OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject;
type ResponseObject = OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject;
type MediaTypeObject = OpenAPIV3.MediaTypeObject | OpenAPIV3_1.MediaTypeObject;
type SchemaObject = OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject;
type SecuritySchemeObject = OpenAPIV3.SecuritySchemeObject | OpenAPIV3_1.SecuritySchemeObject;

const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "patch", "delete", "options", "head", "trace"];

/**
 * Extract spec info
 */
function extractSpecInfo(doc: OpenAPIDocument): SpecInfo {
  return {
    title: doc.info.title,
    description: doc.info.description,
    version: doc.info.version,
    termsOfService: doc.info.termsOfService,
    contact: doc.info.contact,
    license: doc.info.license,
  };
}

/**
 * Extract server information
 */
function extractServers(doc: OpenAPIDocument): ServerInfo[] {
  const servers = (doc as OpenAPIV3.Document).servers || [];
  return servers.map((server) => ({
    url: server.url,
    description: server.description,
    variables: server.variables as ServerInfo["variables"],
  }));
}

/**
 * Convert schema object to JsonSchema
 */
function toJsonSchema(schema: SchemaObject | undefined): JsonSchema {
  if (!schema) return {};
  // The schema is already dereferenced by swagger-parser
  return schema as JsonSchema;
}

/**
 * Extract parameter from OpenAPI parameter object
 */
function extractParameter(param: ParameterObject): Parameter {
  return {
    name: param.name,
    in: param.in as Parameter["in"],
    required: param.required ?? false,
    deprecated: param.deprecated ?? false,
    schema: toJsonSchema(param.schema as SchemaObject),
    description: param.description ?? "",
    example: param.example,
  };
}

/**
 * Extract media type from OpenAPI media type object
 */
function extractMediaType(mediaType: MediaTypeObject): MediaType {
  let examples: Map<string, { summary?: string; description?: string; value: unknown }> | undefined;
  
  if (mediaType.examples) {
    examples = new Map();
    for (const [k, v] of Object.entries(mediaType.examples)) {
      if (isPlainObject(v) && "value" in v) {
        examples.set(k, {
          summary: (v as { summary?: string }).summary,
          description: (v as { description?: string }).description,
          value: (v as { value: unknown }).value,
        });
      }
    }
  }
  
  return {
    schema: toJsonSchema(mediaType.schema as SchemaObject),
    example: mediaType.example,
    examples,
  };
}

/**
 * Extract request body from OpenAPI request body object
 */
function extractRequestBody(reqBody: RequestBodyObject): RequestBody {
  const content = new Map<string, MediaType>();
  if (reqBody.content) {
    for (const [contentType, mediaType] of Object.entries(reqBody.content)) {
      content.set(contentType, extractMediaType(mediaType));
    }
  }
  return {
    required: reqBody.required ?? false,
    description: reqBody.description ?? "",
    content,
  };
}

/**
 * Extract response from OpenAPI response object
 */
function extractResponse(statusCode: string, response: ResponseObject): ResponseDefinition {
  const content = new Map<string, MediaType>();
  if (response.content) {
    for (const [contentType, mediaType] of Object.entries(response.content)) {
      content.set(contentType, extractMediaType(mediaType));
    }
  }
  return {
    statusCode,
    description: response.description ?? "",
    content: content.size > 0 ? content : undefined,
  };
}

/**
 * Extract endpoint from path and operation
 */
function extractEndpoint(
  path: string,
  method: HttpMethod,
  operation: OperationObject,
  pathParams: ParameterObject[]
): Endpoint {
  // Merge path-level and operation-level parameters
  const opParams = (operation.parameters || []) as ParameterObject[];
  const allParams = [...pathParams, ...opParams];
  
  // Deduplicate by name + in
  const paramMap = new Map<string, ParameterObject>();
  for (const param of allParams) {
    const key = `${param.in}:${param.name}`;
    paramMap.set(key, param);
  }
  
  // Extract responses
  const responses = new Map<string, ResponseDefinition>();
  if (operation.responses) {
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (isPlainObject(response)) {
        responses.set(statusCode, extractResponse(statusCode, response as ResponseObject));
      }
    }
  }

  return {
    path,
    method,
    operationId: operation.operationId,
    summary: operation.summary ?? "",
    description: operation.description ?? "",
    tags: operation.tags ?? [],
    deprecated: operation.deprecated ?? false,
    parameters: Array.from(paramMap.values()).map(extractParameter),
    requestBody: operation.requestBody ? extractRequestBody(operation.requestBody as RequestBodyObject) : undefined,
    responses,
    security: operation.security ?? [],
  };
}

/**
 * Extract security schemes from components
 */
function extractSecuritySchemes(doc: OpenAPIDocument): SecurityScheme[] {
  const components = (doc as OpenAPIV3.Document).components;
  if (!components?.securitySchemes) return [];

  const schemes: SecurityScheme[] = [];
  for (const [name, scheme] of Object.entries(components.securitySchemes)) {
    if (!isPlainObject(scheme)) continue;
    const s = scheme as SecuritySchemeObject;
    schemes.push({
      name,
      type: s.type as SecurityScheme["type"],
      description: s.description,
      in: (s as OpenAPIV3.ApiKeySecurityScheme).in as SecurityScheme["in"],
      parameterName: (s as OpenAPIV3.ApiKeySecurityScheme).name,
      scheme: (s as OpenAPIV3.HttpSecurityScheme).scheme,
      bearerFormat: (s as OpenAPIV3.HttpSecurityScheme).bearerFormat,
      flows: (s as OpenAPIV3.OAuth2SecurityScheme).flows,
      openIdConnectUrl: (s as OpenAPIV3.OpenIdSecurityScheme).openIdConnectUrl,
    });
  }
  return schemes;
}

/**
 * Extract all component schemas
 */
function extractSchemas(doc: OpenAPIDocument): Map<string, JsonSchema> {
  const components = (doc as OpenAPIV3.Document).components;
  if (!components?.schemas) return new Map();

  const schemas = new Map<string, JsonSchema>();
  for (const [name, schema] of Object.entries(components.schemas)) {
    schemas.set(name, toJsonSchema(schema as SchemaObject));
  }
  return schemas;
}

/**
 * Build a ParsedSpec from an OpenAPI document
 */
export function buildParsedSpec(document: OpenAPIDocument, source: string): ParsedSpec {
  const endpoints = new Map<string, Endpoint>();

  // Extract all endpoints
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    if (!pathItem || !isPlainObject(pathItem)) continue;

    // Get path-level parameters
    const pathParams = ((pathItem as OpenAPIV3.PathItemObject).parameters || []) as ParameterObject[];

    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, unknown>)[method] as OperationObject | undefined;
      if (!operation) continue;

      const endpoint = extractEndpoint(path, method, operation, pathParams);
      const key = createEndpointKey(method, path);
      endpoints.set(key, endpoint);
    }
  }

  const version = (document as { openapi?: string; swagger?: string }).openapi 
    || (document as { openapi?: string; swagger?: string }).swagger 
    || "unknown";

  logger.info("Built parsed spec", { 
    endpointCount: endpoints.size,
    version 
  });

  return {
    raw: document,
    version,
    info: extractSpecInfo(document),
    servers: extractServers(document),
    endpoints,
    schemas: extractSchemas(document),
    securitySchemes: extractSecuritySchemes(document),
    loadedAt: Date.now(),
    source,
  };
}
