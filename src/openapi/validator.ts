// Payload Validator - Validate JSON payloads against OpenAPI schemas

import Ajv from "ajv";
import addFormats from "ajv-formats";
import type { JsonSchema } from "../types/openapi";
import type { ValidationError } from "../types/mcp";

// Initialize AJV with formats
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  validateFormats: true,
});
addFormats(ajv);

// Cache for compiled validators
const validatorCache = new Map<string, ReturnType<typeof ajv.compile>>();

/**
 * Get or create a compiled validator for a schema
 */
function getValidator(schema: JsonSchema): ReturnType<typeof ajv.compile> {
  const cacheKey = JSON.stringify(schema);
  
  let validator = validatorCache.get(cacheKey);
  if (!validator) {
    validator = ajv.compile(schema);
    validatorCache.set(cacheKey, validator);
  }
  
  return validator;
}

/**
 * Transform AJV errors to user-friendly format
 */
function transformErrors(errors: typeof ajv.errors): ValidationError[] {
  if (!errors) return [];
  
  return errors.map((error) => ({
    path: error.instancePath || "/",
    message: error.message || "Validation failed",
    keyword: error.keyword,
    params: error.params as Record<string, unknown>,
  }));
}

/**
 * Validate a payload against a JSON schema
 */
export function validatePayload(
  payload: unknown,
  schema: JsonSchema
): { valid: boolean; errors: ValidationError[] } {
  const validator = getValidator(schema);
  const valid = validator(payload);
  
  return {
    valid: valid as boolean,
    errors: valid ? [] : transformErrors(validator.errors),
  };
}

/**
 * Clear the validator cache
 */
export function clearValidatorCache(): void {
  validatorCache.clear();
}
