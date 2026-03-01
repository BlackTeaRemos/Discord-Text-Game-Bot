import { NormalizeToken } from './Token/NormalizeToken.js';
import { TokenKey } from './Token/TokenKey.js';
import type { PermissionTokenInput } from './Types.js';
import { PermissionGrantRepository } from '../../Repository/Permission/index.js';
import type { Neo4jClient } from '../../Repository/Neo4jClient.js';
import { Log } from '../Log.js';

const grantedForever: Map<string, Map<string, Set<string>>> = new Map(); // guildId to userId to serialized tokens

let _repository: PermissionGrantRepository | null = null;

/**
 * @brief Initialize the permission store before grants can be persisted
 * @param client Neo4jClient Database client instance
 * @returns void Resolves when initialization is complete
 */
export async function InitializePermissionStore(client: Neo4jClient): Promise<void> {
    _repository = new PermissionGrantRepository(client);
    await _repository.Initialize();
    Log.info(`Permission store initialized`, `PermissionStore`);
}

/**
 * @brief Load all grants for a guild into the in memory cache when it becomes available
 * @param guildId string Guild identifier
 * @returns void Resolves when grants are loaded
 */
export async function LoadGrantsForGuild(guildId: string): Promise<void> {
    if (!_repository) {
        return;
    }

    const bundles = await _repository.LoadGrantBundlesForGuild(guildId);
    if (bundles.length === 0) {
        return;
    }

    if (!grantedForever.has(guildId)) {
        grantedForever.set(guildId, new Map());
    }
    const guildMap = grantedForever.get(guildId)!;

    let loadedTokenCount = 0;
    for (const bundle of bundles) {
        if (!guildMap.has(bundle.userId)) {
            guildMap.set(bundle.userId, new Set());
        }
        const tokenSet = guildMap.get(bundle.userId)!;
        for (const token of bundle.tokens ?? []) {
            tokenSet.add(token);
            loadedTokenCount++;
        }
    }

    Log.info(
        `Loaded ${loadedTokenCount} permission grants across ${bundles.length} bundles for guild ${guildId}`,
        `PermissionStore`,
    );
}

/**
 * @brief Persist a permanent permission grant both in memory and database
 * @param guildId string Unique guild identifier
 * @param userId string Unique user identifier
 * @param token PermissionTokenInput Token granted forever
 * @param grantedBy string Discord user id who approved the grant
 * @returns void Resolves when grant is persisted
 * @example
 * await grantForever('guild', 'user', 'command:create', 'admin123');
 */
export async function GrantForever(
    guildId: string,
    userId: string,
    token: PermissionTokenInput,
    grantedBy: string,
): Promise<void> {
    if (!guildId || !userId) {
        return;
    }
    const normalized = NormalizeToken(token);
    if (!normalized.length) {
        return;
    }
    const serialized = TokenKey(normalized);
    if (!_repository) {
        throw new Error(`Permission store not initialized; cannot persist grant.`);
    }

    try {
        await _repository.UpsertGrantToken({
            guildId,
            userId,
            token: serialized,
            updatedBy: grantedBy,
        });
        __CacheGrant(guildId, userId, serialized);
        Log.info(`Persisted permission grant: ${serialized} for user ${userId} in guild ${guildId}`, `PermissionStore`);
    } catch(error) {
        Log.error(`Failed to persist permission grant: ${(error as Error).message}`, `PermissionStore`);
        throw error instanceof Error ? error : new Error(String(error));
    }
}

// Internal helper to keep cache updated after persistence
function __CacheGrant(guildId: string, userId: string, serializedToken: string): void {
    if (!grantedForever.has(guildId)) {
        grantedForever.set(guildId, new Map());
    }
    const guildMap = grantedForever.get(guildId)!;
    if (!guildMap.has(userId)) {
        guildMap.set(userId, new Set());
    }
    guildMap.get(userId)!.add(serializedToken);
}

/**
 * @brief Check whether a user already holds a permanent grant for any provided token
 * @param guildId string Guild identifier
 * @param userId string User identifier
 * @param tokens PermissionTokenInput array Tokens to compare against stored grants
 * @returns boolean True when a matching permanent grant is found
 * @example
 * const allowed = hasPermanentGrant('guild', 'user', ['command:create']);
 */
export function HasPermanentGrant(
    guildId: string | undefined,
    userId: string | undefined,
    tokens: PermissionTokenInput[],
): boolean {
    if (!guildId || !userId) {
        return false;
    }
    const guildMap = grantedForever.get(guildId);
    if (!guildMap) {
        return false;
    }
    const userTokens = guildMap.get(userId);
    if (!userTokens) {
        return false;
    }
    for (const token of tokens) {
        const normalized = NormalizeToken(token);
        if (!normalized.length) {
            continue;
        }
        const serialized = TokenKey(normalized);
        if (userTokens.has(serialized)) {
            return true;
        }
    }
    return false;
}

/**
 * @brief Return all serialized grant tokens for a user in a guild
 * @param guildId string Guild identifier
 * @param userId string User identifier
 * @returns string array Set of serialized tokens currently granted
 * @example
 * const tokens = GetUserGrants('123', '456');
 */
export function GetUserGrants(guildId: string, userId: string): string[] {
    const guildMap = grantedForever.get(guildId);
    if (!guildMap) {
        return [];
    }
    const userTokens = guildMap.get(userId);
    if (!userTokens) {
        return [];
    }
    return Array.from(userTokens);
}

/**
 * @brief Revoke all permanent grants for a user in a guild from both cache and database
 * @param guildId string Guild identifier
 * @param userId string User identifier
 * @param revokedBy string Discord user id who performed the revoke
 * @returns number Count of tokens revoked
 * @example
 * const count = await RevokeAllGrants('123', '456', '789');
 */
export async function RevokeAllGrants(
    guildId: string,
    userId: string,
    revokedBy: string,
): Promise<number> {
    if (!_repository) {
        throw new Error(`Permission store not initialized; cannot revoke grants.`);
    }

    const existingTokens = GetUserGrants(guildId, userId);
    if (existingTokens.length === 0) {
        return 0;
    }

    let revokedCount = 0;
    for (const serializedToken of existingTokens) {
        try {
            const changed = await _repository.RevokeGrantToken({
                guildId,
                userId,
                token: serializedToken,
                updatedBy: revokedBy,
            });
            if (changed) {
                revokedCount++;
            }
        } catch(error) {
            Log.error(`Failed to revoke token ${serializedToken}: ${(error as Error).message}`, `PermissionStore`);
        }
    }

    // Clear in memory cache for this user
    const guildMap = grantedForever.get(guildId);
    if (guildMap) {
        guildMap.delete(userId);
    }

    Log.info(`Revoked ${revokedCount} grants for user ${userId} in guild ${guildId}`, `PermissionStore`);
    return revokedCount;
}
