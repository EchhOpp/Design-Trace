import * as vscode from 'vscode';
import { MappingRegistry } from '../MappingRegistry';
export declare class DecorationProvider {
    private registry;
    private decorationType;
    private decorationUnresolved;
    private activeDecorations;
    static readonly resolvedIconPath: vscode.Uri;
    static readonly lightIconPath: vscode.Uri;
    constructor(registry: MappingRegistry);
    /** Apply decorations to a specific editor */
    applyToEditor(editor: vscode.TextEditor): void;
    /** Remove decorations from an editor */
    removeFromEditor(editor: vscode.TextEditor): void;
    /** Refresh decorations for all active Java editors */
    refreshAllEditors(): void;
    dispose(): void;
}
//# sourceMappingURL=DecorationProvider.d.ts.map