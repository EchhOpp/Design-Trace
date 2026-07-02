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
exports.activate = activate;
exports.deactivate = deactivate;
// Design Trace Extension — Main Entry Point
const vscode = __importStar(require("vscode"));
const MappingRegistry_1 = require("./MappingRegistry");
const MarkdownIndexer_1 = require("./MarkdownIndexer");
const JavaSymbolResolver_1 = require("./JavaSymbolResolver");
const DesignTraceLinkProvider_1 = require("./providers/DesignTraceLinkProvider");
const DecorationProvider_1 = require("./providers/DecorationProvider");
const HoverProvider_1 = require("./providers/HoverProvider");
const CodeLensProvider_1 = require("./providers/CodeLensProvider");
const DesignTraceTreeProvider_1 = require("./providers/DesignTraceTreeProvider");
const StatusBarController_1 = require("./StatusBarController");
let registry;
let indexer;
let resolver;
let decorationProvider;
let codeLensProvider;
let treeProvider;
let statusBar;
let disposables = [];
let config;
function loadConfig() {
    const cfg = vscode.workspace.getConfiguration('design-trace');
    return {
        mdPatterns: cfg.get('mdPatterns', ['**/*.md']),
        javaPatterns: cfg.get('javaPatterns', ['**/*.java']),
        markerTag: cfg.get('markerTag', 'symbol:'),
        ignoredSymbols: cfg.get('ignoredSymbols', []),
        autoIndex: cfg.get('autoIndex', true),
        showGutterIcons: cfg.get('showGutterIcons', true),
        showCodeLens: cfg.get('showCodeLens', true),
        showHover: cfg.get('showHover', true),
        iconTheme: cfg.get('iconTheme', 'dot'),
    };
}
async function reindex() {
    const cfg = loadConfig();
    registry.updateConfig(cfg);
    indexer.updateConfig(cfg.markerTag);
    registry.clear();
    // Find and index all Markdown files
    const mdUris = await vscode.workspace.findFiles(cfg.mdPatterns.length > 0 ? `{${cfg.mdPatterns.join(',')}}` : '**/*.md', '**/node_modules/**', 1000);
    const statusMsg = vscode.window.setStatusBarMessage('$(sync~spin) Design Trace: indexing...');
    try {
        const totalSymbols = await indexer.indexWorkspace(mdUris, (msg) => {
            vscode.window.showInformationMessage(msg);
        });
        // Resolve Java symbol locations
        const resolvedCount = await resolver.resolveAll();
        const summary = `${totalSymbols} symbols indexed, ${resolvedCount} resolved`;
        vscode.window.setStatusBarMessage(`$(check) Design Trace: ${summary}`, 5000);
        statusBar.showMessage(summary);
        // Refresh decorations
        decorationProvider.refreshAllEditors();
        treeProvider.refresh();
        // Update hasData context key
        vscode.commands.executeCommand('setContext', 'designTraceHasData', registry.size > 0);
    }
    finally {
        statusMsg.dispose();
    }
}
function registerCommands() {
    // Re-index all Markdown files
    const reindexCmd = vscode.commands.registerCommand('design-trace.reindex', async () => {
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Design Trace: Re-indexing...' }, async () => { await reindex(); });
    });
    disposables.push(reindexCmd);
    // Open the sidebar panel
    const openPanelCmd = vscode.commands.registerCommand('design-trace.openPanel', () => {
        vscode.commands.executeCommand('workbench.view.explorer');
    });
    disposables.push(openPanelCmd);
    // Navigate from symbol to Java code (from sidebar or CodeLens)
    const navigateCmd = vscode.commands.registerCommand('design-trace.navigateToCode', async (symbol) => {
        const entry = registry.getResolved(symbol);
        if (!entry?.location) {
            vscode.window.showWarningMessage(`Symbol "${symbol}" not yet resolved to Java code. Run "Re-index" first.`);
            return;
        }
        const loc = entry.location;
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(loc.file));
        const editor = await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.One,
            preserveFocus: false,
        });
        const startPos = new vscode.Position(loc.range.startLine - 1, 0);
        const endPos = new vscode.Position(loc.range.endLine - 1, 0);
        editor.revealRange(new vscode.Range(startPos, endPos), vscode.TextEditorRevealType.InCenter);
        editor.selection = new vscode.Selection(startPos, startPos);
    });
    disposables.push(navigateCmd);
    // Open Internal Design from a Java symbol
    const openMdCmd = vscode.commands.registerCommand('design-trace.openMdFromSymbol', async (symbol) => {
        const entry = registry.get(symbol);
        if (!entry) {
            vscode.window.showWarningMessage(`Symbol "${symbol}" not found in registry.`);
            return;
        }
        const mdFile = entry.mdFile;
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(mdFile));
        const editor = await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: true,
        });
        if (entry.mdLine > 0) {
            const pos = new vscode.Position(entry.mdLine - 1, 0);
            editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
            editor.selection = new vscode.Selection(pos, pos);
        }
    });
    disposables.push(openMdCmd);
    // Copy symbol to clipboard
    const copySymbolCmd = vscode.commands.registerCommand('design-trace.copySymbol', async (symbol) => {
        await vscode.env.clipboard.writeText(symbol);
        statusBar.showMessage(`Copied: ${symbol}`);
    });
    disposables.push(copySymbolCmd);
    // Link current Java file (manual entry)
    const linkCurrentCmd = vscode.commands.registerCommand('design-trace.linkCurrent', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        if (editor.document.languageId !== 'java') {
            vscode.window.showWarningMessage('This command only works in Java files.');
            return;
        }
        const filePath = editor.document.uri.fsPath;
        const symbols = registry.getSymbolsByFile(filePath);
        if (symbols.length === 0) {
            // Try to resolve the file's class name and search
            await resolver.resolveFile(editor.document.uri);
            const newSymbols = registry.getSymbolsByFile(filePath);
            if (newSymbols.length === 0) {
                vscode.window.showInformationMessage('No mapped symbols found in this file.');
                return;
            }
        }
        const items = registry.getSymbolsByFile(filePath).map(s => ({
            label: s.symbol,
            description: s.mdSection,
            symbol: s.symbol,
        }));
        const picked = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a symbol to navigate to its Internal Design',
        });
        if (picked) {
            vscode.commands.executeCommand('design-trace.openMdFromSymbol', picked.symbol);
        }
    });
    disposables.push(linkCurrentCmd);
}
function registerProviders() {
    // DocumentLinkProvider for Markdown files
    const linkProvider = new DesignTraceLinkProvider_1.DesignTraceLinkProvider(registry, config.markerTag);
    disposables.push(vscode.languages.registerDocumentLinkProvider({ language: 'markdown', scheme: 'file' }, linkProvider));
    // HoverProvider for Java files
    if (config.showHover) {
        disposables.push(vscode.languages.registerHoverProvider({ language: 'java', scheme: 'file' }, new HoverProvider_1.HoverProvider(registry)));
    }
    // CodeLensProvider for Java files
    if (config.showCodeLens) {
        codeLensProvider = new CodeLensProvider_1.CodeLensProvider(registry);
        disposables.push(vscode.languages.registerCodeLensProvider({ language: 'java', scheme: 'file' }, codeLensProvider));
    }
    // File watchers
    registerFileWatchers();
}
function registerFileWatchers() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder)
        return;
    // Watch Markdown files for changes
    const mdWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspaceFolder, config.mdPatterns.length > 0 ? `{${config.mdPatterns.join(',')}}` : '**/*.md'));
    disposables.push(mdWatcher);
    mdWatcher.onDidChange(async (uri) => {
        if (!config.autoIndex)
            return;
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            await indexer.indexDocument(doc);
            await resolver.resolveAll();
            decorationProvider.refreshAllEditors();
            treeProvider.refresh();
        }
        catch (err) {
            console.error('Failed to re-index Markdown:', err);
        }
    });
    mdWatcher.onDidCreate(async (uri) => {
        if (!config.autoIndex)
            return;
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            await indexer.indexDocument(doc);
            await resolver.resolveAll();
            decorationProvider.refreshAllEditors();
            treeProvider.refresh();
        }
        catch (err) {
            console.error('Failed to index new Markdown:', err);
        }
    });
    // Watch Java files for changes (to refresh decorations)
    const javaWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspaceFolder, config.javaPatterns.length > 0 ? `{${config.javaPatterns.join(',')}}` : '**/*.java'));
    disposables.push(javaWatcher);
    javaWatcher.onDidChange(async (uri) => {
        if (!config.autoIndex)
            return;
        await resolver.resolveFile(uri);
        decorationProvider.refreshAllEditors();
        treeProvider.refresh();
    });
    javaWatcher.onDidCreate(async (uri) => {
        if (!config.autoIndex)
            return;
        await resolver.resolveFile(uri);
        decorationProvider.refreshAllEditors();
    });
}
function applyDecorationsOnEditorOpen(event) {
    if (event.document.languageId === 'java' && config.showGutterIcons) {
        decorationProvider.applyToEditor(event);
    }
}
async function activate(context) {
    console.log('[Design Trace] Extension activating...');
    // Load configuration
    config = loadConfig();
    // Initialize core components
    registry = new MappingRegistry_1.MappingRegistry(config);
    indexer = new MarkdownIndexer_1.MarkdownIndexer(registry);
    indexer.updateConfig(config.markerTag);
    resolver = new JavaSymbolResolver_1.JavaSymbolResolver(registry);
    // Initialize providers
    decorationProvider = new DecorationProvider_1.DecorationProvider(registry);
    treeProvider = new DesignTraceTreeProvider_1.DesignTraceTreeProvider(registry);
    statusBar = new StatusBarController_1.StatusBarController(registry);
    // Register commands
    registerCommands();
    // Register tree view
    disposables.push(vscode.window.registerTreeDataProvider('design-trace-explorer', treeProvider));
    // Register all providers
    registerProviders();
    // Apply decorations to already-open editors
    for (const editor of vscode.window.visibleTextEditors) {
        applyDecorationsOnEditorOpen(editor);
    }
    // Listen for editors opening
    disposables.push(vscode.window.onDidChangeVisibleTextEditors((editors) => {
        for (const editor of editors) {
            applyDecorationsOnEditorOpen(editor);
        }
    }));
    // Listen for config changes
    disposables.push(vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('design-trace')) {
            const newConfig = loadConfig();
            registry.updateConfig(newConfig);
            indexer.updateConfig(newConfig.markerTag);
            config = newConfig;
            decorationProvider.refreshAllEditors();
            codeLensProvider?.refresh();
            treeProvider.refresh();
        }
    }));
    // Perform initial index
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        await reindex();
    }
    console.log('[Design Trace] Extension activated.');
}
function deactivate() {
    decorationProvider?.dispose();
    statusBar?.dispose();
    disposables.forEach(d => d.dispose());
}
//# sourceMappingURL=extension.js.map