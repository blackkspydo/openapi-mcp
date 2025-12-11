// TypeScript Type Generator - Convert JSON Schema to TypeScript interfaces

import type { JsonSchema } from "../types/openapi";

interface GenerateOptions {
  interfaceName?: string;
  exportKeyword?: boolean;
  includeComments?: boolean;
}

const DEFAULT_OPTIONS: Required<GenerateOptions> = {
  interfaceName: "GeneratedType",
  exportKeyword: true,
  includeComments: true,
};

/**
 * Convert JSON Schema type to TypeScript type
 */
function schemaTypeToTs(schema: JsonSchema): string {
  // Handle nullable
  const nullable = schema.nullable ? " | null" : "";
  
  // Handle enum
  if (schema.enum && schema.enum.length > 0) {
    const enumValues = schema.enum.map(v => 
      typeof v === "string" ? `"${v}"` : String(v)
    ).join(" | ");
    return enumValues + nullable;
  }
  
  // Handle const
  if (schema.const !== undefined) {
    return typeof schema.const === "string" 
      ? `"${schema.const}"` 
      : String(schema.const);
  }
  
  // Handle allOf (intersection)
  if (schema.allOf && schema.allOf.length > 0) {
    const types = schema.allOf.map(s => schemaToTs(s, "", false)).filter(Boolean);
    return types.length > 0 ? types.join(" & ") + nullable : "unknown";
  }
  
  // Handle oneOf/anyOf (union)
  if (schema.oneOf && schema.oneOf.length > 0) {
    const types = schema.oneOf.map(s => schemaToTs(s, "", false)).filter(Boolean);
    return types.length > 0 ? `(${types.join(" | ")})` + nullable : "unknown";
  }
  
  if (schema.anyOf && schema.anyOf.length > 0) {
    const types = schema.anyOf.map(s => schemaToTs(s, "", false)).filter(Boolean);
    return types.length > 0 ? `(${types.join(" | ")})` + nullable : "unknown";
  }
  
  // Handle type
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  
  switch (type) {
    case "string":
      return "string" + nullable;
    case "number":
    case "integer":
      return "number" + nullable;
    case "boolean":
      return "boolean" + nullable;
    case "null":
      return "null";
    case "array":
      if (schema.items) {
        const itemType = schemaToTs(schema.items, "", false);
        return `${itemType}[]` + nullable;
      }
      return "unknown[]" + nullable;
    case "object":
      return generateObjectType(schema) + nullable;
    default:
      // Try to infer from properties
      if (schema.properties) {
        return generateObjectType(schema) + nullable;
      }
      return "unknown";
  }
}

/**
 * Generate inline object type
 */
function generateObjectType(schema: JsonSchema): string {
  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    // Handle additionalProperties
    if (schema.additionalProperties) {
      if (schema.additionalProperties === true) {
        return "Record<string, unknown>";
      }
      const valueType = schemaToTs(schema.additionalProperties, "", false);
      return `Record<string, ${valueType}>`;
    }
    return "Record<string, unknown>";
  }
  
  const required = new Set(schema.required || []);
  const lines: string[] = [];
  
  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    const isRequired = required.has(propName);
    const propType = schemaToTs(propSchema as JsonSchema, "", false);
    const safeName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(propName) 
      ? propName 
      : `"${propName}"`;
    lines.push(`${safeName}${isRequired ? "" : "?"}: ${propType}`);
  }
  
  return `{ ${lines.join("; ")} }`;
}

/**
 * Generate TypeScript interface/type from JSON Schema
 */
function schemaToTs(schema: JsonSchema, name: string, asInterface: boolean): string {
  if (!schema || Object.keys(schema).length === 0) {
    return asInterface ? `interface ${name} {}` : "unknown";
  }
  
  const type = schemaTypeToTs(schema);
  
  if (!asInterface) {
    return type;
  }
  
  // For complex objects, generate as interface
  if ((schema.type === "object" || schema.properties) && schema.properties) {
    return generateInterface(schema, name);
  }
  
  // For other types, use type alias
  return `type ${name} = ${type};`;
}

/**
 * Generate a full interface with comments
 */
function generateInterface(schema: JsonSchema, name: string, includeComments = true): string {
  const lines: string[] = [];
  
  // Add JSDoc comment
  if (includeComments && schema.description) {
    lines.push("/**");
    lines.push(` * ${schema.description}`);
    lines.push(" */");
  }
  
  lines.push(`interface ${name} {`);
  
  const required = new Set(schema.required || []);
  
  for (const [propName, propSchema] of Object.entries(schema.properties || {})) {
    const ps = propSchema as JsonSchema;
    const isRequired = required.has(propName);
    
    // Add property comment
    if (includeComments && ps.description) {
      lines.push(`  /** ${ps.description} */`);
    }
    
    const propType = schemaTypeToTs(ps);
    const safeName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(propName) 
      ? propName 
      : `"${propName}"`;
    
    lines.push(`  ${safeName}${isRequired ? "" : "?"}: ${propType};`);
  }
  
  lines.push("}");
  
  return lines.join("\n");
}

/**
 * Generate TypeScript types from a schema
 */
export function generateTypeScript(
  schema: JsonSchema,
  options: GenerateOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  let result = schemaToTs(schema, opts.interfaceName, true);
  
  if (opts.exportKeyword) {
    result = result.replace(/^(interface|type)/, "export $1");
  }
  
  return result;
}

/**
 * Generate TypeScript types for request and response of an endpoint
 */
export function generateEndpointTypes(
  operationId: string | undefined,
  path: string,
  method: string,
  requestSchema: JsonSchema | null,
  responseSchema: JsonSchema | null
): string {
  const baseName = operationId 
    ? toPascalCase(operationId) 
    : toPascalCase(`${method}_${path.replace(/[{}\/]/g, "_")}`);
  
  const parts: string[] = [];
  
  if (requestSchema && Object.keys(requestSchema).length > 0) {
    parts.push(generateTypeScript(requestSchema, { 
      interfaceName: `${baseName}Request`,
      includeComments: true 
    }));
  }
  
  if (responseSchema && Object.keys(responseSchema).length > 0) {
    parts.push(generateTypeScript(responseSchema, { 
      interfaceName: `${baseName}Response`,
      includeComments: true 
    }));
  }
  
  return parts.join("\n\n");
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[a-z]/, c => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");
}
