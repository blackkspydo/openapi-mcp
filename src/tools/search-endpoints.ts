// Tool: search_endpoints - Search endpoints by keyword

import { specService } from "../openapi";
import { successResponse, errorResponse } from "../types/mcp";
import type { SearchEndpointsInput } from "../types/tools";
import type { ListEndpointsResponse, EndpointSummary } from "../types/mcp";
import { OpenAPIError } from "../utils/errors";

export async function handleSearchEndpoints(input: SearchEndpointsInput) {
  try {
    const endpoints = specService.getEndpoints();
    const results: EndpointSummary[] = [];
    const query = input.query.toLowerCase();

    for (const endpoint of endpoints.values()) {
      // Search in path, summary, description, operationId
      const searchText = [
        endpoint.path,
        endpoint.summary,
        endpoint.description,
        endpoint.operationId || "",
        ...endpoint.tags,
      ]
        .join(" ")
        .toLowerCase();

      if (searchText.includes(query)) {
        results.push({
          path: endpoint.path,
          method: endpoint.method.toUpperCase(),
          operationId: endpoint.operationId,
          summary: endpoint.summary,
          tags: endpoint.tags,
          deprecated: endpoint.deprecated,
        });
      }
    }

    // Apply limit
    const limit = input.limit ?? 20;
    const limited = results.slice(0, limit);

    const response: ListEndpointsResponse = {
      endpoints: limited,
      totalCount: results.length,
    };

    return successResponse(response);
  } catch (error) {
    if (error instanceof OpenAPIError) {
      return errorResponse(error.message, error.code, error.context);
    }
    return errorResponse(`Failed to search endpoints: ${(error as Error).message}`);
  }
}
