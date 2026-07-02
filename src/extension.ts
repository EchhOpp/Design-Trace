// Design Trace Extension — Main Entry Point
import * as vscode from 'vscode';
import { MappingRegistry } from './MappingRegistry';
import { MarkdownIndexer } from './MarkdownIndexer';
import { JavaSymbolResolver } from './JavaSymbolResolver';
import { DesignTraceLinkProvider } from './providers/DesignTraceLinkProvider';
import { DecorationProvider } from './providers/DecorationProvider';
import { HoverProvider } from './providers/HoverProvider';
import { CodeLensProvider } from './providers/CodeLensProvider';
import { DesignTraceTreeProvider } from './providers/DesignTraceTreeProvider';
import { StatusBarController } from './StatusBarController';
import { TraceConfig } from './types';

let registry: MappingRegistry;
let indexer: MarkdownIndexer;
let resolver: JavaSymbolResolver;
let decorationProvider: DecorationProvider;
let codeLensProvider: CodeLensProvider;
let treeProvider: DesignTraceTreeProvider;
let statusBar: StatusBarController;
let config: TraceConfig;
let workspaceFolder: vscode.WorkspaceFolder | undefined;

function loadConfig(): TraceConfig {
  const cfg = vscode.workspace.getConfiguration('design-trace');
  return {
    mdPatterns: cfg.get<string[]>('mdPatterns', ['**/*.md']),
    javaPatterns: cfg.get<string[]>('javaPatterns', ['**/*.java']),
    markerTag: cfg.get<string>('markerTag', 'symbol:'),
    ignoredSymbols: cfg.get<string[]>('ignoredSymbols', []),
    autoIndex: cfg.get<boolean>('autoIndex', true),
    showGutterIcons: cfg.get<boolean>('showGutterIcons', true),
    showCodeLens: cfg.get<boolean>('showCodeLens', true),
    showHover: cfg.get<boolean>('showHover', true),
    iconTheme: cfg.get<'dot' | 'icon'>('iconTheme', 'dot'),
  };
}

async function reindex(): Promise<void> {
  const cfg = loadConfig();
  config = cfg;
  registry.updateConfig(cfg);
  indexer.updateConfig(cfg.markerTag);
  registry.clear();

  // Wait for workspace to be ready is automatic; no command needed

  // Find and index all Markdown files
  let mdUris: vscode.Uri[] = [];
  try {
    const pattern = cfg.mdPatterns.length > 0
      ? `{${cfg.mdPatterns.join(',')}}`
      : '**/*.md';

    if (workspaceFolder) {
      mdUris = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceFolder, pattern),
        '**/node_modules/**',
        1000
      );
    } else {
      mdUris = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 1000);
    }
  } catch (err) {
    console.error('[Design Trace] findFiles error:', err);
  }

  // Show progress for indexing
  const totalSymbols = await indexer.indexWorkspace(mdUris, (msg) => {
    vscode.window.showInformationMessage(msg);
  });

  // Resolve Java symbol locations
  const resolvedCount = await resolver.resolveAll((msg) => {
    vscode.window.showInformationMessage(msg);
  });

  const summary = `${totalSymbols} symbols indexed, ${resolvedCount} resolved`;
  vscode.window.setStatusBarMessage(`$(check) Design Trace: ${summary}`, 5000);

  // Refresh decorations on all open editors
  decorationProvider.refreshAllEditors();
  treeProvider.refresh();

  // Update context key so sidebar shows
  vscode.commands.executeCommand('setContext', 'designTraceHasData', registry.size > 0);
}

function registerCommands(): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  disposables.push(
    vscode.commands.registerCommand('design-trace.reindex', async () => {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Window, title: 'Design Trace: Re-indexing...' },
        async () => { await reindex(); }
      );
    })
  );

  disposables.push(
    vscode.commands.registerCommand('design-trace.openPanel', () => {
      vscode.commands.executeCommand('workbench.view.explorer');
    })
  );

  disposables.push(
    vscode.commands.registerCommand('design-trace.navigateToCode', async (symbol: string) => {
      const entry = registry.getResolved(symbol);
      if (!entry?.location) {
        vscode.window.showWarningMessage(
          `Symbol "${symbol}" not yet resolved. Run "Design Trace: Re-index" first.`
        );
        return;
      }
      const loc = entry.location;
      try {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(loc.file));
        const editor = await vscode.window.showTextDocument(doc, {
          viewColumn: vscode.ViewColumn.One,
          preserveFocus: false,
        });
        const start = new vscode.Position(loc.range.startLine - 1, 0);
        const end = new vscode.Position(loc.range.endLine - 1, 0);
        editor.selection = new vscode.Selection(start, start);
        editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenter);
      } catch {
        vscode.window.showErrorMessage(`Could not open file: ${loc.file}`);
      }
    })
  );

  disposables.push(
    vscode.commands.registerCommand('design-trace.openMdFromSymbol', async (symbol: string) => {
      const entry = registry.get(symbol);
      if (!entry) {
        vscode.window.showWarningMessage(`Symbol "${symbol}" not found in registry.`);
        return;
      }
      try {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(entry.mdFile));
        const editor = await vscode.window.showTextDocument(doc, {
          viewColumn: vscode.ViewColumn.Beside,
          preserveFocus: true,
        });
        if (entry.mdLine > 0) {
          const pos = new vscode.Position(entry.mdLine - 1, 0);
          editor.selection = new vscode.Selection(pos, pos);
          editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
        }
      } catch {
        vscode.window.showErrorMessage(`Could not open Markdown file: ${entry.mdFile}`);
      }
    })
  );

  disposables.push(
    vscode.commands.registerCommand('design-trace.copySymbol', async (symbol: string) => {
      await vscode.env.clipboard.writeText(symbol);
      vscode.window.setStatusBarMessage(`$(clippy) Copied: ${symbol}`, 2000);
    })
  );

  disposables.push(
    vscode.commands.registerCommand('design-trace.linkCurrent', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'java') {
        vscode.window.showWarningMessage('This command only works in Java files.');
        return;
      }
      const filePath = editor.document.uri.fsPath;
      let symbols = registry.getSymbolsByFile(filePath);
      if (symbols.length === 0) {
        await resolver.resolveFile(editor.document.uri);
        symbols = registry.getSymbolsByFile(filePath);
        if (symbols.length === 0) {
          vscode.window.showInformationMessage('No mapped symbols found in this file.');
          return;
        }
      }
      const picked = await vscode.window.showQuickPick(
        symbols.map(s => ({
          label: s.symbol,
          description: s.mdSection,
          symbol: s.symbol,
        })),
        { placeHolder: 'Select a symbol to navigate to Internal Design' }
      );
      if (picked) {
        vscode.commands.executeCommand('design-trace.openMdFromSymbol', picked.symbol);
      }
    })
  );

  return disposables;
}

