# Design Trace — VS Code Extension

Bidirectional traceability between Internal Design Markdown documents and Java source code.

## Features

- **Markdown → Java Navigation**: Click `symbol:` entries in Markdown to jump to the corresponding Java method
- **Java → Markdown Traceability**: Green gutter icons, hover tooltips, and CodeLens links in Java files
- **Sidebar Panel**: Tree view of all symbols grouped by Internal Design section
- **Auto-indexing**: Registry updates automatically as files change
- **Command Palette**: Re-index, open panel, link current file

## Quick Start

1. Install the extension (see Development below)
2. Add `symbol: ClassName#methodName` entries to your Internal Design Markdown files
3. Run **Design Trace: Re-index** (`Ctrl+Shift+P` → "Design Trace: Re-index")
4. Click symbols in Markdown to navigate to Java code
5. View green gutter icons in Java files to see mapped methods

## Symbol Format

```markdown
### User Login
symbol: UserController#login
description: Validate user credentials
```

The extension resolves `UserController#login` to the `login()` method in `UserController.java`.

## Configuration

| Setting | Default | Description |
|---|---|---|
| `design-trace.mdPatterns` | `["**/*.md"]` | Glob patterns for Markdown files |
| `design-trace.javaPatterns` | `["**/*.java"]` | Glob patterns for Java files |
| `design-trace.markerTag` | `"symbol:"` | Tag prefix in Markdown |
| `design-trace.autoIndex` | `true` | Auto re-index on file changes |
| `design-trace.showGutterIcons` | `true` | Show green gutter icons |
| `design-trace.showCodeLens` | `true` | Show CodeLens links |
| `design-trace.showHover` | `true` | Show hover tooltips |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+D` | Open Design Trace panel |

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package for distribution
npx vsce package

# Run tests
npm test
```

## Architecture

```
src/
  extension.ts          — Main entry point, registers all providers
  MappingRegistry.ts    — In-memory symbol → location mapping store
  MarkdownIndexer.ts    — Parses Markdown for symbol: entries
  JavaSymbolResolver.ts — Resolves symbols to Java code locations
  StatusBarController.ts — Status bar integration
  types.ts              — Core data types
  providers/
    DesignTraceLinkProvider.ts   — Clickable links in Markdown
    DecorationProvider.ts        — Gutter icons in Java
    HoverProvider.ts             — Hover tooltips in Java
    CodeLensProvider.ts          — CodeLens in Java files
    DesignTraceTreeProvider.ts   — Sidebar tree view
```

## Sample Data

See `sample/` directory for example Internal Design and Java files to test the extension.
