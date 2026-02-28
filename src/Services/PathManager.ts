import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import type { ValidatedConfig } from '../Types/Config.js';

/** PathManager centralizes resolution of filesystem paths and creates directories on demand */
export class PathManager {
    private _cfg: ValidatedConfig; // active configuration
    private _ensured: Set<string> = new Set(); // memo of created directories

    constructor(cfg: ValidatedConfig) {
        this._cfg = cfg;
    }

    /** Ensure directory exists with recursive creation semantics */
    private __ensure(dir: string): string {
        if (!this._ensured.has(dir)) {
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
            this._ensured.add(dir);
        }
        return dir;
    }

    /** Root for persistent data including objects and transactions */
    public DataRoot(): string {
        return this.__ensure(this._cfg.dataRoot || resolve(`./data`));
    }
    /** Root for local mirror content */
    public MirrorRoot(): string {
        return this.__ensure(this._cfg.mirrorRoot || this.DataRoot() + `/mirror`);
    }
    /** Root for ephemeral temp content */
    public TempRoot(): string {
        return this.__ensure(this._cfg.tempRoot || this.DataRoot() + `/tmp`);
    }

    /** Directory holding objects for a guild */
    public GuildObjectsDir(guildId: string): string {
        return this.__ensure(join(this.DataRoot(), guildId, `objects`));
    }
    /** Directory holding transactions for a guild and object pair */
    public ObjectTxDir(guildId: string, objectId: string): string {
        return this.__ensure(join(this.DataRoot(), guildId, `objects`, objectId, `tx`));
    }
}

export let pathManager: PathManager | null = null; // singleton handle initialized after config load

/** Initialize global path manager with validated config */
export function InitializePathManager(cfg: ValidatedConfig): PathManager {
    pathManager = new PathManager(cfg);
    return pathManager;
}
