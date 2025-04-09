# Sightline

[![VS Code Marketplace](https://vsmarketplacebadge.apphb.com/version-short/LucidLayer.sightline-extension.svg)](https://marketplace.visualstudio.com/items?itemName=LucidLayer.sightline-extension)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/LucidLayer.sightline-extension.svg)](https://marketplace.visualstudio.com/items?itemName=LucidLayer.sightline-extension)
[![Rating](https://vsmarketplacebadge.apphb.com/rating-short/LucidLayer.sightline-extension.svg)](https://marketplace.visualstudio.com/items?itemName=LucidLayer.sightline-extension)


Sightline is a Visual Regression Testing system integrated with VSCode, an AI agent (Cline), and a custom MCP server. It enables developers to capture, validate, and compare UI snapshots directly within their development workflow.

---

## Features

- **VSCode Extension**
  - Snapshot gallery with filtering
  - Validation panel with multi-rule support
  - Diff viewer with adjustable threshold
  - Snapshot management (archive, unarchive, delete)
  - CLI integration for all actions
- **MCP Server**
  - Tools for snapshot, validation, diff
  - SQLite database with metadata, versioning, soft-delete
- **CLI Utilities**
  - List, export/import, validate, diff, archive/delete snapshots
- **Memory Bank**
  - Persistent project context and documentation

---

## Usage

### Setup

```bash
cd mcp/sightline-server
npm install
npm run build
node build/index.js   # Start MCP server
```

### VSCode Extension

- Open the Sightline panel via command palette or sidebar
- **Capture Snapshot:** Enter URL and metadata (future)
- **View Snapshots:** Filter, archive/unarchive, delete
- **Run Validation:** Input rules as JSON, view results
- **Run Diff:** Select two snapshots, adjust threshold, view diff image and score

---

## Example Workflows

- **Capture and Validate**
  1. Capture a snapshot of your app
  2. Define validation rules (selectors + expected text)
  3. Run validation and review results

- **Compare Snapshots**
  1. Select two snapshots (e.g., before and after a change)
  2. Run diff with adjustable threshold
  3. Review diff image and score

- **Manage Snapshots**
  - Archive or unarchive snapshots
  - Delete obsolete snapshots
  - Filter snapshots by label or tags

---

## Repository Structure

```
/ (root)
  ├── .clinerules
  ├── README.md
  ├── mcp/
  │   └── sightline-server/
  │       ├── src/
  │       ├── build/
  │       ├── package.json
  │       └── ...
  ├── src/
  │   ├── extension.ts
  │   ├── package.json
  │   ├── tsconfig.json
  │   └── ...
  └── memory_docs/
      ├── activeContext.md
      ├── systemPatterns.md
      ├── progress.md
      ├── ...
```

---

## Screenshots

*(Add screenshots of the extension UI here)*

---

## Next Steps

- **Phase 5: Cline AI Integration**
  - Update prompts to enforce Sightline tool use
  - Refine `.clinerules` with project-specific policies
  - Embed constraint stuffing, confidence checks, memory checks
  - Test Cline's behavior for tool invocation and chaining

---

## License

MIT
