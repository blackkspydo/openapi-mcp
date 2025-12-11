// SpecService - Singleton service managing the loaded OpenAPI spec

import { loadAndDereferenceSpec, type LoadOptions } from "./loader";
import { buildParsedSpec } from "./extractor";
import { specCache } from "./cache";
import type { ParsedSpec, Endpoint, JsonSchema } from "../types/openapi";
import { SpecNotLoadedError, EndpointNotFoundError } from "../utils/errors";
import { createEndpointKey, normalizeMethod, normalizePath, matchesStatusCode } from "../utils/helpers";
import { logger } from "../utils/logger";

const CACHE_KEY = "current_spec";

class SpecService {
  private currentSpec: ParsedSpec | null = null;

  /**
   * Load and parse an OpenAPI spec
   */
  async loadSpec(options: LoadOptions): Promise<ParsedSpec> {
    // Check cache first
    const cached = specCache.get(CACHE_KEY);
    if (cached && cached.source === (options.url || options.filePath)) {
      logger.info("Using cached spec", { source: cached.source });
      this.currentSpec = cached;
      return cached;
    }

    // Load and dereference
    const { document, source } = await loadAndDereferenceSpec(options);

    // Build parsed spec
    const spec = buildParsedSpec(document, source);

    // Cache it
    specCache.set(CACHE_KEY, spec);
    this.currentSpec = spec;

    return spec;
  }

  /**
   * Get the currently loaded spec
   */
  getSpec(): ParsedSpec {
    if (!this.currentSpec) {
      throw new SpecNotLoadedError();
    }
    return this.currentSpec;
  }

  /**
   * Check if a spec is loaded
   */
  isLoaded(): boolean {
    return this.currentSpec !== null;
  }

  /**
   * Get all endpoints
   */
  getEndpoints(): Map<string, Endpoint> {
    return this.getSpec().endpoints;
  }

  /**
   * Get a specific endpoint
   */
  getEndpoint(path: string, method: string): Endpoint {
    const key = createEndpointKey(method, path);
    const endpoint = this.getSpec().endpoints.get(key);
    if (!endpoint) {
      throw new EndpointNotFoundError(normalizePath(path), normalizeMethod(method));
    }
    return endpoint;
  }

  /**
   * Get request schema for an endpoint
   */
  getRequestSchema(path: string, method: string, preferredContentType = "application/json"): {
    schema: JsonSchema;
    contentType: string;
    required: boolean;
    description: string;
  } | null {
    const endpoint = this.getEndpoint(path, method);
    if (!endpoint.requestBody) return null;

    const { content, required, description } = endpoint.requestBody;

    // Try preferred content type first
    let mediaType = content.get(preferredContentType);
    let contentType = preferredContentType;

    // Fall back to first available
    if (!mediaType && content.size > 0) {
      const [firstType, firstMedia] = content.entries().next().value as [string, { schema: JsonSchema }];
      mediaType = firstMedia;
      contentType = firstType;
    }

    if (!mediaType) return null;

    return {
      schema: mediaType.schema,
      contentType,
      required,
      description,
    };
  }

  /**
   * Get response schema for an endpoint
   */
  getResponseSchema(path: string, method: string, statusCode: string, preferredContentType = "application/json"): {
    schema: JsonSchema;
    contentType: string;
    description: string;
    statusCode: string;
  } | null {
    const endpoint = this.getEndpoint(path, method);
    const { responses } = endpoint;

    // Try exact match first
    let response = responses.get(statusCode);
    let matchedCode = statusCode;

    // Try range match (e.g., "2XX")
    if (!response) {
      for (const [code, resp] of responses) {
        if (matchesStatusCode(statusCode, code)) {
          response = resp;
          matchedCode = code;
          break;
        }
      }
    }

    // Try default
    if (!response) {
      response = responses.get("default");
      matchedCode = "default";
    }

    if (!response || !response.content) return null;

    // Get media type
    let mediaType = response.content.get(preferredContentType);
    let contentType = preferredContentType;

    if (!mediaType && response.content.size > 0) {
      const [firstType, firstMedia] = response.content.entries().next().value as [string, { schema: JsonSchema }];
      mediaType = firstMedia;
      contentType = firstType;
    }

    if (!mediaType) return null;

    return {
      schema: mediaType.schema,
      contentType,
      description: response.description,
      statusCode: matchedCode,
    };
  }

  /**
   * Get security schemes
   */
  getSecuritySchemes() {
    return this.getSpec().securitySchemes;
  }

  /**
   * Get servers
   */
  getServers() {
    return this.getSpec().servers;
  }

  /**
   * Get global security requirements
   */
  getGlobalSecurity() {
    return this.getSpec().raw.security || [];
  }

  /**
   * Clear the current spec
   */
  clear(): void {
    this.currentSpec = null;
    specCache.clear();
    logger.info("Spec cleared");
  }
}

// Singleton instance
export const specService = new SpecService();
