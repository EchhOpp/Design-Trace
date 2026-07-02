// MappingRegistry — in-memory store mapping symbols to code locations
import * as vscode from 'vscode';
import { SymbolEntry, ResolvedSymbol, TraceConfig, CodeLocation } from './types';

export class MappingRegistry {
  private entries = new Map<string, SymbolEntry>();
  private _onDidUpdate = new vscode.EventEmitter<void>();
  readonly onDidUpdate = this._onDidUpdate.event;

  private config: TraceConfig;

  constructor(config: TraceConfig) {
    this.config = config;
  }

  updateConfig(config: TraceConfig) {
    this.config = config;
  }

  /** Add or update a symbol entry from Markdown parsing */
  upsert(entry: SymbolEntry): void {
    this.entries.set(entry.symbol, entry);
    this._onDidUpdate.fire();
  }

  /** Bulk upsert entries */
  upsertAll(entries: SymbolEntry[]): void {
    let changed = false;
    for (const entry of entries) {
      const existing = this.entries.get(entry.symbol);
      if (!existing || entry.mdLine !== existing.mdLine) {
        this.entries.set(entry.symbol, entry);
        changed = true;
      }
    }
    if (changed) {
      this._onDidUpdate.fire();
    }
  }

  /** Merge resolved code locations into existing entries */
  resolveSymbol(symbol: string, location: CodeLocation): void {
    const entry = this.entries.get(symbol);
    if (entry) {
      this.entries.set(symbol, { ...entry, location });
      this._onDidUpdate.fire();
    }
  }

  /** Merge multiple resolved locations */
  resolveAll(resolutions: Map<string, CodeLocation>): void {
    let changed = false;
    for (const [symbol, location] of resolutions) {
      const entry = this.entries.get(symbol);
      if (entry && !entry.location) {
        this.entries.set(symbol, { ...entry, location });
        changed = true;
      }
    }
    if (changed) {
      this._onDidUpdate.fire();
    }
  }

  get(symbol: string): SymbolEntry | undefined {
    return this.entries.get(symbol);
  }

  getResolved(symbol: string): ResolvedSymbol | undefined {
    const entry = this.entries.get(symbol);
    if (entry?.location) {
      return entry as ResolvedSymbol;
    }
    return undefined;
  }

  hasSymbol(symbol: string): boolean {
    return this.entries.has(symbol);
  }

  isResolved(symbol: string): boolean {
    const entry = this.entries.get(symbol);
    return !!entry?.location;
  }

  /** Get all unresolved symbols (need Java code resolution) */
  getUnresolved(): SymbolEntry[] {
    return Array.from(this.entries.values()).filter(e => !e.location);
  }

  /** Get all resolved symbols */
  getResolvedSymbols(): ResolvedSymbol[] {
    return Array.from(this.entries.values())
      .filter((e): e is ResolvedSymbol => !!e.location);
  }

  /** Get symbols by file path (case-insensitive) */
  getSymbolsByFile(filePath: string): ResolvedSymbol[] {
    const normalized = filePath.replace(/\\/g, '/').toLowerCase();
    return this.getResolvedSymbols().filter(s =>
      s.location!.file.replace(/\\/g, '/').toLowerCase() === normalized
    );
  }

  /** Get symbols by Markdown file */
  getSymbolsByMdFile(mdFile: string): SymbolEntry[] {
    return Array.from(this.entries.values()).filter(e =>
      e.mdFile.replace(/\\/g, '/') === mdFile.replace(/\\/g, '/')
    );
  }

  get all(): SymbolEntry[] {
    return Array.from(this.entries.values());
  }

  get allSymbols(): string[] {
    return Array.from(this.entries.keys());
  }

  get size(): number {
    return this.entries.size;
  }

  get resolvedCount(): number {
    return this.getResolvedSymbols().length;
  }

  clear(): void {
    this.entries.clear();
    this._onDidUpdate.fire();
  }

  /** Serialize registry state for debugging */
  toJSON(): object {
    return {
      total: this.entries.size,
      resolved: this.resolvedCount,
      symbols: Object.fromEntries(this.entries)
    };
  }
}
