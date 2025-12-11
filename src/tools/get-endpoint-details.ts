// Tool: get_endpoint_details - Get detailed information about an endpoint

import { specService } from "../openapi";
import { successResponse, errorResponse } from "../types/mcp";
import type { GetEndpointDetailsInput } from "../types/tools";
import type { EndpointDetailsResponse, ParameterInfo, RequestBodyInfo, ResponseInfo, SecurityInfo } from "../types/mcp";
import { OpenAPIError } from "../utils/errors";

export async function handleGetEndpointDetails(input: GetEndpointDetailsInput) {
  try {
    const endpoint = specService.getEndpoint(input.path, input.method);

    // Transform parameters
    const parameters: ParameterInfo[] = endpoint.parameters.map((p) => ({
      name: p.name,
      in: p.in,
      required: p.required,
      deprecated: p.deprecated,
      description: p.description,
      schema: p.schema,
      example: p.example,
    }));

    // Transform request body
    let requestBody: RequestBodyInfo | undefined;
    if (endpoint.requestBody) {
      const contentTypes = Array.from(endpoint.requestBody.content.keys());
      const preferredType = contentTypes.includes("application/json") 
        ? "application/json" 
        : contentTypes[0];
      const mediaType = endpoint.requestBody.content.get(preferredType);

      requestBody = {
        required: endpoint.requestBody.required,
        description: endpoint.requestBody.description,
        contentTypes,
        schema: mediaType?.schema,
        example: mediaType?.example,
      };
    }

    // Transform responses
    const responses: ResponseInfo[] = [];
    for (const [statusCode, response] of endpoint.responses) {
      const contentTypes = response.content ? Array.from(response.content.keys()) : [];
      const preferredType = contentTypes.includes("application/json")
        ? "application/json"
        : contentTypes[0];
      const mediaType = response.content?.get(preferredType);

      responses.push({
        statusCode,
        description: response.description,
        contentTypes,
        schema: mediaType?.schema,
        example: mediaType?.example,
      });
    }

    // Transform security
    const security: SecurityInfo[] = endpoint.security.map((req) => ({
      schemes: Object.keys(req),
      scopes: Object.values(req).flat(),
    }));

    const response: EndpointDetailsResponse = {
      path: endpoint.path,
      method: endpoint.method.toUpperCase(),
      operationId: endpoint.operationId,
      summary: endpoint.summary,
      description: endpoint.description,
      tags: endpoint.tags,
      deprecated: endpoint.deprecated,
      parameters,
      requestBody,
      responses,
      security,
    };

    return successResponse(response);
  } catch (error) {
    if (error instanceof OpenAPIError) {
      return errorResponse(error.message, error.code, error.context);
    }
    return errorResponse(`Failed to get endpoint details: ${(error as Error).message}`);
  }
}
