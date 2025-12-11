// Schema Extractor - Extract endpoints, parameters, schemas from OpenAPI spec
// Supports both OpenAPI 3.x and OpenAPI 2.0 (Swagger)

import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
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
import { createEndpointKey, isPlainObject } from "../utils/helpers";
import { logger } from "../utils/logger";

type OperationObject = OpenAPIV2.OperationObject | OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
type SchemaObject = OpenAPIV2.SchemaObject | OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject;

const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "patch", "delete", "options", "head", "trace"];

/**
 * Check if document is OpenAPI 2.0 (Swagger)
 */
function isSwagger2(doc: OpenAPIDocument): boolean {
  return "swagger" in doc && (doc as unknown as { swagger?: string }).swagger === "2.0";
}

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
 * Extract server information (handles both 2.0 and 3.x)
 */
function extractServers(doc: OpenAPIDocument): ServerInfo[] {
  if (isSwagger2(doc)) {
    // OpenAPI 2.0: construct from host, basePath, schemes
    const v2Doc = doc as unknown as OpenAPIV2.Document;
    const host = v2Doc.host || "localhost";
    const basePath = v2Doc.basePath || "";
    const schemes = v2Doc.schemes || ["https"];
    
    return schemes.map((scheme) => ({
      url: `${scheme}://${host}${basePath}`,
      description: `${scheme.toUpperCase()} server`,
    }));
  }
  
  // OpenAPI 3.x
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
  return schema as JsonSchema;
}

/**
 * Extract parameter from OpenAPI parameter object (both 2.0 and 3.x)
 */
function extractParameter(param: OpenAPIV2.Parameter | OpenAPIV3.ParameterObject): Parameter {
  // OpenAPI 2.0 has schema inline or in 'schema' property
  let schema: JsonSchema;
  
  if ("schema" in param && param.schema) {
    schema = toJsonSchema(param.schema as SchemaObject);
  } else if (isSwagger2Param(param)) {
    // OpenAPI 2.0 inline schema properties
    schema = {
      type: param.type,
      format: param.format,
      enum: param.enum,
      default: param.default,
      minimum: param.minimum,
      maximum: param.maximum,
      items: param.items as JsonSchema,
    };
  } else {
    schema = {};
  }
  
  return {
    name: param.name,
    in: param.in as Parameter["in"],
    required: param.required ?? false,
    deprecated: ("deprecated" in param ? param.deprecated : false) ?? false,
    schema,
    description: param.description ?? "",
    example: "example" in param ? param.example : undefined,
  };
}

function isSwagger2Param(param: unknown): param is OpenAPIV2.GeneralParameterObject {
  return isPlainObject(param) && "type" in param;
}

/**
 * Extract request body from OpenAPI 2.0 body parameter
 */
function extractRequestBodyFromSwagger2(params: OpenAPIV2.Parameter[]): RequestBody | undefined {
  const bodyParam = params.find(p => p.in === "body") as OpenAPIV2.InBodyParameterObject | undefined;
  if (!bodyParam) return undefined;
  
  const content = new Map<string, MediaType>();
  content.set("application/json", {
    schema: toJsonSchema(bodyParam.schema as SchemaObject),
    example: undefined,
  });
  
  return {
    required: bodyParam.required ?? false,
    description: bodyParam.description ?? "",
    content,
  };
}

/**
 * Extract request body from OpenAPI 3.x
 */
function extractRequestBodyFromV3(reqBody: OpenAPIV3.RequestBodyObject): RequestBody {
  const content = new Map<string, MediaType>();
  if (reqBody.content) {
    for (const [contentType, mediaType] of Object.entries(reqBody.content)) {
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
      
      content.set(contentType, {
        schema: toJsonSchema(mediaType.schema as SchemaObject),
        example: mediaType.example,
        examples,
      });
    }
  }
  return {
    required: reqBody.required ?? false,
    description: reqBody.description ?? "",
    content,
  };
}

/**
 * Extract response from OpenAPI response object (both 2.0 and 3.x)
 */
