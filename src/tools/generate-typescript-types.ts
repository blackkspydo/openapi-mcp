// Tool: generate_typescript_types - Generate TypeScript types from OpenAPI schemas

import { specService } from "../openapi";
import { generateTypeScript, generateEndpointTypes } from "../openapi/typescript-generator";
import { successResponse, errorResponse } from "../types/mcp";
import { OpenAPIError } from "../utils/errors";

interface GenerateTypesInput {
  // Option 1: Generate from a named schema
  schemaName?: string;
  
  // Option 2: Generate from an endpoint
  path?: string;
  method?: string;
  
  // Options
  includeComments?: boolean;
}

export async function handleGenerateTypescriptTypes(input: GenerateTypesInput) {
  try {
    const spec = specService.getSpec();
    
    // Option 1: Generate from a named schema (from components/schemas or definitions)
    if (input.schemaName) {
      const schema = spec.schemas.get(input.schemaName);
      
      if (!schema) {
        const available = Array.from(spec.schemas.keys()).slice(0, 20);
        return errorResponse(
          `Schema "${input.schemaName}" not found`,
          "SCHEMA_NOT_FOUND",
          { 
            schemaName: input.schemaName,
            availableSchemas: available,
            totalSchemas: spec.schemas.size
          }
        );
      }
      
      const typescript = generateTypeScript(schema, {
        interfaceName: input.schemaName,
        includeComments: input.includeComments ?? true,
      });
      
      return successResponse({
        schemaName: input.schemaName,
        typescript,
      });
    }
    
    // Option 2: Generate from an endpoint (request + response types)
    if (input.path && input.method) {
      const endpoint = specService.getEndpoint(input.path, input.method);
      
      const requestSchema = specService.getRequestSchema(input.path, input.method);
      const responseSchema = specService.getResponseSchema(input.path, input.method, "200");
      
      const typescript = generateEndpointTypes(
        endpoint.operationId,
        input.path,
        input.method,
        requestSchema?.schema || null,
        responseSchema?.schema || null
      );
      
      if (!typescript) {
        return successResponse({
          path: input.path,
          method: input.method,
          message: "Endpoint has no request body or response schema",
          typescript: `// No types to generate for ${input.method.toUpperCase()} ${input.path}`,
        });
      }
      
      return successResponse({
        path: input.path,
        method: input.method,
        operationId: endpoint.operationId,
        typescript,
      });
    }
    
    // No valid input provided
    return errorResponse(
      "Either schemaName or both path and method must be provided",
      "INVALID_INPUT",
      { 
        hint: "Use schemaName to generate from a component schema, or path+method to generate endpoint types"
      }
    );
    
  } catch (error) {
    if (error instanceof OpenAPIError) {
      return errorResponse(error.message, error.code, error.context);
    }
    return errorResponse(`Failed to generate TypeScript types: ${(error as Error).message}`);
  }
}
