// DecorationProvider — applies green gutter icons to mapped Java methods
import * as vscode from 'vscode';
import { MappingRegistry } from '../MappingRegistry';

export class DecorationProvider {
  private registry: MappingRegistry;
  private decorationType: vscode.TextEditorDecorationType;
  private decorationUnresolved: vscode.TextEditorDecorationType;
  private activeDecorations = new Map<string, vscode.DecorationOptions[]>();

  static readonly resolvedIconPath = vscode.Uri.parse(
    'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="#4CAF50" opacity="0.85"/>
        <circle cx="8" cy="8" r="3" fill="white"/>
      </svg>
    `)
  );

  static readonly lightIconPath = vscode.Uri.parse(
    'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="#66BB6A" opacity="0.85"/>
        <circle cx="8" cy="8" r="3" fill="white"/>
      </svg>
    `)
  );

  constructor(registry: MappingRegistry) {
    this.registry = registry;

    this.decorationType = vscode.window.createTextEditorDecorationType({
      ...({ glyphMargin: {
        light: DecorationProvider.lightIconPath,
        dark: DecorationProvider.resolvedIconPath,
      } } as Record<string, unknown>),
      overviewRulerColor: '#4CAF50',
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });

    this.decorationUnresolved = vscode.window.createTextEditorDecorationType({
      ...({ glyphMargin: {
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
      } } as Record<string, unknown>),
      overviewRulerColor: '#999999',
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });

    // Listen for registry updates
    this.registry.onDidUpdate(() => {
      this.refreshAllEditors();
    });
  }

  /** Apply decorations to a specific editor */
  applyToEditor(editor: vscode.TextEditor): void {
    if (editor.document.languageId !== 'java') return;

    const uri = editor.document.uri.fsPath.replace(/\\/g, '/');
    const resolved = this.registry.getSymbolsByFile(uri);
    const options: vscode.DecorationOptions[] = [];

    for (const entry of resolved) {
      const range = new vscode.Range(
        entry.location!.range.startLine - 1, 0,
        entry.location!.range.endLine - 1, 0
      );

      options.push({
        range,
        hoverMessage: new vscode.MarkdownString(
          `**Internal Design**: ${entry.mdSection}\n\n` +
          `File: \`${getBasename(entry.location!.file)}\` (lines ${entry.location!.range.startLine}–${entry.location!.range.endLine})\n\n` +
          `[Open Internal Design](command:design-trace.openMdFromSymbol?${encodeURIComponent(entry.symbol)})`
        ),
      });
    }

    if (options.length > 0) {
      editor.setDecorations(this.decorationType, options);
      this.activeDecorations.set(uri, options);
    } else {
      editor.setDecorations(this.decorationType, []);
      this.activeDecorations.delete(uri);
    }
  }

  /** Remove decorations from an editor */
  removeFromEditor(editor: vscode.TextEditor): void {
    const uri = editor.document.uri.fsPath.replace(/\\/g, '/');
    editor.setDecorations(this.decorationType, []);
    this.activeDecorations.delete(uri);
  }

  /** Refresh decorations for all active Java editors */
  refreshAllEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.languageId === 'java') {
        this.applyToEditor(editor);
      }
    }
  }

  dispose(): void {
    this.decorationType.dispose();
    this.decorationUnresolved.dispose();
  }
}

function getBasename(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] ?? filePath;
}
