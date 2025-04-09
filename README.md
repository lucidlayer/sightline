# Sightline

Sightline is a Visual Regression Testing system integrated with VSCode, an AI agent (Cline), and a custom MCP server. It enables developers to capture, validate, and compare UI snapshots directly within their development workflow.

---

## Current Status (as of 2025-04-09)

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
- Bootstrapped MCP server **inside repo** at `mcp/sightline-server`
- Installed all dependencies (`puppeteer`, `pixelmatch`, `sqlite3`, etc.)
- Designed and created SQLite schema (snapshots, validations, diffs)
- Implemented tools:
  - `take_snapshot`
  - `validate_snapshot`
  - `compare_snapshots`
- Integrated Puppeteer, Pixelmatch, SQLite
- Added error handling and input validation
- Fixed all TypeScript errors and warnings
- Updated `.gitignore` files for nested project
- Updated Memory Bank with current architecture and progress

---

## Next Steps

### Phase 3: Data Management & Extension
- Improve SQLite data management
- Scaffold VSCode extension UI
- Integrate Cline AI workflows
- End-to-end testing and documentation updates

### Future Phases
- Advanced validation rules
- Cloud storage or remote execution
- User management or auth flows

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
  │       │   └── index.ts
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
- MCP server is now **inside the repo** under `mcp/sightline-server`.
