// Tool: list_endpoints - List all API endpoints with optional filtering

import { specService } from "../openapi";
import { successResponse, errorResponse } from "../types/mcp";
import type { ListEndpointsInput } from "../types/tools";
import type { ListEndpointsResponse, EndpointSummary } from "../types/mcp";
import { OpenAPIError } from "../utils/errors";
import { compareEndpoints } from "../utils/helpers";

export async function handleListEndpoints(input: ListEndpointsInput) {
  try {
    const endpoints = specService.getEndpoints();
    const results: EndpointSummary[] = [];

    for (const endpoint of endpoints.values()) {
      // Apply tag filter
      if (input.tag && !endpoint.tags.includes(input.tag)) {
        continue;
      }

      // Apply method filter
      if (input.method && endpoint.method !== input.method) {
        continue;
      }

      // Apply deprecated filter (default: include deprecated)
      if (input.deprecated === false && endpoint.deprecated) {
        continue;
      }

      results.push({
        path: endpoint.path,
        method: endpoint.method.toUpperCase(),
        operationId: endpoint.operationId,
        summary: endpoint.summary,
        tags: endpoint.tags,
        deprecated: endpoint.deprecated,
      });
    }

    // Sort by path, then method
    results.sort(compareEndpoints);

    // Apply limit
    const limited = input.limit ? results.slice(0, input.limit) : results;

    const response: ListEndpointsResponse = {
      endpoints: limited,
      totalCount: results.length,
    };

    return successResponse(response);
  } catch (error) {
    if (error instanceof OpenAPIError) {
      return errorResponse(error.message, error.code, error.context);
    }
    return errorResponse(`Failed to list endpoints: ${(error as Error).message}`);
  }
}
