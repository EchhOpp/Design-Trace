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
exports.MarkdownIndexer = void 0;
// MarkdownIndexer — parses Internal Design Markdown files for symbol tags
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class MarkdownIndexer {
    constructor(registry) {
        this.markerTag = 'symbol:';
        this.symbolRegex = /symbol:\s*([A-Za-z_$][A-Za-z0-9_$]*#[a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        // Regex to extract section headings: ## Title, ### Title, etc.
        this.sectionHeadingRegex = /^(#{1,6})\s+(.+)$/;
        // Cache of active sections while parsing a file
        this.activeSections = [];
        this.registry = registry;
    }
    updateConfig(markerTag) {
        this.markerTag = markerTag;
        const escaped = markerTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        this.symbolRegex = new RegExp(`${escaped}\\s*([A-Za-z_$][A-Za-z0-9_$]*#[a-zA-Z_$][a-zA-Z0-9_$]*)`, 'g');
    }
    /**
     * Index a single Markdown document and update the registry.
     * Returns the number of symbols found.
     */
    async indexDocument(doc) {
        const uri = doc.uri.fsPath.replace(/\\/g, '/');
        const text = doc.getText();
        const lines = text.split('\n');
        this.activeSections = [];
        const entries = [];
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
    async indexWorkspace(uris, progress) {
        let total = 0;
        for (const uri of uris) {
            try {
                const doc = await vscode.workspace.openTextDocument(uri);
                const entries = await this.indexDocument(doc);
                total += entries.length;
                if (progress) {
                    progress(`Indexed ${path.basename(uri.fsPath)}: ${entries.length} symbols`);
                }
            }
            catch (err) {
                console.error(`Failed to index ${uri.fsPath}:`, err);
            }
        }
        return total;
    }
    /** Parse a Markdown heading line to update active section stack */
    updateActiveSection(line, lineNum) {
        const match = line.match(this.sectionHeadingRegex);
        if (!match)
            return;
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
    parseSymbolLine(line, lineNum, mdFile, entries) {
        const heading = this.activeSections.length > 0
            ? this.activeSections[this.activeSections.length - 1]
            : undefined;
        let match;
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
    findSymbolsInText(text) {
        const symbols = [];
        let match;
        this.symbolRegex.lastIndex = 0;
        while ((match = this.symbolRegex.exec(text)) !== null) {
            symbols.push(match[1].trim());
        }
        return symbols;
    }
}
exports.MarkdownIndexer = MarkdownIndexer;
//# sourceMappingURL=MarkdownIndexer.js.map