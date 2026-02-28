import { neo4jClient } from '../../Setup/Neo4j.js';

export interface ResolvedObject {
    uid: string; // object unique identifier
    type: string; // object type such as game task organization
    name: string; // friendly display name
}

/**
 * Resolve any object by its unique identifier searching across all nodes with a uid property in the database
 * @param uid string Object unique identifier @example 'game_abc123'
 * @returns ResolvedObject Object info or null if not found
 */
export async function ResolveObjectByUid(uid: string): Promise<ResolvedObject | null> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (n { uid: $uid })
            RETURN n.uid AS uid, 
                   labels(n) AS labels, 
                   coalesce(n.name, n.friendly_name, n.description, n.uid) AS name
            LIMIT 1`;
        const result = await session.run(query, { uid });
        const record = result.records[0];
        if (!record) {
            return null;
        }

        const labels = record.get(`labels`) as string[];
        const objectType = __ExtractObjectType(labels);

        return {
            uid: String(record.get(`uid`)),
            type: objectType,
            name: String(record.get(`name`)),
        };
    } finally {
        await session.close();
    }
}

/**
 * Extract primary object type from Neo4j labels
 * @param labels strings Node labels from Neo4j
 * @returns string Primary object type
 */
function __ExtractObjectType(labels: string[]): string {
    const typeLabels = labels.filter(label => {
        return !label.startsWith(`DB`) && label !== `Entity` && label !== `Node`;
    });

    if (typeLabels.includes(`Game`)) {
        return `game`;
    }
    if (typeLabels.includes(`Task`)) {
        return `task`;
    }
    if (typeLabels.includes(`Organization`)) {
        return `organization`;
    }
    if (typeLabels.includes(`User`)) {
        return `user`;
    }
    if (typeLabels.includes(`Character`)) {
        return `character`;
    }
    if (typeLabels.includes(`Building`) || typeLabels.includes(`Factory`)) {
        return `factory`;
    }
    if (typeLabels.includes(`Description`)) {
        return `description`;
    }

    return typeLabels[0]?.toLowerCase() ?? `object`;
}
