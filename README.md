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
- Scaffolded empty `src/` directory for future code
- Added `.gitignore` to exclude build artifacts, dependencies, and sensitive files

---

## Next Steps

### Phase 2: MCP Server Development
- Bootstrap MCP server with `npx @modelcontextprotocol/create-server`
- Implement tools:
  - `take_snapshot`
  - `validate_snapshot`
  - `compare_snapshots`
- Integrate SQLite database
- Add error handling and logging
- Test each tool individually

### Future Phases
- Develop VSCode extension UI
- Integrate Cline AI agent workflows
- End-to-end testing and documentation

---

## Repository Structure

```
/ (root)
  ├── .clinerules
  ├── .gitignore
  ├── README.md
  ├── LICENSE
  ├── src/                  # MCP server and extension code
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
