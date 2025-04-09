# sightline

flowchart TD
    %% User Interaction Layer
    User([User]):::user -->|Clicks button / types prompt| VSCodeExt[VS Code Extension UI]:::ext
    VSCodeExt -->|Sends structured prompt| Cline[Cline AI Agent]:::cline
    Cline -->|Suggests Sightline tool use<br>Requests approval| User
    User -->|Approves tool call| Cline
    Cline -->|Calls MCP tool via use_mcp_tool| MCPServer[Sightline MCP Server (STDIO)]:::mcp

    %% MCP Server Layer
    subgraph MCP_Server["Sightline MCP Server"]
        MCPServer -->|take_snapshot| Puppeteer[Puppeteer Browser]:::mcp
        MCPServer -->|validate_snapshot| Validator[Validation Engine]:::mcp
        MCPServer -->|compare_snapshots| Pixelmatch[Pixelmatch Diff Engine]:::mcp
        Puppeteer -->|Snapshot Data| SQLiteDB[(SQLite DB)]:::db
        Validator -->|Validation Results| SQLiteDB
        Pixelmatch -->|Diff Image + Score| SQLiteDB
    end

    %% Data Flow Back
    SQLiteDB --> MCPServer
    MCPServer --> Cline
    Cline --> VSCodeExt
    VSCodeExt -->|Displays| User

    %% Persistent Context Layer
    subgraph MemoryBank["Memory Bank v2 + Context"]
        MBFiles[Markdown Files:<br>projectbrief.md,<br>activeContext.md,<br>systemPatterns.md,<br>codeMap_root.md,<br>indexes/*.yaml,<br>.clinerules]:::mem
        MBFiles -->|Loaded at start| Cline
        MBFiles -->|Tool policies:<br>\"Always use Sightline tools\"| Cline
    end

    %% Annotations
    classDef user fill:#cfc,stroke:#333,stroke-width:2px
    classDef ext fill:#ccf,stroke:#333,stroke-width:2px
    classDef cline fill:#fc9,stroke:#333,stroke-width:2px
    classDef mcp fill:#ffc,stroke:#333,stroke-width:2px
    classDef db fill:#f9f,stroke:#333,stroke-width:2px
    classDef mem fill:#cff,stroke:#333,stroke-width:2px

    class User user
    class VSCodeExt ext
    class Cline cline
    class MCPServer mcp
    class Puppeteer,Validator,Pixelmatch mcp
    class SQLiteDB db
    class MBFiles mem
