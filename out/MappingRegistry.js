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
exports.MappingRegistry = void 0;
// MappingRegistry — in-memory store mapping symbols to code locations
const vscode = __importStar(require("vscode"));
class MappingRegistry {
    constructor(config) {
        this.entries = new Map();
        this._onDidUpdate = new vscode.EventEmitter();
        this.onDidUpdate = this._onDidUpdate.event;
        this.config = config;
    }
    updateConfig(config) {
        this.config = config;
    }
    /** Add or update a symbol entry from Markdown parsing */
    upsert(entry) {
        this.entries.set(entry.symbol, entry);
        this._onDidUpdate.fire();
    }
    /** Bulk upsert entries */
    upsertAll(entries) {
        let changed = false;
        for (const entry of entries) {
            const existing = this.entries.get(entry.symbol);
            if (!existing || entry.mdLine !== existing.mdLine) {
                this.entries.set(entry.symbol, entry);
                changed = true;
            }
        }
        if (changed) {
            this._onDidUpdate.fire();
        }
    }
    /** Merge resolved code locations into existing entries */
    resolveSymbol(symbol, location) {
        const entry = this.entries.get(symbol);
        if (entry) {
            this.entries.set(symbol, { ...entry, location });
            this._onDidUpdate.fire();
        }
    }
    /** Merge multiple resolved locations */
    resolveAll(resolutions) {
        let changed = false;
        for (const [symbol, location] of resolutions) {
            const entry = this.entries.get(symbol);
            if (entry && !entry.location) {
                this.entries.set(symbol, { ...entry, location });
                changed = true;
            }
        }
        if (changed) {
            this._onDidUpdate.fire();
        }
    }
    get(symbol) {
        return this.entries.get(symbol);
    }
    getResolved(symbol) {
        const entry = this.entries.get(symbol);
        if (entry?.location) {
            return entry;
        }
        return undefined;
    }
    hasSymbol(symbol) {
        return this.entries.has(symbol);
    }
    isResolved(symbol) {
        const entry = this.entries.get(symbol);
        return !!entry?.location;
    }
    /** Get all unresolved symbols (need Java code resolution) */
    getUnresolved() {
        return Array.from(this.entries.values()).filter(e => !e.location);
    }
    /** Get all resolved symbols */
    getResolvedSymbols() {
        return Array.from(this.entries.values())
            .filter((e) => !!e.location);
    }
    /** Get symbols by file path (case-insensitive) */
    getSymbolsByFile(filePath) {
        const normalized = filePath.replace(/\\/g, '/').toLowerCase();
        return this.getResolvedSymbols().filter(s => s.location.file.replace(/\\/g, '/').toLowerCase() === normalized);
    }
    /** Get symbols by Markdown file */
    getSymbolsByMdFile(mdFile) {
        return Array.from(this.entries.values()).filter(e => e.mdFile.replace(/\\/g, '/') === mdFile.replace(/\\/g, '/'));
    }
    get all() {
        return Array.from(this.entries.values());
    }
    get allSymbols() {
        return Array.from(this.entries.keys());
    }
    get size() {
        return this.entries.size;
    }
    get resolvedCount() {
        return this.getResolvedSymbols().length;
    }
    clear() {
        this.entries.clear();
        this._onDidUpdate.fire();
    }
    /** Serialize registry state for debugging */
    toJSON() {
        return {
            total: this.entries.size,
            resolved: this.resolvedCount,
            symbols: Object.fromEntries(this.entries)
        };
    }
}
exports.MappingRegistry = MappingRegistry;
//# sourceMappingURL=MappingRegistry.js.map