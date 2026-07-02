// HoverProvider — shows hover tooltip for mapped Java symbols
import * as vscode from 'vscode';
import { MappingRegistry } from '../MappingRegistry';

export class HoverProvider implements vscode.HoverProvider {
  private registry: MappingRegistry;

  constructor(registry: MappingRegistry) {
    this.registry = registry;
  }

  provideHover(doc: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
    const uri = doc.uri.fsPath.replace(/\\/g, '/');
    const line = position.line + 1; // convert to 1-indexed

    const symbols = this.registry.getSymbolsByFile(uri);
    const match = symbols.find((s) =>
      line >= s.location!.range.startLine && line <= s.location!.range.endLine
    );

    if (!match) return null;

    const loc = match.location!;

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.appendMarkdown(
      `**⚡ Design Trace**\n\n` +
      `**Section:** ${match.mdSection}\n\n` +
      `**Location:** \`${getBasename(loc.file)}\` lines ${loc.range.startLine}–${loc.range.endLine}\n\n` +
      `[📄 Open Internal Design](command:design-trace.openMdFromSymbol?${encodeURIComponent(match.symbol)})\n`
    );

    return new vscode.Hover(md, new vscode.Range(position, position));
  }
}

function getBasename(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] ?? filePath;
}
