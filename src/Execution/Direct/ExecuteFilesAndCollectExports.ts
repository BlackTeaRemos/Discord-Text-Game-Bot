import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { log } from '../../Common/Log.js';

export enum DepthMode {
    UpToDepth, // include files whose directory depth relative to start is at most depth
    ExactDepth, // include files whose directory depth equals depth exactly
    AfterDepth, // include files whose directory depth exceeds depth
}

interface SearchOptions {
    mode: DepthMode;
    depth: number;
}

/** Maximum parallel directory read operations */
const MAX_IO_CONCURRENCY = 16; // tweakable throttle to avoid overwhelming FS

const ALLOWED_ROOTS = new Set<string>();
if (!ALLOWED_ROOTS.size) {
    // Initialize with project root heuristics two levels up from this file
    const projectRoot = path.resolve(import.meta.dirname, `../../../../`);
    ALLOWED_ROOTS.add(projectRoot);
}

function isWithinAllowedRoots(targetPath: string): boolean {
    const normalized = path.resolve(targetPath);
    for (const root of ALLOWED_ROOTS) {
        if (normalized.startsWith(root)) {
            return true;
        }
    }
    return false;
}

/**
 * Decide if traversal should continue deeper for a given current depth
 */
function shouldTraverseFurther(options: SearchOptions, currentDepth: number): boolean {
    // Always traverse deeper except when we have exceeded UpToDepth / ExactDepth limit
    if (options.mode === DepthMode.AfterDepth) {
        return true;
    } // no upper bound
    return currentDepth <= options.depth; // allow descent until limit inclusive
}

/**
 * Decide if a file at currentDepth should be included based on mode and depth semantics
 */
function shouldIncludeFile(options: SearchOptions, currentDepth: number): boolean {
    switch (options.mode) {
        case DepthMode.UpToDepth: {
            return currentDepth <= options.depth;
        }
        case DepthMode.ExactDepth: {
            return currentDepth === options.depth;
        }
        case DepthMode.AfterDepth: {
            return currentDepth > options.depth;
        }
        default: {
            return false;
        }
    }
}

/**
 * Async BFS directory traversal collecting files matching regex patterns with depth rules and concurrency control
 */
async function searchFiles(root: string, patterns: RegExp[], options: SearchOptions): Promise<string[]> {
    type DirTask = { dir: string; depth: number };
    const queue: DirTask[] = [{ dir: root, depth: 0 }];
    const collected: string[] = [];

    while (queue.length) {
        const batch = queue.splice(0, MAX_IO_CONCURRENCY); // take up to concurrency limit
        await Promise.all(
            batch.map(async task => {
                if (!shouldTraverseFurther(options, task.depth)) {
                    return;
                }
                let dirEntries: fs.Dirent[] = [];
                try {
                    dirEntries = await fs.promises.readdir(task.dir, {
                        withFileTypes: true,
                    });
                } catch(error) {
                    log.error(`Dir read failed ${task.dir}`, (error as Error).message, import.meta.filename);
                    throw new Error(`Directory access error: Failed to read directory at ${task.dir}`);
                }
                for (const entry of dirEntries) {
                    const fullPath = path.join(task.dir, entry.name);
                    if (entry.isDirectory()) {
                        queue.push({ dir: fullPath, depth: task.depth + 1 });
                    } else if (
                        entry.isFile() &&
                        patterns.some(p => {
                            return p.test(entry.name);
                        })
                    ) {
                        if (shouldIncludeFile(options, task.depth)) {
                            collected.push(fullPath);
                        }
                    }
                }
            }),
        );
    }
    return collected;
}

/**
 * Dynamically imports the file via ESM and returns the full module namespace object
 */
async function executeFile(filePath: string): Promise<any | null> {
    if (!isWithinAllowedRoots(filePath)) {
        log.error(`Blocked import outside allowed roots`, filePath);
        return null;
    }
    try {
        const imported = await import(pathToFileURL(filePath).href);
        // Log keys of namespace to avoid spamming large structures
        let keys: (string | symbol)[] = [];
        try {
            keys = imported ? Reflect.ownKeys(imported) : [];
        } catch {
            /* ignore */
        }
        log.info(`Loaded ${path.basename(filePath)}`, `keys=${JSON.stringify(keys)}`);
        return imported;
    } catch(error) {
        log.error(`Import failed ${filePath}`, (error as Error).message, import.meta.filename);
        return null;
    }
}

/**
 * Traverse directory collecting files matching patterns then dynamically import each and return their default exports
 *
 * @param dirPath string Root directory to search
 * @param patterns RegExp array Filename regex patterns
 * @param depth number Depth parameter interpreted per DepthMode
 * @param mode DepthMode Traversal inclusion strategy defaulting to UpToDepth
 * @returns any array Default exports filtered of nulls
 */
export async function ExecuteFilesAndCollectExports(
    dirPath: string,
    patterns: RegExp[],
    depth: number,
    mode: DepthMode = DepthMode.UpToDepth,
): Promise<any[]> {
    if (!dirPath) {
        throw new Error(`Directory path is required but was not provided`);
    }
    if (!Array.isArray(patterns) || patterns.length === 0) {
        throw new Error(`At least one pattern must be provided`);
    }
    if (typeof depth !== `number` || depth < 0) {
        throw new Error(`Depth must be a non-negative number`);
    }

    try {
        const stat = await fs.promises.stat(dirPath);
        if (!stat.isDirectory()) {
            throw new Error(`Path ${dirPath} is not a directory`);
        }
    } catch(error) {
        if ((error as NodeJS.ErrnoException).code === `ENOENT`) {
            throw new Error(`Directory not found: ${dirPath}`);
        }
        throw error;
    }
    const searchOptions: SearchOptions = { mode, depth };
    const allFiles = await searchFiles(dirPath, patterns, searchOptions);

    // Deduplicate logical module names preferring js over ts
    const dedupMap = new Map<string, string>();
    for (const file of allFiles) {
        const ext = path.extname(file);
        const base = path.join(path.dirname(file), path.basename(file, ext));
        const existing = dedupMap.get(base);
        if (!existing) {
            dedupMap.set(base, file);
        } else {
            // Prefer js
            if (ext === `.js` && path.extname(existing) !== `.js`) {
                dedupMap.set(base, file);
            }
        }
    }

    const chosenFiles = [...dedupMap.values()];
    const exportsArray = await Promise.all(chosenFiles.map(executeFile));
    return exportsArray.filter(e => {
        return e !== null;
    });
}
