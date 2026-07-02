import * as vscode from 'vscode';
import { MappingRegistry } from './MappingRegistry';
export declare class JavaSymbolResolver {
    private registry;
    constructor(registry: MappingRegistry);
    resolveAll(progress?: (msg: string) => void): Promise<number>;
    resolveFile(uri: vscode.Uri): Promise<number>;
    private getClassNameFromDocument;
    private findTopLevelClass;
    private findClassNameByRegex;
    private findSymbolLocations;
    private getLocationsFromFile;
    private scanDocumentForSymbols;
    private findClassSymbol;
    private findMethodsRecursive;
    private scanFileForSymbolsRegex;
    private findMethodEndLine;
}
//# sourceMappingURL=JavaSymbolResolver.d.ts.map