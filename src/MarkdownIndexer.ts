// MarkdownIndexer — parses Internal Design Markdown files for symbol tags
import * as vscode from 'vscode';
import * as path from 'path';
import { SymbolEntry } from './types';
import { MappingRegistry } from './MappingRegistry';

export class MarkdownIndexer {
  private registry: MappingRegistry;
  private markerTag: string = 'symbol:';
  private symbolRegex: RegExp = /symbol:\s*([A-Za-z_$][A-Za-z0-9_$]*#[a-zA-Z_$][a-zA-Z0-9_$]*)/g;

  // Regex to extract section headings: ## Title, ### Title, etc.
  private sectionHeadingRegex = /^(#{1,6})\s+(.+)$/;

  // Cache of active sections while parsing a file
  private activeSections: Array<{
    heading: string;
    level: number;
    title: string;
    line: number;
    path: string;
  }> = [];

  constructor(registry: MappingRegistry) {
    this.registry = registry;
  }

  updateConfig(markerTag: string) {
    this.markerTag = markerTag;
    const escaped = markerTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    this.symbolRegex = new RegExp(`${escaped}\\s*([A-Za-z_$][A-Za-z0-9_$]*#[a-zA-Z_$][a-zA-Z0-9_$]*)`, 'g');
  }

  /**
   * Index a single Markdown document and update the registry.
   * Returns the number of symbols found.
   */
  async indexDocument(doc: vscode.TextDocument): Promise<SymbolEntry[]> {
    const uri = doc.uri.fsPath.replace(/\\/g, '/');
    const text = doc.getText();
    const lines = text.split('\n');

    this.activeSections = [];
    const entries: SymbolEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1; // 1-indexed

      this.updateActiveSection(line, lineNum);
      this.parseSymbolLine(line, lineNum, uri, entries);
    }

    this.registry.upsertAll(entries);
    return entries;
  }

  /**
   * Index all Markdown files matching configured patterns.
   */
  async indexWorkspace(uris: vscode.Uri[], progress?: (msg: string) => void): Promise<number> {
    let total = 0;
    for (const uri of uris) {
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        const entries = await this.indexDocument(doc);
        total += entries.length;
        if (progress) {
          progress(`Indexed ${path.basename(uri.fsPath)}: ${entries.length} symbols`);
        }
      } catch (err) {
        console.error(`Failed to index ${uri.fsPath}:`, err);
      }
    }
    return total;
  }

  /** Parse a Markdown heading line to update active section stack */
  private updateActiveSection(line: string, lineNum: number): void {
    const match = line.match(this.sectionHeadingRegex);
    if (!match) return;

    const level = match[1].length;
    const title = match[2].trim();

    // Build path by popping sections of same or deeper level
    this.activeSections = this.activeSections.filter(s => s.level < level);

    const currentPath = this.activeSections.length > 0
      ? this.activeSections.map(s => s.title).join(' > ') + ' > ' + title
      : title;

    this.activeSections.push({ heading: line.trim(), level, title, line: lineNum, path: currentPath });
  }

  /** Extract symbol tags from a line */
  private parseSymbolLine(line: string, lineNum: number, mdFile: string, entries: SymbolEntry[]): void {
    const heading = this.activeSections.length > 0
      ? this.activeSections[this.activeSections.length - 1]
      : undefined;

    let match: RegExpExecArray | null;
    this.symbolRegex.lastIndex = 0;

    while ((match = this.symbolRegex.exec(line)) !== null) {
      const symbol = match[1].trim();
      const [className, methodName] = symbol.split('#');

      entries.push({
        symbol,
        className,
        methodName,
        mdFile,
        mdSection: heading?.path ?? 'General',
        mdLine: lineNum,
      });
    }
  }

  /**
   * Extract all symbols from a line of text (utility for preview/decoration).
   */
  findSymbolsInText(text: string): string[] {
    const symbols: string[] = [];
    let match: RegExpExecArray | null;
    this.symbolRegex.lastIndex = 0;

    while ((match = this.symbolRegex.exec(text)) !== null) {
      symbols.push(match[1].trim());
    }
    return symbols;
  }
}
