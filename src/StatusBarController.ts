// StatusBarController — shows symbol count and context in VS Code status bar
import * as vscode from 'vscode';
import { MappingRegistry } from './MappingRegistry';

export class StatusBarController {
  private registry: MappingRegistry;
  private statusBarItem: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];

  constructor(registry: MappingRegistry) {
    this.registry = registry;
    this.statusBarItem = vscode.window.createStatusBarItem(
      'design-trace.status',
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.text = '$(pulse) Design Trace: indexing...';
    this.statusBarItem.command = 'design-trace.openPanel';
    this.statusBarItem.tooltip = 'Design Trace — click to open panel';
    this.statusBarItem.show();

    this.registry.onDidUpdate(() => {
      this.update();
    });

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.update();
      })
    );
  }

  private update(): void {
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
      } else {
        this.statusBarItem.text = `$(link) Design: 0 mapped`;
        this.statusBarItem.tooltip = 'No methods in this file are referenced in Internal Design';
      }
    } else if (editor.document.languageId === 'markdown') {
      this.statusBarItem.text = `$(link) Design: ${mdSymbols.length} symbols`;
      this.statusBarItem.tooltip = `${mdSymbols.length} symbols in this Internal Design document`;
    } else {
      this.statusBarItem.text = `$(link) Design: ${resolved}/${total}`;
      this.statusBarItem.tooltip = `${total} symbols tracked, ${resolved} resolved`;
    }
  }

  showMessage(message: string, type: 'info' | 'warn' | 'error' = 'info'): void {
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

  dispose(): void {
    this.statusBarItem.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
