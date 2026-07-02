import * as vscode from 'vscode';
import { MappingRegistry } from '../MappingRegistry';
export declare class HoverProvider implements vscode.HoverProvider {
    private registry;
    constructor(registry: MappingRegistry);
    provideHover(doc: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover>;
}
//# sourceMappingURL=HoverProvider.d.ts.map