function extractResponse(statusCode: string, response: OpenAPIV2.ResponseObject | OpenAPIV3.ResponseObject, isV2: boolean): ResponseDefinition {
  const content = new Map<string, MediaType>();
  
  if (isV2) {
    // OpenAPI 2.0: schema is directly on response
    const v2Response = response as OpenAPIV2.ResponseObject;
    if (v2Response.schema) {
      content.set("application/json", {
        schema: toJsonSchema(v2Response.schema as SchemaObject),
        example: v2Response.examples?.["application/json"],
      });
    }
  } else {
    // OpenAPI 3.x: schema is in content[mediaType].schema
    const v3Response = response as OpenAPIV3.ResponseObject;
    if (v3Response.content) {
      for (const [contentType, mediaType] of Object.entries(v3Response.content)) {
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
        
        content.set(contentType, {
          schema: toJsonSchema(mediaType.schema as SchemaObject),
          example: mediaType.example,
          examples,
        });
      }
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
  pathParams: (OpenAPIV2.Parameter | OpenAPIV3.ParameterObject)[],
  isV2: boolean
): Endpoint {
  // Merge path-level and operation-level parameters
  const opParams = (operation.parameters || []) as (OpenAPIV2.Parameter | OpenAPIV3.ParameterObject)[];
  const allParams = [...pathParams, ...opParams];
  
  // Separate body params from other params (for OpenAPI 2.0)
  const nonBodyParams = allParams.filter(p => p.in !== "body");
  
  // Deduplicate by name + in
  const paramMap = new Map<string, OpenAPIV2.Parameter | OpenAPIV3.ParameterObject>();
  for (const param of nonBodyParams) {
    const key = `${param.in}:${param.name}`;
    paramMap.set(key, param);
  }
  
  // Extract responses
  const responses = new Map<string, ResponseDefinition>();
  if (operation.responses) {
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (isPlainObject(response) && "description" in response) {
        responses.set(statusCode, extractResponse(statusCode, response as unknown as OpenAPIV2.ResponseObject | OpenAPIV3.ResponseObject, isV2));
      }
    }
  }
  
  // Extract request body
  let requestBody: RequestBody | undefined;
  if (isV2) {
    requestBody = extractRequestBodyFromSwagger2(allParams as OpenAPIV2.Parameter[]);
  } else if ((operation as OpenAPIV3.OperationObject).requestBody) {
    requestBody = extractRequestBodyFromV3((operation as OpenAPIV3.OperationObject).requestBody as OpenAPIV3.RequestBodyObject);
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
    requestBody,
    responses,
    security: operation.security ?? [],
  };
}

/**
 * Extract security schemes (handles both 2.0 and 3.x)
 */
function extractSecuritySchemes(doc: OpenAPIDocument): SecurityScheme[] {
  const schemes: SecurityScheme[] = [];
  
  if (isSwagger2(doc)) {
    // OpenAPI 2.0: securityDefinitions
    const v2Doc = doc as unknown as OpenAPIV2.Document;
    const secDefs = v2Doc.securityDefinitions || {};
    for (const [name, scheme] of Object.entries(secDefs)) {
      const s = scheme as OpenAPIV2.SecuritySchemeObject;
      schemes.push({
        name,
        type: s.type as SecurityScheme["type"],
        description: s.description,
        in: (s as OpenAPIV2.SecuritySchemeApiKey).in as SecurityScheme["in"],
        parameterName: (s as OpenAPIV2.SecuritySchemeApiKey).name,
        scheme: undefined, // Not in 2.0
        bearerFormat: undefined, // Not in 2.0
        flows: (s as OpenAPIV2.SecuritySchemeOauth2).flow ? {
          // Convert 2.0 flow to 3.x format (simplified)
          [(s as OpenAPIV2.SecuritySchemeOauth2).flow as string]: {
            authorizationUrl: (s as OpenAPIV2.SecuritySchemeOauth2AccessCode).authorizationUrl,
            tokenUrl: (s as OpenAPIV2.SecuritySchemeOauth2AccessCode).tokenUrl,
            scopes: (s as OpenAPIV2.SecuritySchemeOauth2).scopes || {},
          }
        } : undefined,
      });
    }
  } else {
    // OpenAPI 3.x: components.securitySchemes
    const components = (doc as OpenAPIV3.Document).components;
    if (components?.securitySchemes) {
      for (const [name, scheme] of Object.entries(components.securitySchemes)) {
        if (!isPlainObject(scheme)) continue;
        const s = scheme as OpenAPIV3.SecuritySchemeObject;
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
    }
  }
  
  return schemes;
}

/**
 * Extract all component schemas (handles both 2.0 and 3.x)
 */
function extractSchemas(doc: OpenAPIDocument): Map<string, JsonSchema> {
  const schemas = new Map<string, JsonSchema>();
  
  if (isSwagger2(doc)) {
    // OpenAPI 2.0: definitions
    const v2Doc = doc as unknown as OpenAPIV2.Document;
    const defs = v2Doc.definitions || {};
    for (const [name, schema] of Object.entries(defs)) {
      schemas.set(name, toJsonSchema(schema as SchemaObject));
    }
  } else {
    // OpenAPI 3.x: components.schemas
    const components = (doc as OpenAPIV3.Document).components;
    if (components?.schemas) {
      for (const [name, schema] of Object.entries(components.schemas)) {
        schemas.set(name, toJsonSchema(schema as SchemaObject));
      }
    }
  }
  
  return schemas;
}

/**
 * Build a ParsedSpec from an OpenAPI document
 */
export function buildParsedSpec(document: OpenAPIDocument, source: string): ParsedSpec {
  const isV2 = isSwagger2(document);
  const endpoints = new Map<string, Endpoint>();

  // Extract all endpoints
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    if (!pathItem || !isPlainObject(pathItem)) continue;

    // Get path-level parameters
    const pathParams = (pathItem.parameters || []) as (OpenAPIV2.Parameter | OpenAPIV3.ParameterObject)[];

    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, unknown>)[method] as OperationObject | undefined;
      if (!operation) continue;

      const endpoint = extractEndpoint(path, method, operation, pathParams, isV2);
      const key = createEndpointKey(method, path);
      endpoints.set(key, endpoint);
    }
  }

  const version = (document as { openapi?: string; swagger?: string }).openapi 
    || (document as { openapi?: string; swagger?: string }).swagger 
    || "unknown";

  logger.info("Built parsed spec", { 
    endpointCount: endpoints.size,
    version,
    isSwagger2: isV2,
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
