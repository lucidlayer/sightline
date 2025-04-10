# Sightline

[![Issues](https://img.shields.io/github/issues/LucidLayers/sightline)](https://github.com/LucidLayers/sightline/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/LucidLayers/sightline)](https://github.com/LucidLayers/sightline/pulls)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/LucidLayer.sightline-extension?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=LucidLayer.sightline-extension)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/LucidLayer.sightline-extension)](https://marketplace.visualstudio.com/items?itemName=LucidLayer.sightline-extension)
[![Rating](https://img.shields.io/visual-studio-marketplace/stars/LucidLayer.sightline-extension)](https://marketplace.visualstudio.com/items?itemName=LucidLayer.sightline-extension)

## Extension Features

- **Dedicated sidebar panel** with Activity Bar icon
- **Live snapshot list** with filtering and search
- **Snapshot management:** capture, validate, diff, archive, delete
- **Explicit AI-driven workflows** with approve/deny buttons
- **Dark/light theme adaptive styling**
- **Security policy included**

---

## Using the Sidebar Panel

- Access the **Sightline** icon in the Activity Bar.
- Use the **search box** to filter snapshots by label, tags, or status.
- Click **📸 Capture Snapshot** to create a new snapshot.
- Click **🔄 Refresh Snapshots** to update the list.

### Snapshot Actions

- **✅ Validate:** Run validation rules on the snapshot.
- **🗄️ Archive / 📂 Unarchive:** Toggle archive status.
- **🗑️ Delete:** Permanently remove the snapshot.

---

## AI Suggestions

- The **AI Suggestions** section shows prompt-driven recommendations.
- For each suggestion:
  - Click **Approve** to execute the suggested action.
  - Click **Deny** to skip it.
- All actions require **explicit approval** for transparency and control.

---

## Explicit Approval Workflows

- Cline's AI suggests actions but **never executes without approval**.
- Approvals trigger:
  - Validation
  - Diff comparisons
  - Archiving
- Denials log the decision and skip the action.

---

## Security

- No secrets or API keys embedded.
- All sensitive data managed via environment variables.
- See [SECURITY.md](./SECURITY.md) for details.

---

## Development

- Run `npm run compile` to build.
- Run `vsce package` to create a `.vsix`.
- Run `vsce publish` to update Marketplace.

---

## License

MIT



Sightline is a Visual Regression Testing system integrated with VSCode, an AI agent (Cline), and a custom MCP server. It enables developers to capture, validate, and compare UI snapshots directly within their development workflow.

---

## System Architecture & Components

Sightline is a Visual Regression Testing system integrated with VSCode, an AI agent (Cline), and a custom MCP server. It enables developers to capture, validate, and compare UI snapshots directly within their development workflow.

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








---
DEV:

{
  "mcpServers": {
    "sightline": {
      "command": "node",
      "args": [
        "C:/Dev/Projects/sightline-mcp-server/sightline-mcp-server/dist/index.js"
      ],
      "autoApprove": []
    }
  }
}









Realistic Developer Prompts for Sightline
1. Capture a snapshot
"Cline, take a snapshot of https://example.com and label it 'Homepage v1' with tags 'regression' and 'baseline'."

2. List all snapshots
"Cline, show me all my Sightline snapshots."

3. View a specific snapshot
"Cline, show me the snapshot labeled 'Homepage v1'."

4. Validate a snapshot
"Cline, validate the 'Homepage v1' snapshot.

Check that the header contains 'Welcome' and the login button says 'Sign in'."

5. Capture a new snapshot after changes
"Cline, take a new snapshot of https://example.com after my updates, label it 'Homepage v2', tags 'regression', 'update'."

6. Compare the two snapshots
"Cline, compare 'Homepage v1' with 'Homepage v2' and show me the visual differences."

7. Archive the old snapshot
"Cline, archive the snapshot labeled 'Homepage v1'."

8. Delete the new snapshot
"Cline, delete the snapshot labeled 'Homepage v2'."

9. List AI suggestions
"Cline, what AI suggestions do you have for my snapshots?"

10. Approve an AI suggestion
"Cline, approve the AI suggestion to validate the 'Homepage v2' snapshot."

11. Deny an AI suggestion
"Cline, deny the AI suggestion to archive the 'Homepage v1' snapshot."

12. Show validation results
"Cline, show me the validation results for 'Homepage v2'."

13. Show diff details
"Cline, show me the diff details between 'Homepage v1' and 'Homepage v2'."

