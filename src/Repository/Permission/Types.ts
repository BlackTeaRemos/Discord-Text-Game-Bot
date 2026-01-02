/**
 * Represents a permanent permission grant bundle stored in the database.
 *
 * Instead of one DB row per token, this model stores a single record per (guildId,userId)
 * with an array of serialized tokens.
 *
 * @property guildId string Discord guild identifier.
 * @property userId string Discord user identifier.
 * @property tokens string[] Serialized permission tokens.
 * @property createdAt string ISO timestamp of when bundle was created.
 * @property updatedAt string ISO timestamp of when bundle was last updated.
 * @property updatedBy string Discord user id who last approved a change.
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
 * Options for upserting a token into a grant bundle.
 * @property guildId string Discord guild identifier.
 * @property userId string Discord user identifier who receives the grant.
 * @property token string Serialized permission token.
 * @property updatedBy string Discord user id who approved.
 */
export interface UpsertPermissionGrantTokenOptions {
    guildId: string;
    userId: string;
    token: string;
    updatedBy: string;
}

/**
 * Options for revoking a token from a grant bundle.
 * @property guildId string Discord guild identifier.
 * @property userId string Discord user identifier whose token is revoked.
 * @property token string Serialized permission token.
 * @property updatedBy string Discord user id who performed the revoke.
 */
export interface RevokePermissionGrantTokenOptions {
    guildId: string;
    userId: string;
    token: string;
    updatedBy: string;
}
