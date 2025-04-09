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

## SQLite Schema Pattern
- **Snapshots Table:**
  - `id`, `timestamp`, `image`, `dom`, `metadata`
  - **Enhancements:** `label`, `tags`, `env_info`, `archived`
  - **Indexes:** on `timestamp`, `label`, `archived`
- **Validations Table:**
  - Linked to snapshot ID
  - Stores JSON result with multiple rules and optional profile
- **Diffs Table:**
  - Linked to two snapshot IDs
  - Stores diff image and score

## Design Patterns
- **MCP Tool Pattern:**  
  - Each core function (snapshot, validate, diff) exposed as a separate MCP tool  
  - Communicated via STDIO transport  
  - Input validation and error handling built-in
  - **Enhanced:** optional parameters (metadata, threshold, profiles), multi-rule validation
- **Snapshot Storage:**  
  - Puppeteer captures screenshot + DOM  
  - Stored in SQLite with metadata, labels, tags, env info
- **Validation Pattern:**  
  - Load snapshot DOM  
  - Run multiple selector/text checks per request  
  - Save detailed results linked to snapshot ID, with optional profile
- **Diff Pattern:**  
  - Load two screenshots  
  - Run Pixelmatch diff with configurable threshold  
  - Save diff image + score linked to snapshot IDs

## CLI Utility Pattern
- List snapshots, validations, diffs
- Export/import data as JSON
- Trigger validation and diff manually
- Archive, unarchive, delete snapshots
- Built with commander.js

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
