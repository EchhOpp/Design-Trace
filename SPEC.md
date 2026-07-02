# Design Traceability Extension — Specification

## 1. Project Overview

**Project Name:** `design-trace`

**Type:** VS Code Extension (TypeScript)

**Core Feature:** Bidirectional traceability between AI-generated Internal Design Markdown documents and Java source code, enabling navigation, hover hints, CodeLens links, and gutter indicators.

**Target Users:** Developers working on Java projects where Internal Design documentation is maintained alongside source code in the same workspace.

---

## 2. Architecture

### Components

| Component | Responsibility |
|---|---|
| `MappingRegistry` | In-memory store: symbol → `{file, range, mdSection}` |
| `Indexer` | Scans Markdown files for `symbol:` tags, builds registry |
| `JavaSymbolResolver` | Uses JdtlsAdapter / regex to resolve symbols to code locations |
| `DecorationProvider` | Applies gutter decorations (green dot) to mapped Java methods |
| `HoverProvider` | Returns hover tooltip for mapped Java code |
| `CodeLensProvider` | Shows "Referenced in Internal Design" above mapped methods |
| `MarkdownLinkProvider` | Makes `symbol:ClassName#method` in Markdown clickable |
| `TreeDataProvider` | Sidebar panel: Internal Design tree → code navigation |
| `StatusBarController` | Shows current doc's symbol count in status bar |

### Data Flow

```
Markdown file edited
  → FileWatcher triggers re-index
  → Regex extracts all symbol: entries
  → Registry updated (symbol → mdSection)

Java file edited
  → FileWatcher triggers symbol resolution
  → AST/language server resolves class#method to line range
  → Decorations, CodeLens, Hover providers updated
```

### Mapping Registry Schema

```json
{
  "UserController#login": {
    "file": "src/UserController.java",
    "range": { "startLine": 120, "endLine": 135 },
    "mdSection": "Controller > User Login",
    "mdFile": "docs/internal-design.md"
  }
}
```

---

## 3. Visual & Rendering Specification

### Color Palette

| Element | Color |
|---|---|
| Mapped gutter icon | `#4CAF50` (green) |
| Mapped gutter icon (dark) | `#66BB6A` |
| Sidebar accent | `#1565C0` |
| Hover tooltip bg | `editorHoverWidget.background` |
| CodeLens text | `#888888` |
| Status bar | `#0D47A1` |

### Typography

- Sidebar headings: `font-size: 13px; font-weight: 600`
- Sidebar items: `font-size: 12px`
- Hover tooltip: `font-size: 12px; font-family: var(--vscode-font-family)`

### Layout

- **Activity Bar:** Design Trace icon (⚡)
- **Sidebar Panel:** Tree view with collapsible Internal Design sections
- **Status Bar:** Shows `[Design: N symbols]` when in a mapped doc

---

## 4. Interaction Specification

### Markdown → Java Navigation

1. User opens Internal Design Markdown file
2. Extension registers `DocumentLinkProvider` for Markdown files
3. Text matching regex `symbol:\s*([A-Za-z0-9_]+#[a-zA-Z0-9_]+)` becomes a clickable link
4. On click: opens the mapped Java file, reveals the target line range
5. Keyboard shortcut: `Ctrl+Shift+D` while cursor is on a symbol

### Java → Markdown Traceability

1. **Gutter Decoration:** Green dot in the editor gutter for mapped methods
2. **Hover:** Hovering the green dot shows tooltip: `"Internal Design: Controller > User Login\nClick to open"`
3. **CodeLens:** `"Referenced in Internal Design [md]"` appears above mapped methods
4. **Click CodeLens:** Opens the corresponding Markdown section
5. **Click Gutter:** Opens the corresponding Markdown section

### Sidebar Panel

- Tree hierarchy mirrors Markdown section structure
- Nodes are grouped by section (Controller, Service, SQL, Flow, etc.)
- Click node → navigate to Java code
- Search box to filter symbols
- Refresh button to re-index

### Command Palette

| Command | ID | Action |
|---|---|---|
| Design Trace: Re-index | `design-trace.reindex` | Force rebuild mapping registry |
| Design Trace: Open Panel | `design-trace.openPanel` | Show sidebar |
| Design Trace: Link Current | `design-trace.linkCurrent` | Link current editor to registry |

---

## 5. Configuration

```json
{
  "design-trace.mdPatterns": ["**/*.md"],
  "design-trace.javaPatterns": ["**/*.java"],
  "design-trace.markerTag": "symbol:",
  "design-trace.ignoredSymbols": [],
  "design-trace.autoIndex": true,
  "design-trace.showGutterIcons": true,
  "design-trace.showCodeLens": true,
  "design-trace.showHover": true
}
```

---

## 6. Technology Stack

- **Runtime:** VS Code Extension API (`vscode.d.ts`)
- **Language:** TypeScript
- **Java AST:** Regex-based heuristic resolver (no JDT dependency required; compatible with any LSP)
- **Build:** webpack + ts-loader
- **Test:** @vscode/test-electron

---

## 7. Acceptance Criteria

- [ ] Extension loads without errors
- [ ] Markdown `symbol:` entries are parsed and stored in registry
- [ ] Clicking a `symbol:` link in Markdown opens the correct Java file at the right location
- [ ] Green gutter icon appears next to mapped Java methods
- [ ] Hover tooltip appears when hovering gutter icon or method name
- [ ] CodeLens "Referenced in Internal Design" shows above mapped methods
- [ ] Clicking CodeLens opens the related Markdown section
- [ ] Sidebar tree view shows all symbols grouped by section
- [ ] Re-index command rebuilds the registry
- [ ] Settings are read from `design-trace.*` configuration keys
- [ ] Extension works for any Java + Markdown workspace (no hardcoded paths)
