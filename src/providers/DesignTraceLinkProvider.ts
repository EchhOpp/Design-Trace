// DesignTraceLinkProvider — makes symbol: entries in Markdown clickable links
import * as vscode from 'vscode';
import { MappingRegistry } from '../MappingRegistry';

export class DesignTraceLinkProvider implements vscode.DocumentLinkProvider {
  private registry: MappingRegistry;
  private markerTag: string;

  constructor(registry: MappingRegistry, markerTag: string) {
    this.registry = registry;
    this.markerTag = markerTag;
  }

  updateMarkerTag(tag: string) {
    this.markerTag = tag;
  }

  provideDocumentLinks(doc: vscode.TextDocument, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink[]> {
    const text = doc.getText();
    const links: vscode.DocumentLink[] = [];

    // Escape the marker tag for regex
    const escapedTag = this.markerTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTag})\\s*([A-Za-z_$][A-Za-z0-9_$]*#[a-zA-Z_$][a-zA-Z0-9_$]*)`, 'g');

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const fullMatch = match[0];
      const symbol = match[2];

      const startPos = doc.positionAt(match.index);
      const endPos = doc.positionAt(match.index + fullMatch.length);

      const isResolved = this.registry.isResolved(symbol);

      const link = new vscode.DocumentLink(
        new vscode.Range(startPos, endPos),
        vscode.Uri.parse(`command:design-trace.navigateToCode?${encodeURIComponent(symbol)}`)
      );

      if (isResolved) {
        const entry = this.registry.getResolved(symbol);
        link.tooltip = `Navigate to ${entry!.location!.file}:${entry!.location!.range.startLine}`;
      } else {
        link.tooltip = `Symbol "${symbol}" not yet resolved to Java code`;
      }

      links.push(link);
    }

    return links;
  }
}
