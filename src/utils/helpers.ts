// Common helper functions

import type { HttpMethod } from "../types/openapi";

/**
 * Normalize HTTP method to lowercase
 */
export function normalizeMethod(method: string): HttpMethod {
  return method.toLowerCase() as HttpMethod;
}

/**
 * Normalize path to ensure leading slash
 */
export function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Create endpoint key for indexing
 */
export function createEndpointKey(method: string, path: string): string {
  return `${normalizeMethod(method)} ${normalizePath(path)}`;
}

/**
 * Parse endpoint key back to method and path
 */
export function parseEndpointKey(key: string): { method: HttpMethod; path: string } {
  const spaceIndex = key.indexOf(" ");
  return {
    method: key.slice(0, spaceIndex) as HttpMethod,
    path: key.slice(spaceIndex + 1),
  };
}

/**
 * HTTP method order for sorting
 */
const METHOD_ORDER: Record<HttpMethod, number> = {
  get: 0,
  post: 1,
  put: 2,
  patch: 3,
  delete: 4,
  options: 5,
  head: 6,
  trace: 7,
};

/**
 * Compare endpoints for sorting (by path, then by method)
 */
export function compareEndpoints(a: { path: string; method: string }, b: { path: string; method: string }): number {
  const pathCompare = a.path.localeCompare(b.path);
  if (pathCompare !== 0) return pathCompare;
  return METHOD_ORDER[a.method as HttpMethod] - METHOD_ORDER[b.method as HttpMethod];
}

/**
 * Check if a value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if status code matches a pattern (e.g., "2XX" matches "200")
 */
export function matchesStatusCode(actual: string, pattern: string): boolean {
  if (actual === pattern) return true;
  if (pattern.includes("X")) {
    const regex = new RegExp(`^${pattern.replace(/X/g, "\\d")}$`);
    return regex.test(actual);
  }
  return false;
}
