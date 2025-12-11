// Sample Generator - Generate sample payloads from JSON schemas

import type { JsonSchema } from "../types/openapi";

interface GenerateOptions {
  includeOptional?: boolean;
  maxArrayItems?: number;
  maxDepth?: number;
}

const DEFAULT_OPTIONS: Required<GenerateOptions> = {
  includeOptional: false,
  maxArrayItems: 2,
  maxDepth: 10,
};

/**
 * Generate a sample value for a string schema
 */
function generateString(schema: JsonSchema): string {
  // Use example if available
  if (schema.example !== undefined) return String(schema.example);
  if (schema.default !== undefined) return String(schema.default);
  
  // Use first enum value
  if (schema.enum && schema.enum.length > 0) {
    return String(schema.enum[0]);
  }
  
  // Generate based on format
  switch (schema.format) {
    case "email":
      return "user@example.com";
    case "uri":
    case "url":
      return "https://example.com";
    case "date":
      return "2024-01-15";
    case "date-time":
      return "2024-01-15T10:30:00Z";
    case "time":
      return "10:30:00";
    case "uuid":
      return "550e8400-e29b-41d4-a716-446655440000";
    case "hostname":
      return "example.com";
    case "ipv4":
      return "192.168.1.1";
    case "ipv6":
      return "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
    case "byte":
      return "SGVsbG8gV29ybGQ=";
    case "binary":
      return "<binary data>";
    case "password":
      return "********";
    default:
      break;
  }
  
  // Handle minLength
  const minLen = schema.minLength ?? 0;
  let value = "string";
  while (value.length < minLen) {
    value += "_";
  }
  
  return value;
}

/**
 * Generate a sample value for a number schema
 */
function generateNumber(schema: JsonSchema): number {
  if (schema.example !== undefined) return Number(schema.example);
  if (schema.default !== undefined) return Number(schema.default);
  
  if (schema.enum && schema.enum.length > 0) {
    return Number(schema.enum[0]);
  }
  
  const min = schema.minimum ?? schema.exclusiveMinimum ?? 0;
  const max = schema.maximum ?? schema.exclusiveMaximum ?? (min + 100);
  
  // Return minimum or middle value
  if (schema.minimum !== undefined) {
    return min;
  }
  
  return Math.floor((min + max) / 2);
}

/**
 * Generate a sample value for an integer schema
 */
function generateInteger(schema: JsonSchema): number {
  return Math.floor(generateNumber(schema));
}

/**
 * Generate a sample value for a boolean schema
 */
function generateBoolean(schema: JsonSchema): boolean {
  if (schema.example !== undefined) return Boolean(schema.example);
  if (schema.default !== undefined) return Boolean(schema.default);
  return false;
}

/**
 * Generate a sample value from a JSON schema
 */
export function generateSample(
  schema: JsonSchema,
  options: GenerateOptions = {},
  depth = 0
): unknown {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Prevent infinite recursion
  if (depth > opts.maxDepth) {
    return null;
  }
  
  // Handle example/default at top level
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  
  // Handle const
  if (schema.const !== undefined) return schema.const;
  
  // Handle enum
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }
  
  // Handle nullable
  if (schema.nullable && !schema.type) {
    return null;
  }
  
  // Handle composition
  if (schema.allOf && schema.allOf.length > 0) {
    // Merge all schemas
    const merged: Record<string, unknown> = {};
    for (const subSchema of schema.allOf) {
      const sample = generateSample(subSchema, opts, depth + 1);
      if (typeof sample === "object" && sample !== null) {
        Object.assign(merged, sample);
      }
    }
    return merged;
  }
  
  if (schema.oneOf && schema.oneOf.length > 0) {
    return generateSample(schema.oneOf[0], opts, depth + 1);
  }
  
  if (schema.anyOf && schema.anyOf.length > 0) {
    return generateSample(schema.anyOf[0], opts, depth + 1);
  }
  
  // Handle by type
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  
  switch (type) {
    case "string":
      return generateString(schema);
      
    case "number":
      return generateNumber(schema);
      
    case "integer":
      return generateInteger(schema);
      
    case "boolean":
      return generateBoolean(schema);
      
    case "null":
      return null;
      
    case "array": {
      if (!schema.items) return [];
      const count = schema.minItems ?? Math.min(1, opts.maxArrayItems);
      const items: unknown[] = [];
      for (let i = 0; i < count; i++) {
        items.push(generateSample(schema.items, opts, depth + 1));
      }
      return items;
    }
      
    case "object": {
      const result: Record<string, unknown> = {};
      const required = new Set(schema.required || []);
      
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          const isRequired = required.has(key);
          if (isRequired || opts.includeOptional) {
            result[key] = generateSample(propSchema as JsonSchema, opts, depth + 1);
          }
        }
      }
      return result;
    }
      
    default:
      // Unknown type, try to infer from properties
      if (schema.properties) {
        const result: Record<string, unknown> = {};
        const required = new Set(schema.required || []);
        
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          const isRequired = required.has(key);
          if (isRequired || opts.includeOptional) {
            result[key] = generateSample(propSchema as JsonSchema, opts, depth + 1);
          }
        }
        return result;
      }
      return null;
  }
}
