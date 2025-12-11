// Tool: get_auth_schemes - Get authentication schemes

import { specService } from "../openapi";
import { successResponse, errorResponse } from "../types/mcp";
import type { AuthSchemesResponse, AuthSchemeInfo } from "../types/mcp";
import { OpenAPIError } from "../utils/errors";

export async function handleGetAuthSchemes() {
  try {
    const schemes = specService.getSecuritySchemes();
    const globalSecurity = specService.getGlobalSecurity();
    const endpoints = specService.getEndpoints();

    // Transform schemes
    const schemeInfos: AuthSchemeInfo[] = schemes.map((s) => ({
      name: s.name,
      type: s.type,
      description: s.description,
      in: s.in,
      parameterName: s.parameterName,
      scheme: s.scheme,
      bearerFormat: s.bearerFormat,
      flows: s.flows,
      openIdConnectUrl: s.openIdConnectUrl,
    }));

    // Build endpoint requirements map
    const endpointRequirements: Record<string, string[]> = {};
    for (const [key, endpoint] of endpoints) {
      const security = endpoint.security.length > 0 
        ? endpoint.security 
        : globalSecurity;
      
      const schemeNames = security.flatMap((req) => Object.keys(req));
      endpointRequirements[`${endpoint.method.toUpperCase()} ${endpoint.path}`] = schemeNames;
    }

    // Extract global security scheme names
    const globalSchemeNames = globalSecurity.flatMap((req) => Object.keys(req));

    const response: AuthSchemesResponse = {
      schemes: schemeInfos,
      globalSecurity: globalSchemeNames,
      endpointRequirements,
    };

    return successResponse(response);
  } catch (error) {
    if (error instanceof OpenAPIError) {
      return errorResponse(error.message, error.code, error.context);
    }
    return errorResponse(`Failed to get auth schemes: ${(error as Error).message}`);
  }
}
