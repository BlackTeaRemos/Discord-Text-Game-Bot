import { NormalizeToken } from './normalizeToken.js';
import { TokenKey } from './tokenKey.js';
import type { PermissionTokenInput } from './types.js';
import { PermissionGrantRepository } from '../../Repository/Permission/index.js';
import type { Neo4jClient } from '../../Repository/Neo4jClient.js';
import { log } from '../Log.js';

const grantedForever: Map<string, Map<string, Set<string>>> = new Map(); // guildId -> userId -> serialized tokens

let _repository: PermissionGrantRepository | null = null;

/**
 * Initialize the permission store with a Neo4j client.
 * Must be called before grants can be persisted.
 * @param client Neo4jClient Database client instance.
 * @returns Promise<void> Resolves when initialization complete.
 */
export async function InitializePermissionStore(client: Neo4jClient): Promise<void> {
    _repository = new PermissionGrantRepository(client);
    await _repository.Initialize();
    log.info(`Permission store initialized`, `PermissionStore`);
}

/**
 * Load all grants for a guild into the in-memory cache.
 * Call this when a guild becomes available.
 * @param guildId string Guild identifier.
 * @returns Promise<void> Resolves when grants loaded.
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

    log.info(
        `Loaded ${loadedTokenCount} permission grants across ${bundles.length} bundles for guild ${guildId}`,
        `PermissionStore`,
    );
}

/**
 * Persist a permanent permission grant both in memory and database.
 * @param guildId string Unique guild identifier (example: 'guild').
 * @param userId string Unique user identifier (example: 'user').
 * @param token PermissionTokenInput Token granted forever (example: 'command:create').
 * @param grantedBy string Discord user id who approved the grant.
 * @returns Promise<void> Resolves when grant is persisted.
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
        log.info(`Persisted permission grant: ${serialized} for user ${userId} in guild ${guildId}`, `PermissionStore`);
    } catch (error) {
        log.error(`Failed to persist permission grant: ${(error as Error).message}`, `PermissionStore`);
        throw error instanceof Error ? error : new Error(String(error));
    }
}

// Internal helper to keep cache updated after persistence.
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
 * Checks whether a user already holds a permanent grant for any provided token.
 * @param guildId string Guild identifier (example: 'guild').
 * @param userId string User identifier (example: 'user').
 * @param tokens PermissionTokenInput[] Tokens to compare against stored grants (example: ['command:create']).
 * @returns boolean True when a matching permanent grant is found (example: true).
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
