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
        this.methodDeclarationRegex = /^(?:(?:@[\w.]+\s+)*)?(?:\s*(?:public|private|protected)?\s*)?\s*(?:\s*(?:static|final|abstract|synchronized|native|strictfp|transient|volatile)\s+)*(?:\s*(?:static|final|abstract|synchronized|native|strictfp|transient|volatile)\s+)*(?:\s*(?:<[^>]+>\s+)?(?:\w+(?:<[^>]+>)?(?:\[\s*\])*)\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm;
        this.classDeclarationRegex = /^(?:@[\w.]+\s+)*\s*(?:public|private|protected)?\s*(?:static)?\s*(?:final|abstract)?\s*(?:sealed|non-sealed)?\s*(?:class|interface|enum|record)\s+([A-Za-z_$][a-zA-Z0-9_$]*)/gm;
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
        const classMatch = this.findClassName(text);
        if (!classMatch)
            return 0;
        const className = classMatch.name;
        const unresolved = this.registry.getUnresolved();
        const relevant = unresolved.filter(e => e.className === className);
        if (relevant.length === 0)
            return 0;
        const locations = this.scanFileForSymbols(text, doc, filePath, className);
        const resolutions = new Map();
        for (const loc of locations) {
            if (relevant.some(e => e.methodName === loc.methodName)) {
                resolutions.set(loc.symbol, { file: loc.file, range: loc.range, mdSection: loc.mdSection, mdFile: loc.mdFile });
            }
        }
        this.registry.resolveAll(resolutions);
        return resolutions.size;
    }
    findClassName(text) {
        this.classDeclarationRegex.lastIndex = 0;
        let match;
        let firstMatch;
        while ((match = this.classDeclarationRegex.exec(text)) !== null) {
            const textBefore = text.substring(0, match.index);
            const line = textBefore.split('\n').length;
            if (!firstMatch)
                firstMatch = { name: match[1], line };
        }
        return firstMatch;
    }
    async findSymbolLocations(className, symbols) {
        const results = [];
        const javaFiles = await vscode.workspace.findFiles(`**/${className}.java`, undefined);
        const otherFiles = await vscode.workspace.findFiles(`**/*.java`, undefined);
        const searchFiles = javaFiles.length > 0 ? javaFiles : otherFiles.slice(0, 100);
        for (const uri of searchFiles) {
            try {
                const doc = await vscode.workspace.openTextDocument(uri);
                const text = doc.getText();
                const filePath = uri.fsPath.replace(/\\/g, '/');
                const foundClassName = this.findClassName(text);
                if (!foundClassName || foundClassName.name !== className)
                    continue;
                const locations = this.scanFileForSymbols(text, doc, filePath, className);
                for (const loc of locations) {
                    if (symbols.includes(loc.symbol)) {
                        results.push([loc.symbol, { file: loc.file, range: loc.range, mdSection: loc.mdSection, mdFile: loc.mdFile }]);
                    }
                }
            }
            catch {
                // Skip files we can't read
            }
        }
        return results;
    }
    scanFileForSymbols(text, doc, filePath, className) {
        const results = [];
        const unresolved = this.registry.getUnresolved();
        const classEntries = unresolved.filter(e => e.className === className);
        const targetMethods = new Set(classEntries.map(e => e.methodName));
        if (targetMethods.size === 0)
            return results;
        this.methodDeclarationRegex.lastIndex = 0;
        let match;
        while ((match = this.methodDeclarationRegex.exec(text)) !== null) {
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