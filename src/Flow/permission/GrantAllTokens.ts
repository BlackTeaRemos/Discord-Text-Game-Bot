import { GrantForever } from '../../Common/Permission/store.js';
import { CollectAllTokens } from './CollectAllTokens.js';
import type { DiscoveredToken } from './CollectAllTokens.js';
import { log } from '../../Common/Log.js';

/**
 * Result of a bulk grant-all operation.
 *
 * @property grantedCount number How many tokens were newly granted.
 * @property totalTokens number Total unique tokens discovered.
 * @property tokens DiscoveredToken[] Full list of tokens that were granted.
 */
export interface GrantAllResult {
    grantedCount: number;
    totalTokens: number;
    tokens: DiscoveredToken[];
}

/**
 * Grant every known command permission token to a user in a guild.
 * Dynamically discovers tokens from the loaded commands map.
 *
 * @param guildId string Guild identifier (example: '123456').
 * @param userId string Target user identifier (example: '789012').
 * @param grantedBy string Admin user who approved the grant (example: '345678').
 * @returns Promise<GrantAllResult> Summary of the grant operation.
 *
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
