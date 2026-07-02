import * as vscode from 'vscode';
import { SymbolEntry } from './types';
import { MappingRegistry } from './MappingRegistry';
export declare class MarkdownIndexer {
    private registry;
    private markerTag;
    private symbolRegex;
    private sectionHeadingRegex;
    private activeSections;
    constructor(registry: MappingRegistry);
    updateConfig(markerTag: string): void;
    /**
     * Index a single Markdown document and update the registry.
     * Returns the number of symbols found.
     */
    indexDocument(doc: vscode.TextDocument): Promise<SymbolEntry[]>;
    /**
     * Index all Markdown files matching configured patterns.
     */
    indexWorkspace(uris: vscode.Uri[], progress?: (msg: string) => void): Promise<number>;
    /** Parse a Markdown heading line to update active section stack */
    private updateActiveSection;
    /** Extract symbol tags from a line */
    private parseSymbolLine;
    /**
     * Extract all symbols from a line of text (utility for preview/decoration).
     */
    findSymbolsInText(text: string): string[];
}
//# sourceMappingURL=MarkdownIndexer.d.ts.map