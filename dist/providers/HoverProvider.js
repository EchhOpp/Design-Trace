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
exports.HoverProvider = void 0;
// HoverProvider — shows hover tooltip for mapped Java symbols
const vscode = __importStar(require("vscode"));
class HoverProvider {
    constructor(registry) {
        this.registry = registry;
    }
    provideHover(doc, position, _token) {
        const uri = doc.uri.fsPath.replace(/\\/g, '/');
        const line = position.line + 1; // convert to 1-indexed
        const symbols = this.registry.getSymbolsByFile(uri);
        const match = symbols.find((s) => line >= s.location.range.startLine && line <= s.location.range.endLine);
        if (!match)
            return null;
        const loc = match.location;
        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.appendMarkdown(`**⚡ Design Trace**\n\n` +
            `**Section:** ${match.mdSection}\n\n` +
            `**Location:** \`${getBasename(loc.file)}\` lines ${loc.range.startLine}–${loc.range.endLine}\n\n` +
            `[📄 Open Internal Design](command:design-trace.openMdFromSymbol?${encodeURIComponent(match.symbol)})\n`);
        return new vscode.Hover(md, new vscode.Range(position, position));
    }
}
exports.HoverProvider = HoverProvider;
function getBasename(filePath) {
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] ?? filePath;
}
//# sourceMappingURL=HoverProvider.js.map