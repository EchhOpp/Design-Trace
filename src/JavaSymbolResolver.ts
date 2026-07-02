// JavaSymbolResolver — resolves ClassName#method symbols to line ranges in Java files
import * as vscode from 'vscode';
import { CodeLocation, LineRange } from './types';
import { MappingRegistry } from './MappingRegistry';

interface JavaMethodLocation {
  symbol: string;
  file: string;
  range: LineRange;
  mdSection: string;
  mdFile: string;
  methodName: string;
}

export class JavaSymbolResolver {
  private registry: MappingRegistry;

  constructor(registry: MappingRegistry) {
    this.registry = registry;
  }

  async resolveAll(progress?: (msg: string) => void): Promise<number> {
    const unresolved = this.registry.getUnresolved();
    if (unresolved.length === 0) return 0;

    const byClass = new Map<string, string[]>();
    for (const entry of unresolved) {
      const list = byClass.get(entry.className) ?? [];
      list.push(entry.symbol);
      byClass.set(entry.className, list);
    }

    let resolved = 0;

    for (const [className, symbols] of byClass) {
      const locations = await this.findSymbolLocations(className, symbols);
      for (const [symbol, location] of locations) {
        this.registry.resolveSymbol(symbol, location);
        resolved++;
      }
    }

    if (progress && resolved > 0) {
      progress(`Resolved ${resolved} / ${unresolved.length} symbols`);
    }

    return resolved;
  }

  async resolveFile(uri: vscode.Uri): Promise<number> {
    const doc = await vscode.workspace.openTextDocument(uri);
    const text = doc.getText();
    const filePath = uri.fsPath.replace(/\\/g, '/');

    const className = await this.getClassNameFromDocument(doc);
    if (!className) return 0;

    const unresolved = this.registry.getUnresolved();
    const relevant = unresolved.filter(e => e.className === className);

    if (relevant.length === 0) return 0;

    const locations = await this.scanDocumentForSymbols(doc, text, filePath, className);
    const resolutions = new Map<string, CodeLocation>();

    for (const loc of locations) {
      if (relevant.some(e => e.methodName === loc.methodName)) {
        resolutions.set(loc.symbol, { file: loc.file, range: loc.range, mdSection: loc.mdSection, mdFile: loc.mdFile });
      }
    }

    this.registry.resolveAll(resolutions);
    return resolutions.size;
  }

