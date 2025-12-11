// Tool: load_spec - Load an OpenAPI specification

import { specService } from "../openapi";
import { successResponse, errorResponse } from "../types/mcp";
import type { LoadSpecInput } from "../types/tools";
import { OpenAPIError } from "../utils/errors";

export async function handleLoadSpec(input: LoadSpecInput) {
  try {
    const spec = await specService.loadSpec({
      url: input.url,
      filePath: input.filePath,
    });

    return successResponse({
      message: "OpenAPI spec loaded successfully",
      title: spec.info.title,
      version: spec.info.version,
      openApiVersion: spec.version,
      endpointCount: spec.endpoints.size,
      schemaCount: spec.schemas.size,
      source: spec.source,
    });
  } catch (error) {
    if (error instanceof OpenAPIError) {
      return errorResponse(error.message, error.code, error.context);
    }
    return errorResponse(`Failed to load spec: ${(error as Error).message}`);
  }
}
