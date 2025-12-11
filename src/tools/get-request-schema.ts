// Tool: get_request_schema - Get request body schema for an endpoint

import { specService } from "../openapi";
import { successResponse, errorResponse } from "../types/mcp";
import type { GetRequestSchemaInput } from "../types/tools";
import type { SchemaResponse } from "../types/mcp";
import { OpenAPIError, SchemaNotFoundError } from "../utils/errors";

export async function handleGetRequestSchema(input: GetRequestSchemaInput) {
  try {
    const result = specService.getRequestSchema(input.path, input.method);

    if (!result) {
      return successResponse({
        hasRequestBody: false,
        message: `Endpoint ${input.method.toUpperCase()} ${input.path} does not have a request body`,
      });
    }

    const response: SchemaResponse = {
      contentType: result.contentType,
      required: result.required,
      description: result.description,
      schema: result.schema,
    };

    return successResponse(response);
  } catch (error) {
    if (error instanceof OpenAPIError) {
      return errorResponse(error.message, error.code, error.context);
    }
    return errorResponse(`Failed to get request schema: ${(error as Error).message}`);
  }
}