  private async getClassNameFromDocument(doc: vscode.TextDocument): Promise<string | undefined> {
    try {
      const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        doc.uri
      );
      if (!symbols) return undefined;
      return this.findTopLevelClass(symbols)?.name;
    } catch {
      return this.findClassNameByRegex(doc.getText());
    }
  }

  private findTopLevelClass(symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol | undefined {
    for (const sym of symbols) {
      if (sym.kind === vscode.SymbolKind.Class ||
          sym.kind === vscode.SymbolKind.Interface ||
          sym.kind === vscode.SymbolKind.Enum) {
        return sym;
      }
      const found = this.findTopLevelClass(sym.children);
      if (found) return found;
    }
    return undefined;
  }

  private findClassNameByRegex(text: string): string | undefined {
    // Match class/interface/enum/record declarations, handling modifiers
    const regex = /^\s*(?:@[\w.]+\s*(?:\n\s*)?)*\s*(?:public|private|protected)?\s*(?:static)?\s*(?:final|abstract|sealed|non-sealed)?\s*(?:class|interface|enum|record)\s+([A-Za-z_$][a-zA-Z0-9_$]*)/gm;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      return match[1];
    }
    return undefined;
  }

  private async findSymbolLocations(className: string, symbols: string[]): Promise<Array<[string, CodeLocation]>> {
    const results: Array<[string, CodeLocation]> = [];

    // Try to find the specific file first
    const specificFiles = await vscode.workspace.findFiles(`**/${className}.java`, undefined);
    const searchFiles = specificFiles.length > 0 ? specificFiles : [];

    for (const uri of searchFiles) {
      const locations = await this.getLocationsFromFile(uri, className, symbols);
      results.push(...locations);
    }

    return results;
  }

  private async getLocationsFromFile(uri: vscode.Uri, className: string, symbols: string[]): Promise<Array<[string, CodeLocation]>> {
    const results: Array<[string, CodeLocation]> = [];

    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      const text = doc.getText();
      const filePath = uri.fsPath.replace(/\\/g, '/');

      const locations = await this.scanDocumentForSymbols(doc, text, filePath, className);

      for (const loc of locations) {
        if (symbols.includes(loc.symbol)) {
          results.push([loc.symbol, { file: loc.file, range: loc.range, mdSection: loc.mdSection, mdFile: loc.mdFile }]);
        }
      }
    } catch {
      // Skip files we can't read
    }

    return results;
  }

  private async scanDocumentForSymbols(
    doc: vscode.TextDocument,
    text: string,
    filePath: string,
    className: string
  ): Promise<JavaMethodLocation[]> {
    const results: JavaMethodLocation[] = [];

    const unresolved = this.registry.getUnresolved();
    const classEntries = unresolved.filter(e => e.className === className);
    const targetMethods = new Set(classEntries.map(e => e.methodName));

    if (targetMethods.size === 0) return results;

    // Try VS Code DocumentSymbolProvider first
    try {
      const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        doc.uri
      );

      if (symbols) {
        const classSymbol = this.findClassSymbol(symbols, className);
        if (classSymbol) {
          const methodSymbols = this.findMethodsRecursive(classSymbol.children, targetMethods);
          for (const method of methodSymbols) {
            const symbol = `${className}#${method.name}`;
            const entry = classEntries.find(e => e.methodName === method.name);
            if (entry) {
              results.push({
                symbol,
                file: filePath,
                range: {
                  startLine: method.range.start.line + 1,
                  endLine: method.range.end.line + 1,
                },
                mdSection: entry.mdSection,
                mdFile: entry.mdFile,
                methodName: method.name,
              });
            }
          }
          return results;
        }
      }
    } catch {
      // Fall back to regex
    }

    // Fallback: regex scan for methods
    return this.scanFileForSymbolsRegex(text, doc, filePath, className);
  }

  private findClassSymbol(symbols: vscode.DocumentSymbol[], className: string): vscode.DocumentSymbol | undefined {
    for (const sym of symbols) {
      if ((sym.kind === vscode.SymbolKind.Class ||
           sym.kind === vscode.SymbolKind.Interface ||
           sym.kind === vscode.SymbolKind.Enum) && sym.name === className) {
        return sym;
      }
    }
    return undefined;
  }

  private findMethodsRecursive(symbols: vscode.DocumentSymbol[], targetMethods: Set<string>): vscode.DocumentSymbol[] {
    const results: vscode.DocumentSymbol[] = [];
    for (const sym of symbols) {
      if (sym.kind === vscode.SymbolKind.Method && targetMethods.has(sym.name)) {
        results.push(sym);
      }
      if (sym.children.length > 0) {
        results.push(...this.findMethodsRecursive(sym.children, targetMethods));
      }
    }
    return results;
  }

  private scanFileForSymbolsRegex(
    text: string,
    doc: vscode.TextDocument,
    filePath: string,
    className: string
  ): JavaMethodLocation[] {
    const results: JavaMethodLocation[] = [];

    const unresolved = this.registry.getUnresolved();
    const classEntries = unresolved.filter(e => e.className === className);
    const targetMethods = new Set(classEntries.map(e => e.methodName));

    if (targetMethods.size === 0) return results;

    // Simpler regex: match return type + method name + (
    // Handles: public/protected/private/static/final/abstract/synchronized + optional <T> + return type + name + (
    const methodRegex = /^\s*(?:(?:public|protected|private)\s+)?(?:(?:static|final|abstract|synchronized|native|strictfp|transient|volatile)\s+)*\s*(?:<[\w\s,.]+>\s+)?\s*[\w<>\[\]]+\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm;

    let match: RegExpExecArray | null;
    while ((match = methodRegex.exec(text)) !== null) {
      const methodName = match[1];
      if (!targetMethods.has(methodName)) continue;

      const textBefore = text.substring(0, match.index);
      const startLine = textBefore.split('\n').length;

      const afterMatch = text.substring(match.index);
      const endLine = this.findMethodEndLine(afterMatch, startLine);

      const symbol = `${className}#${methodName}`;
      const entry = classEntries.find(e => e.methodName === methodName);

      if (entry) {
        results.push({
          symbol,
          file: filePath,
          range: { startLine, endLine },
          mdSection: entry.mdSection,
          mdFile: entry.mdFile,
          methodName,
        });
      }
    }

    return results;
  }

  private findMethodEndLine(remainingText: string, startLine: number): number {
    let braceCount = 0;
    let started = false;
    const lines = remainingText.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
          if (started && braceCount === 0) {
            return startLine + i;
          }
        }
      }
    }

    return startLine + 5;
  }
}
