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
exports.DesignTraceLinkProvider = void 0;
// DesignTraceLinkProvider — makes symbol: entries in Markdown clickable links
const vscode = __importStar(require("vscode"));
class DesignTraceLinkProvider {
    constructor(registry, markerTag) {
        this.registry = registry;
        this.markerTag = markerTag;
    }
    updateMarkerTag(tag) {
        this.markerTag = tag;
    }
    provideDocumentLinks(doc, _token) {
        const text = doc.getText();
        const links = [];
        // Escape the marker tag for regex
        const escapedTag = this.markerTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTag})\\s*([A-Za-z_$][A-Za-z0-9_$]*#[a-zA-Z_$][a-zA-Z0-9_$]*)`, 'g');
        let match;
        while ((match = regex.exec(text)) !== null) {
            const fullMatch = match[0];
            const symbol = match[2];
            const startPos = doc.positionAt(match.index);
            const endPos = doc.positionAt(match.index + fullMatch.length);
            const isResolved = this.registry.isResolved(symbol);
            const link = new vscode.DocumentLink(new vscode.Range(startPos, endPos), vscode.Uri.parse(`command:design-trace.navigateToCode?${encodeURIComponent(symbol)}`));
            if (isResolved) {
                const entry = this.registry.getResolved(symbol);
                link.tooltip = `Navigate to ${entry.location.file}:${entry.location.range.startLine}`;
            }
            else {
                link.tooltip = `Symbol "${symbol}" not yet resolved to Java code`;
            }
            links.push(link);
        }
        return links;
    }
}
exports.DesignTraceLinkProvider = DesignTraceLinkProvider;
//# sourceMappingURL=DesignTraceLinkProvider.js.map