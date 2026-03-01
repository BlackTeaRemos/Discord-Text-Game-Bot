import { RevokeAllGrants } from '../../Common/Permission/Store.js';
import { Log } from '../../Common/Log.js';

/**
 * Result of a bulk revoke-all operation.
 *
 * @property revokedCount number Number of tokens actually revoked.
 */
export interface RevokeAllResult {
    revokedCount: number;
}

/**
 * Revoke every permanent permission grant for a user in a guild.
 *
 * @param guildId string Guild identifier (example: '123456').
 * @param userId string Target user identifier (example: '789012').
 * @param revokedBy string Admin who approved the revoke (example: '345678').
 * @returns Promise<RevokeAllResult> Summary of the revocation.
 *
 * @example
 * const result = await RevokeAllTokens('guild1', 'user1', 'admin1');
 */
export async function RevokeAllTokens(
    guildId: string,
    userId: string,
    revokedBy: string,
): Promise<RevokeAllResult> {
    try {
        const revokedCount = await RevokeAllGrants(guildId, userId, revokedBy);
        Log.info(
            `Revoked ${revokedCount} permission grants for user ${userId} in guild ${guildId}`,
            `RevokeAllTokens`,
        );
        return { revokedCount };
    } catch (error) {
        Log.error(
            `Failed to revoke grants for ${userId}: ${(error as Error).message}`,
            `RevokeAllTokens`,
        );
        throw error instanceof Error ? error : new Error(String(error));
    }
}
