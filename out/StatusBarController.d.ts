import { MappingRegistry } from './MappingRegistry';
export declare class StatusBarController {
    private registry;
    private statusBarItem;
    private disposables;
    constructor(registry: MappingRegistry);
    private update;
    showMessage(message: string, type?: 'info' | 'warn' | 'error'): void;
    dispose(): void;
}
//# sourceMappingURL=StatusBarController.d.ts.map