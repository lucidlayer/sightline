# System Patterns: Sightline

## Architecture Overview
- **Layered design:**  
  - User → VSCode Extension → Cline AI → MCP Server → Puppeteer/Validator/Pixelmatch → SQLite → back to User
- **Explicit tool invocation:**  
  - Cline always requests user approval before destructive actions  
  - Prefers Sightline MCP tools for snapshot, validation, diff
- **Memory Bank integration:**  
  - Loads core markdown files at startup  
  - Maintains persistent project context  
  - Enforces policies via `.clinerules`

## Design Patterns
- **MCP Tool Pattern:**  
  - Each core function (snapshot, validate, diff) exposed as a separate MCP tool  
  - Communicated via STDIO transport  
  - Input validation and error handling built-in
- **Snapshot Storage:**  
  - Puppeteer captures screenshot + DOM  
  - Stored in SQLite with metadata and ID
- **Validation Pattern:**  
  - Load snapshot DOM  
  - Run selector/text/style checks  
  - Save results linked to snapshot ID
- **Diff Pattern:**  
  - Load two screenshots  
  - Run Pixelmatch diff  
  - Save diff image + score linked to snapshot IDs

## Error Handling
- Comprehensive try/catch in MCP tools  
- Log errors to console and SQLite  
- Return structured error responses to Cline

## Security & Compliance
- Explicit approval enforced for all destructive actions  
- No shell commands without approval  
- Data stored locally in SQLite  
- No external network calls beyond Puppeteer browsing

## Extensibility
- Modular MCP server design  
- New tools can be added easily  
- Memory Bank can be expanded with new docs or indexes  
- Extension UI designed for future features (e.g., advanced validation, cloud sync)
