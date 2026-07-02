import * as vscode from 'vscode';
import { SymbolEntry, ResolvedSymbol, TraceConfig, CodeLocation } from './types';
export declare class MappingRegistry {
    private entries;
    private _onDidUpdate;
    readonly onDidUpdate: vscode.Event<void>;
    private config;
    constructor(config: TraceConfig);
    updateConfig(config: TraceConfig): void;
    /** Add or update a symbol entry from Markdown parsing */
    upsert(entry: SymbolEntry): void;
    /** Bulk upsert entries */
    upsertAll(entries: SymbolEntry[]): void;
    /** Merge resolved code locations into existing entries */
    resolveSymbol(symbol: string, location: CodeLocation): void;
    /** Merge multiple resolved locations */
    resolveAll(resolutions: Map<string, CodeLocation>): void;
    get(symbol: string): SymbolEntry | undefined;
    getResolved(symbol: string): ResolvedSymbol | undefined;
    hasSymbol(symbol: string): boolean;
    isResolved(symbol: string): boolean;
    /** Get all unresolved symbols (need Java code resolution) */
    getUnresolved(): SymbolEntry[];
    /** Get all resolved symbols */
    getResolvedSymbols(): ResolvedSymbol[];
    /** Get symbols by file path (case-insensitive) */
    getSymbolsByFile(filePath: string): ResolvedSymbol[];
    /** Get symbols by Markdown file */
    getSymbolsByMdFile(mdFile: string): SymbolEntry[];
    get all(): SymbolEntry[];
    get allSymbols(): string[];
    get size(): number;
    get resolvedCount(): number;
    clear(): void;
    /** Serialize registry state for debugging */
    toJSON(): object;
}
//# sourceMappingURL=MappingRegistry.d.ts.map