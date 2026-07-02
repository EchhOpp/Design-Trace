import * as vscode from 'vscode';
import { MappingRegistry } from '../MappingRegistry';
export declare class CodeLensProvider implements vscode.CodeLensProvider {
    private registry;
    private config;
    constructor(registry: MappingRegistry);
    provideCodeLenses(doc: vscode.TextDocument, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]>;
    resolveCodeLens?(lens: vscode.CodeLens, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens>;
    /** Refresh lenses when registry changes */
    refresh(): void;
}
//# sourceMappingURL=CodeLensProvider.d.ts.map