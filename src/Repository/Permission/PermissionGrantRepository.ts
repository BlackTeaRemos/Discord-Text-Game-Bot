import type { Neo4jClient } from '../Neo4jClient.js';
import type { Record as Neo4jRecord } from 'neo4j-driver';
import type {
    PermissionGrantBundle,
    UpsertPermissionGrantTokenOptions,
    RevokePermissionGrantTokenOptions,
} from './Types.js';

/**
 * Repository for managing permanent permission grants in Neo4j.
 */
export class PermissionGrantRepository {
    private _client: Neo4jClient;

    /**
     * Create a new permission grant repository.
     * @param client Neo4jClient Database client instance.
     */
    constructor(client: Neo4jClient) {
        this._client = client;
    }

    /**
     * Initialize repository by creating constraints and indexes.
     * @returns Promise<void> Resolves when initialization complete.
     */
    async Initialize(): Promise<void> {
        const session = await this._client.GetSession();
        try {
            await session.run(`
                CREATE CONSTRAINT permission_grant_bundle_unique IF NOT EXISTS
                FOR (b:PermissionGrantBundle)
                REQUIRE (b.guildId, b.userId) IS UNIQUE
            `);
        } finally {
            await session.close();
        }
    }

    /**
     * Upsert a token into a permanent permission grant bundle.
     *
     * This stores a single node per (guildId,userId) with a `tokens` array.
     * @param options UpsertPermissionGrantTokenOptions Token upsert details.
     * @returns Promise<PermissionGrantBundle> Updated bundle.
     */
    async UpsertGrantToken(options: UpsertPermissionGrantTokenOptions): Promise<PermissionGrantBundle> {
        const session = await this._client.GetSession();
        try {
            const result = await session.run(`
                MERGE (b:PermissionGrantBundle {
                    guildId: $guildId,
                    userId: $userId
                })
                ON CREATE SET
                    b.createdAt = datetime(),
                    b.updatedAt = datetime(),
                    b.updatedBy = $updatedBy,
                    b.tokens = [$token]
                ON MATCH SET
                    b.updatedAt = datetime(),
                    b.updatedBy = $updatedBy,
                    b.tokens = CASE
                        WHEN b.tokens IS NULL THEN [$token]
                        WHEN $token IN b.tokens THEN b.tokens
                        ELSE b.tokens + $token
                    END
                RETURN b
            `, {
                guildId: options.guildId,
                userId: options.userId,
                token: options.token,
                updatedBy: options.updatedBy,
            });

            const record = result.records[0];
            const node = record.get(`b`).properties;

            return {
                guildId: node.guildId,
                userId: node.userId,
                tokens: (node.tokens as string[]) ?? [],
                createdAt: String(node.createdAt),
                updatedAt: String(node.updatedAt),
                updatedBy: node.updatedBy,
            };
        } finally {
            await session.close();
        }
    }

    /**
     * Check if a user has a permanent grant for any of the given tokens.
     * @param guildId string Guild identifier.
     * @param userId string User identifier.
     * @param tokens string[] Serialized tokens to check.
     * @returns Promise<boolean> True if any grant exists.
     */
    async HasGrant(guildId: string, userId: string, tokens: string[]): Promise<boolean> {
        if (!guildId || !userId || tokens.length === 0) {
            return false;
        }

        const session = await this._client.GetSession(`READ`);
        try {
            const result = await session.run(`
                MATCH (b:PermissionGrantBundle { guildId: $guildId, userId: $userId })
                WHERE any(token IN $tokens WHERE token IN coalesce(b.tokens, []))
                RETURN count(b) > 0 AS hasGrant
            `, { guildId, userId, tokens });

            return result.records[0]?.get(`hasGrant`) ?? false;
        } finally {
            await session.close();
        }
    }

    /**
     * Load all grant bundles for a guild.
     * @param guildId string Guild identifier.
     * @returns Promise<PermissionGrantBundle[]> All bundles for the guild.
     */
    async LoadGrantBundlesForGuild(guildId: string): Promise<PermissionGrantBundle[]> {
        const session = await this._client.GetSession(`READ`);
        try {
            const result = await session.run(`
                MATCH (b:PermissionGrantBundle)
                WHERE b.guildId = $guildId
                RETURN b
            `, { guildId });

            return result.records.map((record: Neo4jRecord) => {
                const node = record.get(`b`).properties;
                return {
                    guildId: node.guildId as string,
                    userId: node.userId as string,
                    tokens: ((node.tokens as string[]) ?? []).map(token => {
                        return String(token);
                    }),
                    createdAt: String(node.createdAt),
                    updatedAt: String(node.updatedAt),
                    updatedBy: node.updatedBy as string,
                };
            });
        } finally {
            await session.close();
        }
    }

    /**
     * Revoke a single token from a grant bundle.
     * When the last token is removed, the bundle node is deleted.
     * @param options RevokePermissionGrantTokenOptions Revoke details.
     * @returns Promise<boolean> True when a change occurred.
     */
    async RevokeGrantToken(options: RevokePermissionGrantTokenOptions): Promise<boolean> {
        const session = await this._client.GetSession();
        try {
            const result = await session.run(`
                MATCH (b:PermissionGrantBundle { guildId: $guildId, userId: $userId })
                WITH b, coalesce(b.tokens, []) AS currentTokens
                WITH b, currentTokens, [t IN currentTokens WHERE t <> $token] AS nextTokens
                WITH b, currentTokens, nextTokens, size(currentTokens) <> size(nextTokens) AS changed
                FOREACH (_ IN CASE WHEN size(nextTokens) = 0 THEN [1] ELSE [] END |
                    DELETE b
                )
                FOREACH (_ IN CASE WHEN size(nextTokens) > 0 THEN [1] ELSE [] END |
                    SET b.tokens = nextTokens,
                        b.updatedAt = datetime(),
                        b.updatedBy = $updatedBy
                )
                RETURN changed AS changed
            `, {
                guildId: options.guildId,
                userId: options.userId,
                token: options.token,
                updatedBy: options.updatedBy,
            });

            return result.records[0]?.get(`changed`) ?? false;
        } finally {
            await session.close();
        }
    }
}
