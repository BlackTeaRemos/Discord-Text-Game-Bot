import { randomUUID } from 'crypto';
import type { DBObject } from '../../../Repository/Object/Object.js';
import { neo4jClient } from '../../../Setup/Neo4j.js';
import { EnsureGlobalOrganizationMembership } from '../Organization/Global/index.js';

export interface CreateUserOptions {
    /**
     * Discord identifier of the user.
     */
    discordId: string;
    /**
     * Optional display name persisted on the node.
     */
    name?: string;
    /**
     * Optional friendly name alias.
     */
    friendlyName?: string;
    /** Optional image URL to display on the user profile. */
    imageUrl?: string;
    /** Optional preferred locale (e.g. 'en', 'ru') to persist on the user node. */
    preferredLocale?: string;
}

export interface CreatedUser extends DBObject {
    discord_id: string;
    image?: string;
    preferred_locale?: string | null;
}

/**
 * Create or update a User node in Neo4j with the given metadata.
 * If a user with the same Discord ID exists, returns existing UID while optionally refreshing provided fields.
 * @param options CreateUserOptions Configuration describing the user to persist. @example await CreateUser({ discordId: '123', name: 'Jamie' })
 * @returns Promise<CreatedUser> Persisted user snapshot. @example const user = await CreateUser({ discordId: '123' })
 */
export async function CreateUser(options: CreateUserOptions): Promise<CreatedUser> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const uid = `user_${randomUUID().replace(/-/g, ``)}`;
        const name = options.name?.trim() || null;
        const friendlyName = options.friendlyName?.trim() || null;
        const image = options.imageUrl?.trim() || null;
        const preferredLocale = options.preferredLocale?.trim() || null;

        const query = `
            MERGE (u:User { discord_id: $discordId })
            ON CREATE SET
                u.uid = $uid,
                u.id = $uid,
                u.name = $name,
                u.friendly_name = $friendlyName,
                u.image = $image,
                u.preferred_locale = $preferredLocale
            ON MATCH SET
                u.name = coalesce($name, u.name),
                u.friendly_name = coalesce($friendlyName, u.friendly_name),
                u.image = coalesce($image, u.image),
                u.preferred_locale = coalesce($preferredLocale, u.preferred_locale)
            RETURN u.uid AS uid,
                u.id AS id,
                u.discord_id AS discord_id,
                u.name AS name,
                u.friendly_name AS friendly_name,
                u.image AS image,
                u.preferred_locale AS preferred_locale`;
        const result = await session.run(query, {
            discordId: options.discordId,
            uid,
            name,
            friendlyName,
            image,
            preferredLocale,
        });
        const record = result.records[0];
        const createdUser: CreatedUser = {
            uid: record.get(`uid`),
            id: record.get(`id`),
            discord_id: record.get(`discord_id`),
            name: record.get(`name`) ?? undefined,
            friendly_name: record.get(`friendly_name`) ?? undefined,
            image: record.get(`image`) ?? undefined,
            preferred_locale: record.get(`preferred_locale`) ?? null,
        }; // persisted user snapshot
        await EnsureGlobalOrganizationMembership(options.discordId, false);
        return createdUser;
    } finally {
        await session.close();
    }
}
