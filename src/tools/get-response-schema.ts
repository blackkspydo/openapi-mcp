// Tool: get_response_schema - Get response schema for an endpoint

import { specService } from "../openapi";
import { successResponse, errorResponse } from "../types/mcp";
import type { GetResponseSchemaInput } from "../types/tools";
import { OpenAPIError } from "../utils/errors";

export async function handleGetResponseSchema(input: GetResponseSchemaInput) {
  try {
    const statusCode = input.statusCode ?? "200";
    const result = specService.getResponseSchema(input.path, input.method, statusCode);

    if (!result) {
      return successResponse({
        hasResponseBody: false,
        message: `No response schema found for ${input.method.toUpperCase()} ${input.path} with status ${statusCode}`,
      });
    }

    return successResponse({
      statusCode: result.statusCode,
      contentType: result.contentType,
      description: result.description,
      schema: result.schema,
    });
  } catch (error) {
    if (error instanceof OpenAPIError) {
      return errorResponse(error.message, error.code, error.context);
    }
    return errorResponse(`Failed to get response schema: ${(error as Error).message}`);
  }
}
