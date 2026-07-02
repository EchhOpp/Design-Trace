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
exports.StatusBarController = void 0;
// StatusBarController — shows symbol count and context in VS Code status bar
const vscode = __importStar(require("vscode"));
class StatusBarController {
    constructor(registry) {
        this.disposables = [];
        this.registry = registry;
        this.statusBarItem = vscode.window.createStatusBarItem('design-trace.status', vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = '$(pulse) Design Trace: indexing...';
        this.statusBarItem.command = 'design-trace.openPanel';
        this.statusBarItem.tooltip = 'Design Trace — click to open panel';
        this.statusBarItem.show();
        this.registry.onDidUpdate(() => {
            this.update();
        });
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor(() => {
            this.update();
        }));
    }
    update() {
        const total = this.registry.size;
        const resolved = this.registry.resolvedCount;
        if (total === 0) {
            this.statusBarItem.text = '$(pulse) Design Trace';
            this.statusBarItem.tooltip = 'No symbols indexed yet';
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.statusBarItem.text = `$(link) Design: ${resolved}/${total}`;
            this.statusBarItem.tooltip = `${total} symbols tracked, ${resolved} resolved`;
            return;
        }
        const uri = editor.document.uri.fsPath.replace(/\\/g, '/');
        const fileSymbols = this.registry.getSymbolsByFile(uri);
        const mdSymbols = this.registry.getSymbolsByMdFile(uri);
        if (editor.document.languageId === 'java') {
            if (fileSymbols.length > 0) {
                this.statusBarItem.text = `$(link) Design: ${fileSymbols.length} mapped`;
                this.statusBarItem.tooltip = `${fileSymbols.length} methods referenced in Internal Design`;
            }
            else {
                this.statusBarItem.text = `$(link) Design: 0 mapped`;
                this.statusBarItem.tooltip = 'No methods in this file are referenced in Internal Design';
            }
        }
        else if (editor.document.languageId === 'markdown') {
            this.statusBarItem.text = `$(link) Design: ${mdSymbols.length} symbols`;
            this.statusBarItem.tooltip = `${mdSymbols.length} symbols in this Internal Design document`;
        }
        else {
            this.statusBarItem.text = `$(link) Design: ${resolved}/${total}`;
            this.statusBarItem.tooltip = `${total} symbols tracked, ${resolved} resolved`;
        }
    }
    showMessage(message, type = 'info') {
        switch (type) {
            case 'warn':
                vscode.window.showWarningMessage(`Design Trace: ${message}`);
                break;
            case 'error':
                vscode.window.showErrorMessage(`Design Trace: ${message}`);
                break;
            default:
                vscode.window.showInformationMessage(`Design Trace: ${message}`);
        }
    }
    dispose() {
        this.statusBarItem.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.StatusBarController = StatusBarController;
//# sourceMappingURL=StatusBarController.js.map