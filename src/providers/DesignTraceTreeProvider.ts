// DesignTraceTreeProvider — sidebar panel showing Internal Design structure
import * as vscode from 'vscode';
import { MappingRegistry } from '../MappingRegistry';
import { SymbolEntry } from '../types';

interface TreeNode {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  children?: TreeNode[];
  symbol?: string;
  mdSection?: string;
  type: 'section' | 'symbol' | 'file' | 'root';
  uri?: vscode.Uri;
  line?: number;
}

export class DesignTraceTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private registry: MappingRegistry;
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private searchQuery = '';

  constructor(registry: MappingRegistry) {
    this.registry = registry;

    // Listen for registry updates
    this.registry.onDidUpdate(() => {
      this._onDidChangeTreeData.fire(null);
    });
  }

  setSearchQuery(query: string): void {
    this.searchQuery = query.toLowerCase();
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      element.children ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
    );

    if (element.symbol) {
      item.resourceUri = element.uri;
      item.command = {
        command: 'design-trace.navigateToCode',
        title: 'Navigate to Code',
        arguments: [element.symbol],
      };
      item.iconPath = new vscode.ThemeIcon('symbol-method', new vscode.ThemeColor('charts.blue'));
      item.tooltip = `${element.symbol}\n${element.description ?? ''}`;
      item.contextValue = 'symbol';
    } else if (element.type === 'section') {
      item.iconPath = new vscode.ThemeIcon('symbol-class');
      item.contextValue = 'section';
    } else if (element.type === 'file') {
      item.iconPath = new vscode.ThemeIcon('file');
      item.contextValue = 'mdFile';
    }

    if (element.description && !element.children) {
      item.description = element.description;
    }

    return item;
  }

  getChildren(element?: TreeNode): Thenable<TreeNode[]> {
    if (!element) {
      return Promise.resolve(this.buildRootNodes());
    }

    if (element.type === 'root') {
      return Promise.resolve(element.children ?? []);
    }

    return Promise.resolve(element.children ?? []);
  }

  private buildRootNodes(): TreeNode[] {
    const allEntries = this.registry.all;

    if (allEntries.length === 0) {
      return []; // Return empty — TreeDataProvider handles empty roots gracefully
    }

    // Group by Markdown file
    const byFile = new Map<string, SymbolEntry[]>();
    for (const entry of allEntries) {
      const key = entry.mdFile;
      const list = byFile.get(key) ?? [];
      list.push(entry);
      byFile.set(key, list);
    }

    // Group each file's symbols by top-level section
    const fileNodes: TreeNode[] = [];
    for (const [mdFile, entries] of byFile) {
      const fileName = mdFile.split('/').pop() ?? mdFile.split('\\').pop() ?? mdFile;

      if (this.searchQuery) {
        const filtered = entries.filter(e =>
          e.symbol.toLowerCase().includes(this.searchQuery) ||
          e.mdSection.toLowerCase().includes(this.searchQuery)
        );

        if (filtered.length === 0) continue;

        fileNodes.push({
          id: mdFile,
          label: fileName,
          type: 'file',
          description: `${filtered.length} symbols`,
          children: filtered.map(e => this.entryToNode(e)),
        });
      } else {
        const bySection = this.groupBySection(entries);
        const sectionNodes = Object.entries(bySection)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([section, sectionEntries]) => ({
            id: `${mdFile}:${section}`,
            label: section,
            type: 'section' as const,
            description: `${sectionEntries.length} symbols`,
            children: sectionEntries.map(e => this.entryToNode(e)),
          }));

        fileNodes.push({
          id: mdFile,
          label: fileName,
          type: 'file',
          description: `${entries.length} symbols`,
          children: sectionNodes,
        });
      }
    }

    // Sort by file name
    fileNodes.sort((a, b) => a.label.localeCompare(b.label));

    // Summary node
    const total = this.registry.size;
    const resolved = this.registry.resolvedCount;

    return [
      {
        id: 'summary',
        label: `Design Trace`,
        type: 'root',
        description: `${resolved}/${total} resolved`,
        children: fileNodes.length > 0 ? fileNodes : undefined,
      },
    ];
  }

  private groupBySection(entries: SymbolEntry[]): Record<string, SymbolEntry[]> {
    const result: Record<string, SymbolEntry[]> = {};

    for (const entry of entries) {
      const topLevel = entry.mdSection.split(' > ')[0] ?? 'General';
      const list = result[topLevel] ?? [];
      list.push(entry);
      result[topLevel] = list;
    }

    return result;
  }

  private entryToNode(entry: SymbolEntry): TreeNode {
    const isResolved = !!entry.location;

    return {
      id: entry.symbol,
      label: entry.symbol,
      type: 'symbol',
      symbol: entry.symbol,
      mdSection: entry.mdSection,
      description: isResolved
        ? `lines ${entry.location!.range.startLine}–${entry.location!.range.endLine}`
        : '(not resolved)',
      uri: entry.location
        ? vscode.Uri.file(entry.location.file)
        : undefined,
      line: entry.location?.range.startLine,
      children: [],
    };
  }

  getParent(_element: TreeNode): vscode.ProviderResult<TreeNode> {
    return null;
  }

  /** Force refresh the tree */
  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }
}
