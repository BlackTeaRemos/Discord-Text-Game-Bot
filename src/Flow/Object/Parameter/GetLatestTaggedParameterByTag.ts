import { neo4jClient } from '../../../Setup/Neo4j.js';
import type { ObjectTypeKey } from '../../../Common/Flow/ObjectRegistry.js';
import { ResolveObjectLabel } from './ResolveObjectLabel.js';
import type { TaggedParameterRecord } from './Types.js';

const REL_HAS_TAGGED_PARAMETER = `HAS_TAGGED_PARAMETER`;

/**
 * Get the latest tagged parameter record for an object by tag.
 * @param options object Options.
 * @returns Promise<TaggedParameterRecord | null> Latest record or null.
 */
export async function GetLatestTaggedParameterByTag(options: {
    objectType: ObjectTypeKey;
    objectUid: string;
    tag: string;
}): Promise<TaggedParameterRecord | null> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const objectLabel = ResolveObjectLabel(options.objectType);
        const query = `
            MATCH (o:${objectLabel} { uid: $objectUid })-[:${REL_HAS_TAGGED_PARAMETER}]->(p:TaggedParameter { tag: $tag })
            RETURN p
            ORDER BY p.createdAt DESC
            LIMIT 1`;
        const result = await session.run(query, { objectUid: options.objectUid, tag: options.tag.trim() });
        const record = result.records[0];
        if (!record) {
            return null;
        }
        const props = record.get(`p`).properties;
        return {
            uid: props.uid,
            id: props.id,
            tag: props.tag,
            payload_json: props.payload_json,
            createdAt: props.createdAt,
            createdBy: props.createdBy,
        } as TaggedParameterRecord;
    } finally {
        await session.close();
    }
}
