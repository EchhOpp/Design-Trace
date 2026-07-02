"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaSymbolResolver = void 0;
// JavaSymbolResolver — resolves ClassName#method symbols to line ranges in Java files
const vscode = __importStar(require("vscode"));
class JavaSymbolResolver {
    constructor(registry) {
        this.registry = registry;
    }
    async resolveAll(progress) {
        const unresolved = this.registry.getUnresolved();
        if (unresolved.length === 0)
            return 0;
        const byClass = new Map();
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
    async resolveFile(uri) {
        const doc = await vscode.workspace.openTextDocument(uri);
        const text = doc.getText();
        const filePath = uri.fsPath.replace(/\\/g, '/');
        const className = await this.getClassNameFromDocument(doc);
        if (!className)
            return 0;
        const unresolved = this.registry.getUnresolved();
        const relevant = unresolved.filter(e => e.className === className);
        if (relevant.length === 0)
            return 0;
        const locations = await this.scanDocumentForSymbols(doc, text, filePath, className);
        const resolutions = new Map();
        for (const loc of locations) {
            if (relevant.some(e => e.methodName === loc.methodName)) {
                resolutions.set(loc.symbol, { file: loc.file, range: loc.range, mdSection: loc.mdSection, mdFile: loc.mdFile });
            }
        }
        this.registry.resolveAll(resolutions);
        return resolutions.size;
    }
    async getClassNameFromDocument(doc) {
        try {
            const symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', doc.uri);
            if (!symbols)
                return undefined;
            return this.findTopLevelClass(symbols)?.name;
        }
        catch {
            return this.findClassNameByRegex(doc.getText());
        }
    }
    findTopLevelClass(symbols) {
        for (const sym of symbols) {
            if (sym.kind === vscode.SymbolKind.Class ||
                sym.kind === vscode.SymbolKind.Interface ||
                sym.kind === vscode.SymbolKind.Enum) {
                return sym;
            }
            const found = this.findTopLevelClass(sym.children);
            if (found)
                return found;
        }
        return undefined;
    }
    findClassNameByRegex(text) {
        // Match class/interface/enum/record declarations, handling modifiers
        const regex = /^\s*(?:@[\w.]+\s*(?:\n\s*)?)*\s*(?:public|private|protected)?\s*(?:static)?\s*(?:final|abstract|sealed|non-sealed)?\s*(?:class|interface|enum|record)\s+([A-Za-z_$][a-zA-Z0-9_$]*)/gm;
        let match;
        while ((match = regex.exec(text)) !== null) {
            return match[1];
        }
        return undefined;
    }
    async findSymbolLocations(className, symbols) {
        const results = [];
        // Try to find the specific file first
        const specificFiles = await vscode.workspace.findFiles(`**/${className}.java`, undefined);
        const searchFiles = specificFiles.length > 0 ? specificFiles : [];
        for (const uri of searchFiles) {
            const locations = await this.getLocationsFromFile(uri, className, symbols);
            results.push(...locations);
        }
        return results;
    }
    async getLocationsFromFile(uri, className, symbols) {
        const results = [];
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
        }
        catch {
            // Skip files we can't read
        }
        return results;
    }
    async scanDocumentForSymbols(doc, text, filePath, className) {
        const results = [];
        const unresolved = this.registry.getUnresolved();
        const classEntries = unresolved.filter(e => e.className === className);
        const targetMethods = new Set(classEntries.map(e => e.methodName));
        if (targetMethods.size === 0)
            return results;
        // Try VS Code DocumentSymbolProvider first
        try {
            const symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', doc.uri);
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
        }
        catch {
            // Fall back to regex
        }
        // Fallback: regex scan for methods
        return this.scanFileForSymbolsRegex(text, doc, filePath, className);
    }
    findClassSymbol(symbols, className) {
        for (const sym of symbols) {
            if ((sym.kind === vscode.SymbolKind.Class ||
                sym.kind === vscode.SymbolKind.Interface ||
                sym.kind === vscode.SymbolKind.Enum) && sym.name === className) {
                return sym;
            }
        }
        return undefined;
    }
    findMethodsRecursive(symbols, targetMethods) {
        const results = [];
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
    scanFileForSymbolsRegex(text, doc, filePath, className) {
        const results = [];
        const unresolved = this.registry.getUnresolved();
        const classEntries = unresolved.filter(e => e.className === className);
        const targetMethods = new Set(classEntries.map(e => e.methodName));
        if (targetMethods.size === 0)
            return results;
        // Simpler regex: match return type + method name + (
        // Handles: public/protected/private/static/final/abstract/synchronized + optional <T> + return type + name + (
        const methodRegex = /^\s*(?:(?:public|protected|private)\s+)?(?:(?:static|final|abstract|synchronized|native|strictfp|transient|volatile)\s+)*\s*(?:<[\w\s,.]+>\s+)?\s*[\w<>\[\]]+\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm;
        let match;
        while ((match = methodRegex.exec(text)) !== null) {
            const methodName = match[1];
            if (!targetMethods.has(methodName))
                continue;
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
    findMethodEndLine(remainingText, startLine) {
        let braceCount = 0;
        let started = false;
        const lines = remainingText.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const char of line) {
                if (char === '{') {
                    braceCount++;
                    started = true;
                }
                else if (char === '}') {
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
exports.JavaSymbolResolver = JavaSymbolResolver;
//# sourceMappingURL=JavaSymbolResolver.js.map