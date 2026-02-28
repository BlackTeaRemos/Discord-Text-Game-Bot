import { GrantForever } from '../../Common/Permission/Store.js';
import { CollectAllTokens } from './CollectAllTokens.js';
import type { DiscoveredToken } from './CollectAllTokens.js';
import { log } from '../../Common/Log.js';

/**
 * Result of a bulk grant all operation
 */
export interface GrantAllResult {
    grantedCount: number;
    totalTokens: number;
    tokens: DiscoveredToken[];
}

/**
 * Grant every known command permission token to a user in a guild by dynamically discovering tokens
 * @param guildId string Guild identifier
 * @param userId string Target user identifier
 * @param grantedBy string Admin user who approved the grant
 * @returns Promise_GrantAllResult Summary of the grant operation
 * @example
 * const result = await GrantAllTokens('guild1', 'user1', 'admin1');
 */
export async function GrantAllTokens(
    guildId: string,
    userId: string,
    grantedBy: string,
): Promise<GrantAllResult> {
    const allTokens = await CollectAllTokens();

    let grantedCount = 0;
    for (const discovered of allTokens) {
        try {
            await GrantForever(guildId, userId, discovered.token, grantedBy);
            grantedCount++;
        } catch(error) {
            log.error(
                `Failed to grant token ${discovered.serialized} to ${userId}: ${(error as Error).message}`,
                `GrantAllTokens`,
            );
        }
    }

    log.info(
        `Granted ${grantedCount}/${allTokens.length} tokens to user ${userId} in guild ${guildId}`,
        `GrantAllTokens`,
    );

    return {
        grantedCount,
        totalTokens: allTokens.length,
        tokens: allTokens,
    };
}
