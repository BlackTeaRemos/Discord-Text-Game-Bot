import { neo4jClient } from '../../../Setup/Neo4j.js';

/**
 * Character properties returned by view operations.
 */
export interface ViewCharacter {
    uid: string; // unique character identifier
    name: string; // character name
    friendly_name: string; // display name
    description: string; // character description
    organizationUid: string | null; // owning organization or null
}

/**
 * Character with additional relationship context.
 */
export interface CharacterWithOrganization {
    character: ViewCharacter;
    organizationName: string | null; // name of related organization if any
}

/**
 * Retrieve a character by UID.
 * @param uid string Character unique identifier. @example 'char_abc123'
 * @returns Promise<ViewCharacter | null> Character data or null if not found.
 */
export async function GetCharacterByUid(uid: string): Promise<ViewCharacter | null> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (c:Character { uid: $uid })
            RETURN c`;
        const result = await session.run(query, { uid });
        const record = result.records[0];
        if (!record) {
            return null;
        }
        const characterNode = record.get(`c`).properties;
        return {
            uid: characterNode.uid,
            name: characterNode.name,
            friendly_name: characterNode.friendly_name,
            description: characterNode.description || ``,
            organizationUid: characterNode.organization_uid || null,
        };
    } finally {
        await session.close();
    }
}

/**
 * Retrieve a character with organization context.
 * @param uid string Character unique identifier. @example 'char_abc123'
 * @returns Promise<CharacterWithOrganization | null> Character with organization name or null.
 */
export async function GetCharacterWithOrganization(uid: string): Promise<CharacterWithOrganization | null> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (c:Character { uid: $uid })
            OPTIONAL MATCH (c)-[:BELONGS_TO]->(o:Organization)
            RETURN c, o.name AS orgName`;
        const result = await session.run(query, { uid });
        const record = result.records[0];
        if (!record) {
            return null;
        }
        const characterNode = record.get(`c`).properties;
        const organizationName = record.get(`orgName`);
        return {
            character: {
                uid: characterNode.uid,
                name: characterNode.name,
                friendly_name: characterNode.friendly_name,
                description: characterNode.description || ``,
                organizationUid: characterNode.organization_uid || null,
            },
            organizationName: organizationName ? String(organizationName) : null,
        };
    } finally {
        await session.close();
    }
}

/**
 * List all characters belonging to a specific organization.
 * @param organizationUid string Organization unique identifier. @example 'org_xyz789'
 * @returns Promise<ViewCharacter[]> Array of characters in the organization.
 */
export async function ListCharactersByOrganization(organizationUid: string): Promise<ViewCharacter[]> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (c:Character)-[:BELONGS_TO]->(o:Organization { uid: $organizationUid })
            RETURN c
            ORDER BY c.name`;
        const result = await session.run(query, { organizationUid });
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
