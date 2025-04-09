# Technology Context: Sightline

## Programming Languages
- **TypeScript:** MCP server, VSCode extension
- **JavaScript:** Underlying runtime
- **Markdown/YAML:** Memory Bank documentation

## Core Frameworks & Libraries
- **Node.js:** Runtime environment
- **Puppeteer:** Browser automation for snapshots
- **Pixelmatch:** Image diffing
- **SQLite:** Local database storage
- **VSCode Extension API:** UI integration
- **MCP SDK:** Server framework and tool interface

## Development Tools
- **Git:** Version control
- **ESLint:** Linting
- **Prettier:** Code formatting
- **TypeScript Compiler:** Transpilation
- **npm:** Package management
- **Mermaid:** Architecture diagrams in docs

## Environment
- **Local development:** Windows 11, VSCode
- **Node.js version:** >=16.x recommended
- **SQLite:** Embedded, file-based
- **No external cloud dependencies** in Phase 1

## Build & Run
- **MCP Server:**  
  - Bootstrapped via `npx @modelcontextprotocol/create-server`  
  - Built with TypeScript  
  - Communicates via STDIO transport
- **VSCode Extension:**  
  - Uses Webview panels  
  - Communicates with Cline AI agent  
  - Sends structured prompts for tool invocation

## Dependencies to be Installed
- puppeteer
- pixelmatch
- sqlite3 or better-sqlite3
- @modelcontextprotocol/sdk
- @types/node
- typescript
- eslint, prettier configs

## Notes
- All dependencies are local, no cloud services required  
- Explicit approval enforced for any shell commands or destructive actions  
- Future phases may add more dependencies or cloud integrations
