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
exports.CodeLensProvider = void 0;
// CodeLensProvider — shows "Referenced in Internal Design" above mapped methods
const vscode = __importStar(require("vscode"));
class CodeLensProvider {
    constructor(registry) {
        this.registry = registry;
        this.config = vscode.workspace.getConfiguration('design-trace');
    }
    provideCodeLenses(doc, _token) {
        if (doc.languageId !== 'java')
            return [];
        const showCodeLens = this.config.get('showCodeLens', true);
        if (!showCodeLens)
            return [];
        const uri = doc.uri.fsPath.replace(/\\/g, '/');
        const resolved = this.registry.getSymbolsByFile(uri);
        const lenses = [];
        for (const entry of resolved) {
            const startLine = entry.location.range.startLine - 1;
            const endLine = entry.location.range.endLine - 1;
            // Primary lens: navigate to Internal Design
            const mainLens = new vscode.CodeLens(new vscode.Range(startLine, 0, startLine, 0), {
                title: `📄 ${entry.mdSection}`,
                command: 'design-trace.openMdFromSymbol',
                arguments: [entry.symbol],
                tooltip: 'Open the Internal Design section for this method',
            });
            lenses.push(mainLens);
            // Secondary lens: copy symbol
            const copyLens = new vscode.CodeLens(new vscode.Range(startLine, 80, startLine, 80), {
                title: '$(clippy) Copy Symbol',
                command: 'design-trace.copySymbol',
                arguments: [entry.symbol],
                tooltip: `Copy symbol: ${entry.symbol}`,
            });
            lenses.push(copyLens);
        }
        return lenses;
    }
    resolveCodeLens(lens, _token) {
        return lens;
    }
    /** Refresh lenses when registry changes */
    refresh() {
        this.config = vscode.workspace.getConfiguration('design-trace');
        // Trigger refresh by firing the provider's event
        // The VS Code API will call provideCodeLenses again
    }
}
exports.CodeLensProvider = CodeLensProvider;
//# sourceMappingURL=CodeLensProvider.js.map