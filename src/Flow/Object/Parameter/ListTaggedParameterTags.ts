import { neo4jClient } from '../../../Setup/Neo4j.js';
import type { ObjectTypeKey } from '../../../Common/Flow/ObjectRegistry.js';
import { ResolveObjectLabel } from './ResolveObjectLabel.js';
import type { TaggedParameterTag } from './Types.js';

const REL_HAS_TAGGED_PARAMETER = `HAS_TAGGED_PARAMETER`;

/**
 * List available tagged parameter tags for a given object.
 * @param options object Options.
 * @returns Promise<TaggedParameterTag[]> Tags available for the object.
 */
export async function ListTaggedParameterTags(options: {
    objectType: ObjectTypeKey;
    objectUid: string;
}): Promise<TaggedParameterTag[]> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const objectLabel = ResolveObjectLabel(options.objectType);
        const query = `
            MATCH (o:${objectLabel} { uid: $objectUid })-[:${REL_HAS_TAGGED_PARAMETER}]->(p:TaggedParameter)
            RETURN DISTINCT p.tag AS tag
            ORDER BY tag`;
        const result = await session.run(query, { objectUid: options.objectUid });
        return result.records.map(record => {
            return { tag: String(record.get(`tag`)) } as TaggedParameterTag;
        });
    } finally {
        await session.close();
    }
}
