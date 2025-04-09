# Sightline

Sightline is a Visual Regression Testing system integrated with VSCode, an AI agent (Cline), and a custom MCP server. It enables developers to capture, validate, and compare UI snapshots directly within their development workflow.

---

## Project Status (as of 2025-04-09)

### Phase 1: Bootstrapping **(Completed)**
- Initialized Git repository
- Created `.clinerules` enforcing explicit approval and tool policies
- Established **Memory Bank** with:
  - `projectbrief.md`
  - `activeContext.md`
  - `systemPatterns.md`
  - `techContext.md`
  - `progress.md`
  - `codeMap_root.md`
  - Indexes for components, services, utils, models
- Scaffolded empty `src/` directory for future extension code
- Added `.gitignore` to exclude build artifacts, dependencies, and sensitive files

### Phase 2: MCP Server Development **(Completed)**
- Bootstrapped MCP server inside repo at `mcp/sightline-server`
- Installed dependencies (`puppeteer`, `pixelmatch`, `sqlite3`, etc.)
- Designed initial SQLite schema (snapshots, validations, diffs)
- Implemented tools:
  - `take_snapshot`
  - `validate_snapshot`
  - `compare_snapshots`
- Integrated Puppeteer, Pixelmatch, SQLite
- Added error handling and input validation
- Fixed all TypeScript errors and warnings
- Updated `.gitignore` files
- Updated Memory Bank with architecture and progress

### Phase 3: Data Management & Extension **(Completed)**
- Enhanced SQLite schema:
  - Metadata fields: `label`, `tags`, `env_info`
  - Snapshot versioning labels
  - Soft-delete (`archived` flag)
  - Optimized indexes on `timestamp`, `label`, `archived`
- CLI utilities implemented:
  - List snapshots, validations, diffs
  - Export/import data as JSON
  - Trigger validation and diff manually
  - Archive, unarchive, delete snapshots
- MCP tool APIs enhanced:
  - Optional parameters (metadata, threshold, profiles)
  - Multi-rule validation support
  - Structured JSON outputs
- Validation supports multiple selectors/rules and optional profiles
- Memory Bank updated with new architecture, schemas, and CLI details

---

## MCP Server & CLI Usage

### Setup

```bash
cd mcp/sightline-server
npm install
npm run build
node build/index.js   # Start MCP server
```

### CLI Commands

Run from `mcp/sightline-server`:

- **List snapshots:**

  ```
  node build/src/cli.js list-snapshots
  ```

- **List validations:**

  ```
  node build/src/cli.js list-validations
  ```

- **List diffs:**

  ```
  node build/src/cli.js list-diffs
  ```

- **Export data:**

  ```
  node build/src/cli.js export-data snapshots snapshots.json
  ```

- **Import data:**

  ```
  node build/src/cli.js import-data snapshots snapshots.json
  ```

- **Validate snapshot:**

  ```
  node build/src/cli.js validate-snapshot <snapshot_id> "<selector>" "<expected text>"
  ```

- **Compare snapshots:**

  ```
  node build/src/cli.js compare-snapshots <snapshot_id_a> <snapshot_id_b>
  ```

- **Archive snapshot:**

  ```
  node build/src/cli.js archive-snapshot <snapshot_id>
  ```

- **Unarchive snapshot:**

  ```
  node build/src/cli.js unarchive-snapshot <snapshot_id>
  ```

- **Delete snapshot:**

  ```
  node build/src/cli.js delete-snapshot <snapshot_id>
  ```

### MCP Tools (API)

- **take_snapshot**

  ```json
  {
    "url": "https://example.com",
    "label": "optional label",
    "tags": ["tag1", "tag2"],
    "env_info": { "browser": "Chrome" }
  }
  ```

- **validate_snapshot**

  ```json
  {
    "snapshot_id": 1,
    "rules": [
      { "selector": "#header", "text": "Welcome" },
      { "selector": ".btn", "text": "Submit" }
    ],
    "profile": "basic-checks"
  }
  ```

- **compare_snapshots**

  ```json
  {
    "snapshot_id_a": 1,
    "snapshot_id_b": 2,
    "threshold": 0.1
  }
  ```

---

## SQLite Schema Summary

- **snapshots:**  
  `id`, `timestamp`, `image`, `dom`, `metadata`, `label`, `tags`, `env_info`, `archived`

- **validations:**  
  `id`, `snapshot_id`, `timestamp`, `result` (multi-rule results, optional profile)

- **diffs:**  
  `id`, `snapshot_id_a`, `snapshot_id_b`, `timestamp`, `diff_image`, `score`

---

## Next Steps

### Phase 4: VSCode Extension UI
- Scaffold extension with Webview panel
- Build UI components: snapshot gallery, validation panel, diff viewer
- Integrate with MCP server and CLI
- Display approval prompts and results

### Phase 5: Cline AI Integration
- Update prompts to enforce Sightline tool use
- Refine `.clinerules` with project-specific policies
- Embed constraint stuffing, confidence checks, memory checks
- Test Cline's behavior for tool invocation and chaining

---

## Repository Structure

```
/ (root)
  ├── .clinerules
  ├── .gitignore
  ├── README.md
  ├── LICENSE
  ├── mcp/
  │   └── sightline-server/
  │       ├── package.json
  │       ├── tsconfig.json
  │       ├── src/
  │       │   ├── index.ts
  │       │   └── cli.ts
  │       ├── build/
  │       ├── node_modules/ (ignored)
  │       └── other MCP server files
  ├── src/                  # VSCode extension code (to be added)
  └── memory_docs/          # Memory Bank documentation
      ├── projectbrief.md
      ├── activeContext.md
      ├── systemPatterns.md
      ├── techContext.md
      ├── progress.md
      ├── codeMap_root.md
      └── indexes/
          ├── components_index.yaml
          ├── services_index.yaml
          ├── utils_index.yaml
          └── models_index.yaml
```

---

## Notes

- Explicit approval is enforced for all destructive actions.
- Sightline MCP tools are preferred for snapshot, validation, and diff.
- Memory Bank files are loaded at startup to maintain persistent context.
- MCP server is inside the repo under `mcp/sightline-server`.
- CLI utilities and MCP tools are fully documented above.
