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
exports.DesignTraceTreeProvider = void 0;
// DesignTraceTreeProvider — sidebar panel showing Internal Design structure
const vscode = __importStar(require("vscode"));
class DesignTraceTreeProvider {
    constructor(registry) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.searchQuery = '';
        this.registry = registry;
        // Listen for registry updates
        this.registry.onDidUpdate(() => {
            this._onDidChangeTreeData.fire(null);
        });
    }
    setSearchQuery(query) {
        this.searchQuery = query.toLowerCase();
        this._onDidChangeTreeData.fire(null);
    }
    getTreeItem(element) {
        const item = new vscode.TreeItem(element.label, element.children ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
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
        }
        else if (element.type === 'section') {
            item.iconPath = new vscode.ThemeIcon('symbol-class');
            item.contextValue = 'section';
        }
        else if (element.type === 'file') {
            item.iconPath = new vscode.ThemeIcon('file');
            item.contextValue = 'mdFile';
        }
        if (element.description && !element.children) {
            item.description = element.description;
        }
        return item;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve(this.buildRootNodes());
        }
        if (element.type === 'root') {
            return Promise.resolve(element.children ?? []);
        }
        return Promise.resolve(element.children ?? []);
    }
    buildRootNodes() {
        const allEntries = this.registry.all;
        if (allEntries.length === 0) {
            return []; // Return empty — TreeDataProvider handles empty roots gracefully
        }
        // Group by Markdown file
        const byFile = new Map();
        for (const entry of allEntries) {
            const key = entry.mdFile;
            const list = byFile.get(key) ?? [];
            list.push(entry);
            byFile.set(key, list);
        }
        // Group each file's symbols by top-level section
        const fileNodes = [];
        for (const [mdFile, entries] of byFile) {
            const fileName = mdFile.split('/').pop() ?? mdFile.split('\\').pop() ?? mdFile;
            if (this.searchQuery) {
                const filtered = entries.filter(e => e.symbol.toLowerCase().includes(this.searchQuery) ||
                    e.mdSection.toLowerCase().includes(this.searchQuery));
                if (filtered.length === 0)
                    continue;
                fileNodes.push({
                    id: mdFile,
                    label: fileName,
                    type: 'file',
                    description: `${filtered.length} symbols`,
                    children: filtered.map(e => this.entryToNode(e)),
                });
            }
            else {
                const bySection = this.groupBySection(entries);
                const sectionNodes = Object.entries(bySection)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([section, sectionEntries]) => ({
                    id: `${mdFile}:${section}`,
                    label: section,
                    type: 'section',
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
    groupBySection(entries) {
        const result = {};
        for (const entry of entries) {
            const topLevel = entry.mdSection.split(' > ')[0] ?? 'General';
            const list = result[topLevel] ?? [];
            list.push(entry);
            result[topLevel] = list;
        }
        return result;
    }
    entryToNode(entry) {
        const isResolved = !!entry.location;
        return {
            id: entry.symbol,
            label: entry.symbol,
            type: 'symbol',
            symbol: entry.symbol,
            mdSection: entry.mdSection,
            description: isResolved
                ? `lines ${entry.location.range.startLine}–${entry.location.range.endLine}`
                : '(not resolved)',
            uri: entry.location
                ? vscode.Uri.file(entry.location.file)
                : undefined,
            line: entry.location?.range.startLine,
            children: [],
        };
    }
    getParent(_element) {
        return null;
    }
    /** Force refresh the tree */
    refresh() {
        this._onDidChangeTreeData.fire(null);
    }
}
exports.DesignTraceTreeProvider = DesignTraceTreeProvider;
//# sourceMappingURL=DesignTraceTreeProvider.js.map