// Error classes and helpers

export class OpenAPIError extends Error {
  code: string;
  context?: Record<string, unknown>;

  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = "OpenAPIError";
    this.code = code;
    this.context = context;
  }
}

export class SpecNotLoadedError extends OpenAPIError {
  constructor() {
    super(
      "No OpenAPI spec is loaded. Use load_spec tool first.",
      "SPEC_NOT_LOADED"
    );
  }
}

export class EndpointNotFoundError extends OpenAPIError {
  constructor(path: string, method: string) {
    super(
      `Endpoint not found: ${method.toUpperCase()} ${path}`,
      "ENDPOINT_NOT_FOUND",
      { path, method }
    );
  }
}

export class SchemaNotFoundError extends OpenAPIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "SCHEMA_NOT_FOUND", context);
  }
}

export class ValidationFailedError extends OpenAPIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "VALIDATION_FAILED", context);
  }
}

export class SpecLoadError extends OpenAPIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "SPEC_LOAD_ERROR", context);
  }
}

export class InvalidInputError extends OpenAPIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "INVALID_INPUT", context);
  }
}
