import { randomUUID } from 'crypto';
import { neo4jClient } from '../../../Setup/Neo4j.js';
import type { ObjectTypeKey } from '../../../Common/Flow/ObjectRegistry.js';
import { ResolveObjectLabel } from './ResolveObjectLabel.js';
import type { TaggedParameterRecord } from './Types.js';

const REL_HAS_TAGGED_PARAMETER = `HAS_TAGGED_PARAMETER`;
const TAGGED_PARAMETER_LABEL = `TaggedParameter`;

/**
 * Create a tagged parameter record for an object.
 * @param options object Configuration.
 * @returns Promise<TaggedParameterRecord> Created record snapshot.
 */
export async function CreateTaggedParameter(options: {
    objectType: ObjectTypeKey;
    objectUid: string;
    tag: string;
    payloadJson: string;
    createdBy: string;
}): Promise<TaggedParameterRecord> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const objectLabel = ResolveObjectLabel(options.objectType);
        const uid = `param_${randomUUID().replace(/-/g, ``)}`;
        const createdAt = new Date().toISOString();
        const tag = options.tag.trim();

        const query = `
            MATCH (o:${objectLabel} { uid: $objectUid })
            CREATE (p:${TAGGED_PARAMETER_LABEL}:DBObject:Entity {
                uid: $uid,
                id: $uid,
                tag: $tag,
                payload_json: $payloadJson,
                createdAt: $createdAt,
                createdBy: $createdBy
            })
            MERGE (o)-[:${REL_HAS_TAGGED_PARAMETER}]->(p)
            RETURN p`;

        const result = await session.run(query, {
            objectUid: options.objectUid,
            uid,
            tag,
            payloadJson: options.payloadJson,
            createdAt,
            createdBy: options.createdBy,
        });

        const record = result.records[0];
        if (!record) {
            throw new Error(`Target object not found.`);
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
