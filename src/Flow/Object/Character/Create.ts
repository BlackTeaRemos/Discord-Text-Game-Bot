import { randomUUID } from 'crypto';
import { neo4jClient } from '../../../Setup/Neo4j.js';
import { AssociateCharacterWithOrganization } from './Relation.js';

export interface CreateCharacterOptions {
    /**
     * Character name.
     */
    name: string;
    /**
     * Friendly display name.
     */
    friendlyName?: string;
    /**
     * Optional character description.
     */
    description?: string;
    /**
     * Optional organization uid to link.
     */
    organizationUid?: string;
    /**
     * Optional creator discord id.
     */
    createdBy?: string;
}

export interface CreatedCharacter {
    uid: string;
    id: string;
    name: string;
    friendly_name: string;
    description: string;
    organization_uid: string | null;
}

/**
 * Create a Character node.
 * Optionally links it to an Organization.
 * @param options CreateCharacterOptions Character values. @example await CreateCharacter({ name: 'Vex', organizationUid: 'org_123' })
 * @returns Promise<CreatedCharacter> Created character snapshot. @example const character = await CreateCharacter({ name: 'Vex' })
 */
export async function CreateCharacter(options: CreateCharacterOptions): Promise<CreatedCharacter> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const trimmedName = options.name?.trim();
        if (!trimmedName) {
            throw new Error(`Character name is required.`);
        }

        const uid = `char_${randomUUID().replace(/-/g, ``)}`;
        const friendlyName = (options.friendlyName?.trim() || trimmedName) as string;
        const description = options.description?.trim() || ``;
        const organizationUid = options.organizationUid?.trim() || null;
        const createdAt = new Date().toISOString();
        const createdBy = options.createdBy?.trim() || null;

        const query = `
            CREATE (c:Character:DBObject:Entity {
                uid: $uid,
                id: $uid,
                name: $name,
                friendly_name: $friendlyName,
                description: $description,
                organization_uid: $organizationUid,
                created_at: $createdAt,
                created_by: $createdBy
            })
            RETURN c.uid AS uid,
                c.id AS id,
                c.name AS name,
                c.friendly_name AS friendly_name,
                c.description AS description,
                c.organization_uid AS organization_uid`;

        const result = await session.run(query, {
            uid,
            name: trimmedName,
            friendlyName,
            description,
            organizationUid,
            createdAt,
            createdBy,
        });

        const record = result.records[0];
        if (!record) {
            throw new Error(`Failed to create character.`);
        }

        if (organizationUid) {
            await AssociateCharacterWithOrganization(uid, organizationUid);
        }

        return {
            uid: String(record.get(`uid`)),
            id: String(record.get(`id`)),
            name: String(record.get(`name`)),
            friendly_name: String(record.get(`friendly_name`)),
            description: String(record.get(`description`) ?? ``),
            organization_uid: (record.get(`organization_uid`) ? String(record.get(`organization_uid`)) : null) as string | null,
        };
    } finally {
        await session.close();
    }
}
