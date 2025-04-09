# Project Brief: Sightline

## Overview
Sightline is a Visual Regression Testing system tightly integrated with VSCode, an AI agent (Cline), and a custom MCP server. It enables developers to capture, validate, and compare UI snapshots directly within their development workflow.

## Core Components
- **VSCode Extension UI:** User interface for triggering actions and viewing results.
- **Cline AI Agent:** Suggests tool use, manages approvals, orchestrates workflows.
- **Sightline MCP Server:** Provides tools for snapshot capture, validation, and diffing.
- **Memory Bank:** Persistent documentation and context system.

## Key Features (MVP)
- Capture UI snapshots via Puppeteer
- Validate snapshots with DOM/text/style checks
- Compare snapshots using Pixelmatch diffing
- Store results in SQLite database
- Approve tool calls explicitly
- Display results in VSCode extension UI

## Out of Scope (Phase 1)
- Advanced validation rules
- Multi-browser/device support
- Cloud storage or remote execution
- User management or auth flows

## Goals for Phase 1
- Establish strict tool policies and documentation
- Implement core snapshot, validate, and diff tools
- Integrate SQLite persistence
- Scaffold VSCode extension UI
- Enable end-to-end flow with explicit approvals

## Success Criteria
- All core tools functional and tested
- Data persists correctly in SQLite
- Extension UI displays snapshots, validation, and diffs
- Documentation is clear and up-to-date
- System respects explicit approval policies
