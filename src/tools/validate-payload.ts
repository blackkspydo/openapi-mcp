// Tool: validate_payload - Validate a payload against request schema

import { specService, validatePayload } from "../openapi";
import { successResponse, errorResponse } from "../types/mcp";
import type { ValidatePayloadInput } from "../types/tools";
import type { ValidationResponse } from "../types/mcp";
import { OpenAPIError } from "../utils/errors";

export async function handleValidatePayload(input: ValidatePayloadInput) {
  try {
    const schemaResult = specService.getRequestSchema(input.path, input.method);

    if (!schemaResult) {
      return errorResponse(
        `Endpoint ${input.method.toUpperCase()} ${input.path} does not have a request body`,
        "NO_REQUEST_BODY",
        { path: input.path, method: input.method }
      );
    }

    // Parse payload if it's a JSON string
    let payload = input.payload;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        // Not valid JSON, keep as string (will likely fail validation)
      }
    }

    const result = validatePayload(payload, schemaResult.schema);

    const response: ValidationResponse = {
      valid: result.valid,
      errors: result.errors,
    };

    return successResponse(response);
  } catch (error) {
    if (error instanceof OpenAPIError) {
      return errorResponse(error.message, error.code, error.context);
    }
    return errorResponse(`Failed to validate payload: ${(error as Error).message}`);
  }
}