function registerProviders(disposables: vscode.Disposable[]): void {
  const linkProvider = new DesignTraceLinkProvider(registry, config.markerTag);

  disposables.push(
    vscode.languages.registerDocumentLinkProvider(
      { language: 'markdown', scheme: 'file' },
      linkProvider
    )
  );

  if (config.showHover) {
    disposables.push(
      vscode.languages.registerHoverProvider(
        { language: 'java', scheme: 'file' },
        new HoverProvider(registry)
      )
    );
  }

  if (config.showCodeLens) {
    codeLensProvider = new CodeLensProvider(registry);
    disposables.push(
      vscode.languages.registerCodeLensProvider(
        { language: 'java', scheme: 'file' },
        codeLensProvider
      )
    );
  }
}

function registerFileWatchers(disposables: vscode.Disposable[]): void {
  if (!workspaceFolder) return;

  // Watch Markdown files
  const mdWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspaceFolder, `{${config.mdPatterns.join(',')}}`)
  );
  disposables.push(mdWatcher);

  mdWatcher.onDidChange(async (uri) => {
    if (!config.autoIndex) return;
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      await indexer.indexDocument(doc);
      await resolver.resolveAll();
      decorationProvider.refreshAllEditors();
      treeProvider.refresh();
    } catch (err) {
      console.error('[Design Trace] Markdown change error:', err);
    }
  });

  mdWatcher.onDidCreate(async (uri) => {
    if (!config.autoIndex) return;
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      await indexer.indexDocument(doc);
      await resolver.resolveAll();
      decorationProvider.refreshAllEditors();
      treeProvider.refresh();
    } catch (err) {
      console.error('[Design Trace] Markdown create error:', err);
    }
  });

  // Watch Java files
  const javaWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspaceFolder, `{${config.javaPatterns.join(',')}}`)
  );
  disposables.push(javaWatcher);

  javaWatcher.onDidChange(async (uri) => {
    if (!config.autoIndex) return;
    try {
      await resolver.resolveFile(uri);
      decorationProvider.refreshAllEditors();
      treeProvider.refresh();
    } catch (err) {
      console.error('[Design Trace] Java change error:', err);
    }
  });

  javaWatcher.onDidCreate(async (uri) => {
    if (!config.autoIndex) return;
    try {
      await resolver.resolveFile(uri);
      decorationProvider.refreshAllEditors();
    } catch (err) {
      console.error('[Design Trace] Java create error:', err);
    }
  });
}

function applyDecorations(editor: vscode.TextEditor): void {
  if (editor.document.languageId === 'java' && config.showGutterIcons) {
    decorationProvider.applyToEditor(editor);
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('[Design Trace] Extension activating...');

  config = loadConfig();
  workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  // Init core
  registry = new MappingRegistry(config);
  indexer = new MarkdownIndexer(registry);
  indexer.updateConfig(config.markerTag);
  resolver = new JavaSymbolResolver(registry);
  decorationProvider = new DecorationProvider(registry);
  treeProvider = new DesignTraceTreeProvider(registry);
  statusBar = new StatusBarController(registry);

  const disposables: vscode.Disposable[] = [];

  // Register commands
  disposables.push(...registerCommands());

  // Register tree view
  disposables.push(
    vscode.window.registerTreeDataProvider('design-trace-explorer', treeProvider)
  );

  // Register language providers
  registerProviders(disposables);

  // Register file watchers
  registerFileWatchers(disposables);

  // Apply decorations to already-open editors
  for (const editor of vscode.window.visibleTextEditors) {
    applyDecorations(editor);
  }

  // Listen for editors opening
  disposables.push(
    vscode.window.onDidChangeVisibleTextEditors((editors) => {
      for (const editor of editors) {
        applyDecorations(editor);
      }
    })
  );

  // Listen for config changes
  disposables.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('design-trace')) {
        const newConfig = loadConfig();
        config = newConfig;
        registry.updateConfig(newConfig);
        indexer.updateConfig(newConfig.markerTag);
        decorationProvider.refreshAllEditors();
        codeLensProvider?.refresh();
        treeProvider.refresh();
      }
    })
  );

  context.subscriptions.push(...disposables);

  // Initial index — do it after everything is registered
  if (workspaceFolder) {
    await reindex();
  }

  console.log('[Design Trace] Extension activated.');
}

export function deactivate(): void {
  decorationProvider?.dispose();
  statusBar?.dispose();
}
