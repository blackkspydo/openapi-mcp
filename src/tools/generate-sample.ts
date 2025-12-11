// Tool: generate_sample - Generate sample request payload

import { specService, generateSample } from "../openapi";
import { successResponse, errorResponse } from "../types/mcp";
import type { GenerateSampleInput } from "../types/tools";
import type { SampleResponse } from "../types/mcp";
import { OpenAPIError } from "../utils/errors";

export async function handleGenerateSample(input: GenerateSampleInput) {
  try {
    const schemaResult = specService.getRequestSchema(input.path, input.method);

    if (!schemaResult) {
      return errorResponse(
        `Endpoint ${input.method.toUpperCase()} ${input.path} does not have a request body`,
        "NO_REQUEST_BODY",
        { path: input.path, method: input.method }
      );
    }

    const sample = generateSample(schemaResult.schema, {
      includeOptional: input.includeOptional ?? false,
    });

    const response: SampleResponse = {
      sample,
      contentType: schemaResult.contentType,
    };

    return successResponse(response);
  } catch (error) {
    if (error instanceof OpenAPIError) {
      return errorResponse(error.message, error.code, error.context);
    }
    return errorResponse(`Failed to generate sample: ${(error as Error).message}`);
  }
}
