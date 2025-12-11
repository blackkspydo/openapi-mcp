// Tool: get_servers - Get available API servers

import { specService } from "../openapi";
import { successResponse, errorResponse } from "../types/mcp";
import type { ServersResponse, ServerInfoResponse } from "../types/mcp";
import { OpenAPIError } from "../utils/errors";

export async function handleGetServers() {
  try {
    const servers = specService.getServers();

    const serverInfos: ServerInfoResponse[] = servers.map((s) => ({
      url: s.url,
      description: s.description,
      variables: s.variables,
    }));

    const response: ServersResponse = {
      servers: serverInfos,
    };

    return successResponse(response);
  } catch (error) {
    if (error instanceof OpenAPIError) {
      return errorResponse(error.message, error.code, error.context);
    }
    return errorResponse(`Failed to get servers: ${(error as Error).message}`);
  }
}
