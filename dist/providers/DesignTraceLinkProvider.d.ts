import * as vscode from 'vscode';
import { MappingRegistry } from '../MappingRegistry';
export declare class DesignTraceLinkProvider implements vscode.DocumentLinkProvider {
    private registry;
    private markerTag;
    constructor(registry: MappingRegistry, markerTag: string);
    updateMarkerTag(tag: string): void;
    provideDocumentLinks(doc: vscode.TextDocument, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink[]>;
}
//# sourceMappingURL=DesignTraceLinkProvider.d.ts.map