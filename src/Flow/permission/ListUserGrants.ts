import { GetUserGrants } from '../../Common/Permission/store.js';

/**
 * A single grant entry formatted for display.
 *
 * @property serialized string Raw serialized token (example: 's:view').
 * @property formatted string Human-readable representation (example: 'view').
 */
export interface GrantEntry {
    serialized: string;
    formatted: string;
}

/**
 * Result of listing a user's permanent grants.
 *
 * @property grants GrantEntry[] All discovered grant entries.
 */
export interface ListGrantsResult {
    grants: GrantEntry[];
}

/**
 * List all permanent permission grants a user holds in a guild.
 *
 * @param guildId string Guild identifier (example: '123456').
 * @param userId string Target user identifier (example: '789012').
 * @returns ListGrantsResult Formatted list of grants.
 *
 * @example
 * const result = ListUserGrants('guild1', 'user1');
 */
export function ListUserGrants(guildId: string, userId: string): ListGrantsResult {
    const serializedTokens = GetUserGrants(guildId, userId);

    const grants: GrantEntry[] = serializedTokens.map((serialized) => {
        return {
            serialized,
            formatted: __FormatSerializedToken(serialized),
        };
    });

    return { grants };
}

/**
 * Convert a serialized token key back into a human-readable format.
 * Strips type prefixes (s:, n:, b:, u:) and joins with ':'.
 *
 * @param serialized string Serialized token (example: 's:view').
 * @returns string Human-readable format (example: 'view').
 */
function __FormatSerializedToken(serialized: string): string {
    return serialized
        .split(`|`)
        .map((part) => {
            if (part.startsWith(`s:`)) {
                return part.slice(2);
            }
            if (part.startsWith(`n:`)) {
                return part.slice(2);
            }
            if (part.startsWith(`b:`)) {
                return part.slice(2) === `1` ? `true` : `false`;
            }
            if (part === `u:`) {
                return `*`;
            }
            return part;
        })
        .join(`:`);
}
