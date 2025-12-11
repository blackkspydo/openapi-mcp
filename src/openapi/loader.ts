// OpenAPI Spec Loader - Fetch and parse specs from URL or file

import SwaggerParser from "@apidevtools/swagger-parser";
import { parse as parseYaml } from "yaml";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { logger, SpecLoadError } from "../utils";
import type { OpenAPIDocument } from "../types/openapi";

const FETCH_TIMEOUT_MS = 30000;
const ALLOWED_PROTOCOLS = ["http:", "https:"];

export interface LoadOptions {
  url?: string;
  filePath?: string;
  timeout?: number;
}

export interface LoadResult {
  document: OpenAPIDocument;
  source: string;
}

/**
 * Validates a URL for safety
 */
function validateUrl(url: string): void {
  const parsed = new URL(url);
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new SpecLoadError(`Invalid URL protocol: ${parsed.protocol}`, { url });
  }
}

/**
 * Validates a file path for safety (prevent directory traversal)
 */
function validateFilePath(filePath: string): void {
  // Prevent directory traversal
  if (filePath.includes("..")) {
    throw new SpecLoadError("Directory traversal not allowed", { filePath });
  }
  if (!existsSync(filePath)) {
    throw new SpecLoadError(`File not found: ${filePath}`, { filePath });
  }
}

/**
 * Detect content type from path or content
 */
function isYaml(pathOrContent: string): boolean {
  const lowerPath = pathOrContent.toLowerCase();
  return lowerPath.endsWith(".yaml") || lowerPath.endsWith(".yml") || 
         lowerPath.trimStart().startsWith("openapi:") ||
         lowerPath.trimStart().startsWith("swagger:");
}

/**
 * Fetch spec from URL with timeout
 */
async function fetchFromUrl(url: string, timeout: number): Promise<string> {
  validateUrl(url);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    logger.info("Fetching OpenAPI spec from URL", { url });
    const response = await fetch(url, { signal: controller.signal });
    
    if (!response.ok) {
      throw new SpecLoadError(`HTTP ${response.status}: ${response.statusText}`, { 
        url, 
        status: response.status 
      });
    }
    
    return await response.text();
  } catch (error) {
    if (error instanceof SpecLoadError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new SpecLoadError(`Request timed out after ${timeout}ms`, { url });
    }
    throw new SpecLoadError(`Failed to fetch spec: ${(error as Error).message}`, { url });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Read spec from local file
 */
async function readFromFile(filePath: string): Promise<string> {
  validateFilePath(filePath);
  
  try {
    logger.info("Reading OpenAPI spec from file", { filePath });
    return await readFile(filePath, "utf-8");
  } catch (error) {
    throw new SpecLoadError(`Failed to read file: ${(error as Error).message}`, { filePath });
  }
}

/**
 * Parse raw content to JavaScript object
 */
function parseContent(content: string, source: string): unknown {
  try {
    // Try JSON first
    return JSON.parse(content);
  } catch {
    // Fall back to YAML
    if (isYaml(source) || isYaml(content)) {
      try {
        return parseYaml(content);
      } catch (yamlError) {
        throw new SpecLoadError(`Invalid YAML: ${(yamlError as Error).message}`, { source });
      }
    }
    throw new SpecLoadError("Content is neither valid JSON nor YAML", { source });
  }
}

/**
 * Load an OpenAPI spec from URL or file
 */
export async function loadSpec(options: LoadOptions): Promise<LoadResult> {
  const { url, filePath, timeout = FETCH_TIMEOUT_MS } = options;
  
  if (!url && !filePath) {
    throw new SpecLoadError("Either url or filePath must be provided");
  }
  
  const source = url || filePath!;
  let content: string;
  
  if (url) {
    content = await fetchFromUrl(url, timeout);
  } else {
    content = await readFromFile(filePath!);
  }
  
  // Parse content
  const rawDoc = parseContent(content, source);
  
  // Validate and dereference using swagger-parser
  try {
    logger.info("Validating and dereferencing OpenAPI spec");
    const document = await SwaggerParser.validate(rawDoc as OpenAPIDocument) as OpenAPIDocument;
    
    logger.info("OpenAPI spec loaded successfully", { 
      title: document.info?.title,
      version: document.info?.version,
      openApiVersion: (document as { openapi?: string; swagger?: string }).openapi || (document as { openapi?: string; swagger?: string }).swagger
    });
    
    return { document, source };
  } catch (error) {
    throw new SpecLoadError(`Invalid OpenAPI spec: ${(error as Error).message}`, { source });
  }
}

/**
 * Load and fully dereference an OpenAPI spec (resolves all $refs)
 */
export async function loadAndDereferenceSpec(options: LoadOptions): Promise<LoadResult> {
  const { url, filePath, timeout = FETCH_TIMEOUT_MS } = options;
  
  if (!url && !filePath) {
    throw new SpecLoadError("Either url or filePath must be provided");
  }
  
  const source = url || filePath!;
  let content: string;
  
  if (url) {
    content = await fetchFromUrl(url, timeout);
  } else {
    content = await readFromFile(filePath!);
  }
  
  // Parse content
  const rawDoc = parseContent(content, source);
  
  // Validate first
  try {
    await SwaggerParser.validate(structuredClone(rawDoc) as OpenAPIDocument);
  } catch (error) {
    throw new SpecLoadError(`Invalid OpenAPI spec: ${(error as Error).message}`, { source });
  }
  
  // Then dereference
  try {
    logger.info("Dereferencing OpenAPI spec");
    const document = await SwaggerParser.dereference(rawDoc as OpenAPIDocument) as OpenAPIDocument;
    
    logger.info("OpenAPI spec dereferenced successfully", { 
      title: document.info?.title,
      version: document.info?.version
    });
    
    return { document, source };
  } catch (error) {
    throw new SpecLoadError(`Failed to dereference spec: ${(error as Error).message}`, { source });
  }
}
