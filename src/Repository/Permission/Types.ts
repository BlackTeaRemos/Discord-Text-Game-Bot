/**
 * Represents a permanent permission grant bundle stored in the database as a single record per guild and user
 */
export interface PermissionGrantBundle {
    guildId: string;
    userId: string;
    tokens: string[];
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
}

/**
 * Options for upserting a token into a grant bundle
 */
export interface UpsertPermissionGrantTokenOptions {
    guildId: string;
    userId: string;
    token: string;
    updatedBy: string;
}

/**
 * Options for revoking a token from a grant bundle
 */
export interface RevokePermissionGrantTokenOptions {
    guildId: string;
    userId: string;
    token: string;
    updatedBy: string;
}
