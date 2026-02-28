import { neo4jClient } from '../../../Setup/Neo4j.js';
import { InMemoryCache } from '../../../Common/InMemoryCache.js';
import type { ViewCharacter } from './View.js';

/** In-memory TTL cache for active character lookups (5 min, 200 entries). */
const _activeCharacterCache = new InMemoryCache<ViewCharacter | null>(5 * 60 * 1000, 200);

/**
 * Associate a character with an organization.
 * Creates BELONGS_TO relationship from Character to Organization.
 * @param characterUid string Character unique identifier. @example 'char_abc123'
 * @param organizationUid string Organization unique identifier. @example 'org_xyz789'
 * @returns Promise<void>
 */
export async function AssociateCharacterWithOrganization(
    characterUid: string,
    organizationUid: string,
): Promise<void> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const query = `
            MATCH (c:Character { uid: $characterUid })
            MATCH (o:Organization { uid: $organizationUid })
            MERGE (c)-[:BELONGS_TO]->(o)
            SET c.organization_uid = $organizationUid`;
        await session.run(query, { characterUid, organizationUid });
    } finally {
        await session.close();
    }
}

/**
 * Remove character association from organization.
 * Deletes BELONGS_TO relationship and clears organization reference.
 * @param characterUid string Character unique identifier. @example 'char_abc123'
 * @returns Promise<void>
 */
export async function RemoveCharacterFromOrganization(characterUid: string): Promise<void> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const query = `
            MATCH (c:Character { uid: $characterUid })-[r:BELONGS_TO]->(o:Organization)
            DELETE r
            SET c.organization_uid = null`;
        await session.run(query, { characterUid });
    } finally {
        await session.close();
    }
}

/**
 * Get the active character for a user based on discord ID.
 * Resolves the character through ASSUMES_CHARACTER relationship.
 * @param discordId string Discord user identifier. @example '123456789012345678'
 * @returns Promise<ViewCharacter | null> Active character or null if none set.
 */
export async function GetUserActiveCharacter(discordId: string): Promise<ViewCharacter | null> {
    const cached = _activeCharacterCache.Get(discordId);
    if (cached !== undefined) {
        return cached;
    }

    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (u:User { discord_id: $discordId })-[:ASSUMES_CHARACTER]->(c:Character)
            RETURN c`;
        const result = await session.run(query, { discordId });
        const record = result.records[0];
        if (!record) {
            _activeCharacterCache.Set(discordId, null);
            return null;
        }
        const characterNode = record.get(`c`).properties;
        const viewCharacter: ViewCharacter = {
            uid: characterNode.uid,
            name: characterNode.name,
            friendly_name: characterNode.friendly_name,
            description: characterNode.description || ``,
            organizationUid: characterNode.organization_uid || null,
        };
        _activeCharacterCache.Set(discordId, viewCharacter);
        return viewCharacter;
    } finally {
        await session.close();
    }
}

/**
 * Set the active character for a user.
 * Creates or updates ASSUMES_CHARACTER relationship from User to Character.
 * @param discordId string Discord user identifier. @example '123456789012345678'
 * @param characterUid string Character unique identifier. @example 'char_abc123'
 * @returns Promise<void>
 */
export async function SetUserActiveCharacter(discordId: string, characterUid: string): Promise<void> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const query = `
            MATCH (u:User { discord_id: $discordId })
            OPTIONAL MATCH (u)-[oldRel:ASSUMES_CHARACTER]->(:Character)
            DELETE oldRel
            WITH u
            MATCH (c:Character { uid: $characterUid })
            MERGE (u)-[:ASSUMES_CHARACTER]->(c)`;
        await session.run(query, { discordId, characterUid });
        _activeCharacterCache.Delete(discordId);
    } finally {
        await session.close();
    }
}

/**
 * Clear the active character for a user.
 * Removes ASSUMES_CHARACTER relationship from User.
 * @param discordId string Discord user identifier. @example '123456789012345678'
 * @returns Promise<void>
 */
export async function ClearUserActiveCharacter(discordId: string): Promise<void> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const query = `
            MATCH (u:User { discord_id: $discordId })-[r:ASSUMES_CHARACTER]->(:Character)
            DELETE r`;
        await session.run(query, { discordId });
        _activeCharacterCache.Delete(discordId);
    } finally {
        await session.close();
    }
}

/**
 * List all characters available to a user.
 * Returns characters from organizations the user belongs to, plus independent characters.
 * @param discordId string Discord user identifier. @example '123456789012345678'
 * @returns Promise<ViewCharacter[]> Available characters for the user.
 */
export async function ListAvailableCharactersForUser(discordId: string): Promise<ViewCharacter[]> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (u:User { discord_id: $discordId })-[:BELONGS_TO]->(o:Organization)
            MATCH (c:Character)-[:BELONGS_TO]->(o)
            RETURN DISTINCT c
            UNION
            MATCH (c:Character)
            WHERE c.organization_uid IS NULL
            RETURN c
            ORDER BY c.name`;
        const result = await session.run(query, { discordId });
        return result.records.map(record => {
            const characterNode = record.get(`c`).properties;
            return {
                uid: characterNode.uid,
                name: characterNode.name,
                friendly_name: characterNode.friendly_name,
                description: characterNode.description || ``,
                organizationUid: characterNode.organization_uid || null,
            };
        });
    } finally {
        await session.close();
    }
}
