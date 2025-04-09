# CodeMap Root: Sightline
timestamp: 2025-04-09T10:40:42-05:00

---

## ACTIVE_MEMORY
- Components: [#VSCodeExt, #ClineAgent, #MCPServer, #MemoryBank]
- Decisions: []
- Patterns: [@MCPToolPattern, @ExplicitApproval, @MemoryBankIntegration]
- Tasks: []

---

## PROJECT_STRUCTURE
sightline/
├── .clinerules
├── README.md
├── LICENSE
├── memory_docs/
│   ├── projectbrief.md
│   ├── activeContext.md
│   ├── systemPatterns.md
│   ├── techContext.md
│   ├── progress.md
│   ├── codeMap_root.md
│   └── indexes/
│       ├── components_index.yaml
│       ├── services_index.yaml
│       ├── utils_index.yaml
│       └── models_index.yaml
└── src/
    └── (MCP server, extension code to be added)

---

## FLOW_DIAGRAMS

### Sightline Architecture
```mermaid
flowchart TD
    User([User]) -->|Clicks button / types prompt| VSCodeExt[VS Code Extension UI]
    VSCodeExt -->|Sends structured prompt| Cline[Cline AI Agent]
    Cline -->|Suggests Sightline tool use\nRequests approval| User
    User -->|Approves tool call| Cline
    Cline -->|Calls MCP tool via use_mcp_tool| MCPServer

    subgraph MCP_Server["Sightline MCP Server"]
        MCPServer[MCP Server Controller]
        MCPServer -->|take_snapshot| Puppeteer[Puppeteer Browser]
        MCPServer -->|validate_snapshot| Validator[Validation Engine]
        MCPServer -->|compare_snapshots| Pixelmatch[Pixelmatch Diff Engine]
        Puppeteer -->|Snapshot Data| SQLiteDB[(SQLite DB)]
        Validator -->|Validation Results| SQLiteDB
        Pixelmatch -->|Diff Image + Score| SQLiteDB
    end

    SQLiteDB --> MCPServer
    MCPServer --> Cline
    Cline --> VSCodeExt
    VSCodeExt -->|Displays| User

    subgraph MemoryBank["Memory Bank v2 + Context"]
        MBFiles[Markdown Files:\nprojectbrief.md,\nactiveContext.md,\nsystemPatterns.md,\ncodeMap_root.md,\nindexes/*.yaml,\n.clinerules]
        MBFiles -->|Loaded at start| Cline
        MBFiles -->|Tool policies:\nAlways use Sightline tools| Cline
    end
```

---

## INDEXES
- `memory_docs/indexes/components_index.yaml`
- `memory_docs/indexes/services_index.yaml`
- `memory_docs/indexes/utils_index.yaml`
- `memory_docs/indexes/models_index.yaml`

---

## Notes
Update this file as new components, flows, and decisions are added.
