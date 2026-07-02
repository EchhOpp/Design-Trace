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
exports.DecorationProvider = void 0;
// DecorationProvider — applies green gutter icons to mapped Java methods
const vscode = __importStar(require("vscode"));
class DecorationProvider {
    constructor(registry) {
        this.activeDecorations = new Map();
        this.registry = registry;
        this.decorationType = vscode.window.createTextEditorDecorationType({
            ...{ glyphMargin: {
                    light: DecorationProvider.lightIconPath,
                    dark: DecorationProvider.resolvedIconPath,
                } },
            overviewRulerColor: '#4CAF50',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
        });
        this.decorationUnresolved = vscode.window.createTextEditorDecorationType({
            ...{ glyphMargin: {
                    light: vscode.Uri.parse('data:image/svg+xml,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="5" fill="none" stroke="#999" stroke-width="1.5" stroke-dasharray="3,2"/>
            <circle cx="8" cy="8" r="2" fill="#bbb"/>
          </svg>
        `)),
                    dark: vscode.Uri.parse('data:image/svg+xml,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="5" fill="none" stroke="#888" stroke-width="1.5" stroke-dasharray="3,2"/>
            <circle cx="8" cy="8" r="2" fill="#aaa"/>
          </svg>
        `)),
                } },
            overviewRulerColor: '#999999',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
        });
        // Listen for registry updates
        this.registry.onDidUpdate(() => {
            this.refreshAllEditors();
        });
    }
    /** Apply decorations to a specific editor */
    applyToEditor(editor) {
        if (editor.document.languageId !== 'java')
            return;
        const uri = editor.document.uri.fsPath.replace(/\\/g, '/');
        const resolved = this.registry.getSymbolsByFile(uri);
        const options = [];
        for (const entry of resolved) {
            const range = new vscode.Range(entry.location.range.startLine - 1, 0, entry.location.range.endLine - 1, 0);
            options.push({
                range,
                hoverMessage: new vscode.MarkdownString(`**Internal Design**: ${entry.mdSection}\n\n` +
                    `File: \`${getBasename(entry.location.file)}\` (lines ${entry.location.range.startLine}–${entry.location.range.endLine})\n\n` +
                    `[Open Internal Design](command:design-trace.openMdFromSymbol?${encodeURIComponent(entry.symbol)})`),
            });
        }
        if (options.length > 0) {
            editor.setDecorations(this.decorationType, options);
            this.activeDecorations.set(uri, options);
        }
        else {
            editor.setDecorations(this.decorationType, []);
            this.activeDecorations.delete(uri);
        }
    }
    /** Remove decorations from an editor */
    removeFromEditor(editor) {
        const uri = editor.document.uri.fsPath.replace(/\\/g, '/');
        editor.setDecorations(this.decorationType, []);
        this.activeDecorations.delete(uri);
    }
    /** Refresh decorations for all active Java editors */
    refreshAllEditors() {
        for (const editor of vscode.window.visibleTextEditors) {
            if (editor.document.languageId === 'java') {
                this.applyToEditor(editor);
            }
        }
    }
    dispose() {
        this.decorationType.dispose();
        this.decorationUnresolved.dispose();
    }
}
exports.DecorationProvider = DecorationProvider;
DecorationProvider.resolvedIconPath = vscode.Uri.parse('data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="#4CAF50" opacity="0.85"/>
        <circle cx="8" cy="8" r="3" fill="white"/>
      </svg>
    `));
DecorationProvider.lightIconPath = vscode.Uri.parse('data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="#66BB6A" opacity="0.85"/>
        <circle cx="8" cy="8" r="3" fill="white"/>
      </svg>
    `));
function getBasename(filePath) {
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] ?? filePath;
}
//# sourceMappingURL=DecorationProvider.js.map