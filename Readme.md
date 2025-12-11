# OpenAPI MCP Server

An MCP server that lets LLMs inspect and interact with OpenAPI specifications.

## Features

- Load OpenAPI specs from URL or file (OpenAPI 2.0 & 3.x)
- List and search endpoints
- Get request/response schemas (fully dereferenced)
- Validate payloads against schemas
- Generate sample request payloads
- Generate TypeScript types from schemas
- Extract authentication schemes

## Installation

```bash
git clone https://github.com/blackkspydo/openapi-mcp.git
cd openapi-mcp
bun install
```

## Usage

### With Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openapi": {
      "command": "/opt/homebrew/bin/bun",
      "args": ["run", "/path/to/openapi-mcp/src/index.ts"]
    }
  }
}
```

> **Note**: Use the full path to `bun` (run `which bun` to find it).

### Standalone

```bash
bun run start
```

## Available Tools

| Tool | Description |
|------|-------------|
| `load_spec` | Load an OpenAPI spec from URL or file |
| `list_endpoints` | List all endpoints with optional filtering |
| `search_endpoints` | Search endpoints by keyword |
| `get_endpoint_details` | Get full details for an endpoint |
| `get_request_schema` | Get request body schema |
| `get_response_schema` | Get response schema by status code |
| `validate_payload` | Validate JSON against schema |
| `generate_sample` | Generate sample request payload |
| `generate_typescript_types` | Generate TypeScript interfaces from schemas |
| `generate_curl` | Generate ready-to-use cURL command |
| `get_auth_schemes` | Get security schemes |
| `get_servers` | Get available API servers |

## Example

```
You: Load the Petstore API spec from https://petstore.swagger.io/v2/swagger.json

You: List all POST endpoints

You: Generate TypeScript types for the Pet schema

You: Generate a cURL command for POST /pet

You: Generate a sample request for POST /pet
```

## License

MIT

