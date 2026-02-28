import { GetUserGrants } from '../../Common/Permission/Store.js';

/**
 * A single grant entry formatted for display
 */
export interface GrantEntry {
    serialized: string;
    formatted: string;
}

/**
 * Result of listing permanent grants for a user
 */
export interface ListGrantsResult {
    grants: GrantEntry[];
}

/**
 * List all permanent permission grants a user holds in a guild
 * @param guildId string Guild identifier
 * @param userId string Target user identifier
 * @returns ListGrantsResult Formatted list of grants
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
 * Convert a serialized token key back into a human readable format by stripping type prefixes
 * @param serialized string Serialized token
 * @returns string Human readable format
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
