import { commands, commandsReady } from '../../Commands/index.js';
import { NormalizeToken } from '../../Common/Permission/normalizeToken.js';
import { TokenKey } from '../../Common/Permission/tokenKey.js';
import type { PermissionToken, PermissionTokenInput, TokenSegmentInput } from '../../Common/Permission/types.js';

/**
 * Represents a discovered permission token with its origin command.
 *
 * @property token PermissionToken Normalized token segments.
 * @property serialized string Serialized form used for storage.
 * @property commandName string Name of the command that declared this token.
 */
export interface DiscoveredToken {
    token: PermissionToken;
    serialized: string;
    commandName: string;
}

/**
 * Collect every unique permission token declared across all loaded bot commands.
 * Waits for the commands module to finish loading before scanning.
 *
 * @returns Promise<DiscoveredToken[]> Deduplicated list of discovered tokens.
 *
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
 * Normalize raw permission token declarations into a flat array of inputs.
 * Handles string, single array, nested arrays, and function forms (skips functions).
 *
 * @param rawTokens any Raw permissionTokens value from command module.
 * @returns PermissionTokenInput[] Flat array of token inputs.
 */
function __ExtractTokenEntries(rawTokens: any): PermissionTokenInput[] {
    if (typeof rawTokens === `function`) {
        // Dynamic tokens require interaction context; skip during collection
        return [];
    }
    if (typeof rawTokens === `string`) {
        return [rawTokens];
    }
    if (!Array.isArray(rawTokens)) {
        return [];
    }
    // Check if it's a nested array like [['view'], ['create']] vs a flat ['view']
    const firstElement = rawTokens[0];
    if (Array.isArray(firstElement)) {
        // Nested: each sub-array is a separate token
        return rawTokens as TokenSegmentInput[][];
    }
    // Flat: the entire array is one token
    return [rawTokens as TokenSegmentInput[]];
}
