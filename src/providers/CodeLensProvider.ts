// CodeLensProvider — shows "Referenced in Internal Design" above mapped methods
import * as vscode from 'vscode';
import { MappingRegistry } from '../MappingRegistry';

export class CodeLensProvider implements vscode.CodeLensProvider {
  private registry: MappingRegistry;
  private config: vscode.WorkspaceConfiguration;

  constructor(registry: MappingRegistry) {
    this.registry = registry;
    this.config = vscode.workspace.getConfiguration('design-trace');
  }

  provideCodeLenses(doc: vscode.TextDocument, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
    if (doc.languageId !== 'java') return [];

    const showCodeLens = this.config.get<boolean>('showCodeLens', true);
    if (!showCodeLens) return [];

    const uri = doc.uri.fsPath.replace(/\\/g, '/');
    const resolved = this.registry.getSymbolsByFile(uri);
    const lenses: vscode.CodeLens[] = [];

    for (const entry of resolved) {
      const startLine = entry.location!.range.startLine - 1;
      const endLine = entry.location!.range.endLine - 1;

      // Primary lens: navigate to Internal Design
      const mainLens = new vscode.CodeLens(
        new vscode.Range(startLine, 0, startLine, 0),
        {
          title: `📄 ${entry.mdSection}`,
          command: 'design-trace.openMdFromSymbol',
          arguments: [entry.symbol],
          tooltip: 'Open the Internal Design section for this method',
        }
      );
      lenses.push(mainLens);

      // Secondary lens: copy symbol
      const copyLens = new vscode.CodeLens(
        new vscode.Range(startLine, 80, startLine, 80),
        {
          title: '$(clippy) Copy Symbol',
          command: 'design-trace.copySymbol',
          arguments: [entry.symbol],
          tooltip: `Copy symbol: ${entry.symbol}`,
        }
      );
      lenses.push(copyLens);
    }

    return lenses;
  }

  resolveCodeLens?(lens: vscode.CodeLens, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
    return lens;
  }

  /** Refresh lenses when registry changes */
  refresh(): void {
    this.config = vscode.workspace.getConfiguration('design-trace');
    // Trigger refresh by firing the provider's event
    // The VS Code API will call provideCodeLenses again
  }
}
