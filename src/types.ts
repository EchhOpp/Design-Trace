// Core data types for the Design Trace extension

export interface CodeLocation {
  /** Absolute path to the file, relative to workspace root */
  file: string;
  range: LineRange;
  /** Human-readable section path in Markdown, e.g. "Controller > User Login" */
  mdSection: string;
  /** Path to the Markdown file containing this symbol */
  mdFile: string;
}

export interface LineRange {
  startLine: number; // 1-indexed
  endLine: number;   // 1-indexed, inclusive
}

export interface SymbolEntry {
  symbol: string;    // e.g. "UserController#login"
  className: string; // e.g. "UserController"
  methodName: string; // e.g. "login"
  mdFile: string;
  mdSection: string;
  mdLine: number;    // line number in Markdown where symbol appears
  /** Resolved location in Java source, undefined until resolved */
  location?: CodeLocation;
}

export interface ParsedSection {
  /** The full section heading line, e.g. "## Controller" */
  heading: string;
  /** Heading level: 1 = #, 2 = ##, etc. */
  level: number;
  /** The section title text, e.g. "Controller" */
  title: string;
  /** 1-indexed line number where this heading appears */
  line: number;
  /** Parent section titles joined by " > " */
  path: string;
}

export interface ResolvedSymbol extends SymbolEntry {
  location: CodeLocation;
}

export interface TraceConfig {
  mdPatterns: string[];
  javaPatterns: string[];
  markerTag: string;
  ignoredSymbols: string[];
  autoIndex: boolean;
  showGutterIcons: boolean;
  showCodeLens: boolean;
  showHover: boolean;
  iconTheme: 'dot' | 'icon';
}
