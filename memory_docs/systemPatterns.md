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

## VSCode Extension Architecture
- **Webview UI Components:**
  - **Snapshot Gallery:** list, filter, archive/unarchive, delete
  - **Validation Panel:** input rules, view results
  - **Diff Viewer:** select snapshots, adjust threshold, view diff
  - **Metadata Editing:** (future)
- **Communication Flow:**
  - Webview sends messages: `refreshSnapshots`, `toggleArchive`, `deleteSnapshot`, `runValidation`, `runDiff`
  - Extension backend invokes CLI commands accordingly
  - Backend sends results back to Webview for display
- **CLI Integration:**
  - Uses `child_process.exec` to run CLI commands with `--json` output
  - Handles errors and updates UI dynamically

## MCP Tool Pattern
- Each core function (snapshot, validate, diff) exposed as a separate MCP tool
- Communicated via STDIO transport
- Input validation and error handling built-in
- **Enhanced:** optional parameters (metadata, threshold, profiles), multi-rule validation

## Snapshot Storage
- Puppeteer captures screenshot + DOM
- Stored in SQLite with metadata, labels, tags, env info

## Validation Pattern
- Load snapshot DOM
- Run multiple selector/text checks per request
- Save detailed results linked to snapshot ID, with optional profile

## Diff Pattern
- Load two screenshots
- Run Pixelmatch diff with configurable threshold
- Save diff image + score linked to snapshot IDs

## CLI Utility Pattern
- List snapshots, validations, diffs
- Export/import data as JSON
- Trigger validation and diff manually
- Archive, unarchive, delete snapshots
- Built with commander.js

## Cline AI Prompt Engineering (Phase 5)
- **Global Instructions:**
  - Enforce explicit approval and Sightline tool use
  - Bias toward explicit tool invocation
  - Embed constraint stuffing, confidence checks, memory checks

- **Prompt Templates:**

  **Tool Invocation Prompt Example:**
  ```
  Use the Sightline MCP tool `take_snapshot` with URL "https://example.com".
  Request explicit approval before executing.
  ```

  **Chained Tool Calls Prompt Example:**
  ```
  First, capture a snapshot of "https://example.com".
  Then, validate the snapshot with rules:
    - selector: "#header", text: "Welcome"
    - selector: ".btn", text: "Submit"
  Then, compare the new snapshot with snapshot ID 42.
  Request explicit approval before each step.
  ```

  **Error Handling Prompt Example:**
  ```
  If an error occurs during validation, retry once.
  If still failing, request clarification or alternative input.
  Log errors and suggest next actions.
  ```

- **Behavior Testing:**
  - Confirm Cline suggests correct tools
  - Requests explicit approval
  - Chains tools when needed
  - Loads Memory Bank context

- **Refinement:**
  - Iteratively improve prompts based on test results
  - Update Memory Bank and README accordingly

## Error Handling
- Comprehensive try/catch in MCP tools and extension backend
- Log errors to console and SQLite
- Return structured error responses to Cline and UI

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
