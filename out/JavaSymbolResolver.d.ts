import * as vscode from 'vscode';
import { MappingRegistry } from './MappingRegistry';
export declare class JavaSymbolResolver {
    private registry;
    private methodDeclarationRegex;
    private classDeclarationRegex;
    constructor(registry: MappingRegistry);
    resolveAll(progress?: (msg: string) => void): Promise<number>;
    resolveFile(uri: vscode.Uri): Promise<number>;
    private findClassName;
    private findSymbolLocations;
    private scanFileForSymbols;
    private findMethodEndLine;
}
//# sourceMappingURL=JavaSymbolResolver.d.ts.map