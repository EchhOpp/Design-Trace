import * as vscode from 'vscode';
import { MappingRegistry } from '../MappingRegistry';
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
export declare class DesignTraceTreeProvider implements vscode.TreeDataProvider<TreeNode> {
    private registry;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<TreeNode | null | undefined>;
    private searchQuery;
    constructor(registry: MappingRegistry);
    setSearchQuery(query: string): void;
    getTreeItem(element: TreeNode): vscode.TreeItem;
    getChildren(element?: TreeNode): Thenable<TreeNode[]>;
    private buildRootNodes;
    private groupBySection;
    private entryToNode;
    getParent(_element: TreeNode): vscode.ProviderResult<TreeNode>;
    /** Force refresh the tree */
    refresh(): void;
}
export {};
//# sourceMappingURL=DesignTraceTreeProvider.d.ts.map