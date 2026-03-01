import { commands, commandsReady } from '../../Commands/index.js';
import { NormalizeToken } from '../../Common/Permission/Token/NormalizeToken.js';
import { TokenKey } from '../../Common/Permission/Token/TokenKey.js';
import type { PermissionToken, PermissionTokenInput, TokenSegmentInput } from '../../Common/Permission/Types.js';

/**
 * Represents a discovered permission token with its origin command
 */
export interface DiscoveredToken {
    token: PermissionToken;
    serialized: string;
    commandName: string;
}

/**
 * Collect every unique permission token declared across all loaded bot commands after waiting for loading
 * @returns DiscoveredToken array Deduplicated list of discovered tokens
 * @example
 * const tokens = await CollectAllTokens();
 * // [{ token: ['view'], serialized: 's:view', commandName: 'view' }, ...]
 */
export async function CollectAllTokens(): Promise<DiscoveredToken[]> {
    await commandsReady;

    const seenSerialized = new Set<string>();
    const discovered: DiscoveredToken[] = [];

    for (const [commandName, command] of Object.entries(commands)) {
        const rawTokens = command.permissionTokens;
        if (!rawTokens) {
            continue;
        }

        const tokenEntries = __ExtractTokenEntries(rawTokens);
        for (const entry of tokenEntries) {
            const normalized = NormalizeToken(entry);
            if (!normalized.length) {
                continue;
            }
            const serialized = TokenKey(normalized);
            if (seenSerialized.has(serialized)) {
                continue;
            }
            seenSerialized.add(serialized);
            discovered.push({ token: normalized, serialized, commandName });
        }
    }

    return discovered;
}

/**
 * Normalize raw permission token declarations into a flat array of inputs for all supported forms
 * @param rawTokens any Raw permissionTokens value from command module
 * @returns PermissionTokenInput array Flat array of token inputs
 */
function __ExtractTokenEntries(rawTokens: any): PermissionTokenInput[] {
    if (typeof rawTokens === `function`) {
        // Dynamic tokens require interaction context so skip during collection
        return [];
    }
    if (typeof rawTokens === `string`) {
        return [rawTokens];
    }
    if (!Array.isArray(rawTokens)) {
        return [];
    }
    // Check if this is a nested array or a flat array
    const firstElement = rawTokens[0];
    if (Array.isArray(firstElement)) {
        // Nested so each sub array is a separate token
        return rawTokens as TokenSegmentInput[][];
    }
    // Flat so the entire array is one token
    return [rawTokens as TokenSegmentInput[]];
}
