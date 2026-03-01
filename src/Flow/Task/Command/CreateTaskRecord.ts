import { randomUUID } from 'crypto';
import type { Neo4jClient } from '../../../Repository/Neo4jClient.js';
import type { TaskListItem } from '../../../Domain/Task.js';
import {
    DEFAULT_TASK_STATUS,
    REL_BELONGS_TO,
    REL_CREATED_TASK,
    REL_EXECUTES_TASK,
    REL_PART_OF_GAME,
    REL_RELATES_TO,
    TASK_LABEL,
} from '../Support/TaskConstants.js';
import { MapTaskRecord } from '../Support/MapTaskRecord.js';
import type { CreateTaskInput } from '../Support/TaskFlowTypes.js';

/**
 * Create task record and required user nodes in Neo4j
 * @param client Neo4jClient Database client used for write session example neo4jClient
 * @param input CreateTaskInput Task payload example { creatorDiscordId: '123', shortDescription: 'Fix', description: 'Fix bug' }
 * @returns Promise<TaskListItem> Created task view example { id: 'task_x', shortDescription: 'Fix' }
 * @example
 * const task = await CreateTaskRecord(neo4jClient, input)
 */
export async function CreateTaskRecord(client: Neo4jClient, input: CreateTaskInput): Promise<TaskListItem> {
    const session = await client.GetSession(`WRITE`);
    const executorDiscordId = input.executorDiscordId ?? input.creatorDiscordId; // executor id
    const taskId = `task_${randomUUID().replace(/-/g, ``).toLowerCase()}`; // task id
    const creatorUid = `user_${randomUUID().replace(/-/g, ``).toLowerCase()}`; // creator uid
    const executorUid = `user_${randomUUID().replace(/-/g, ``).toLowerCase()}`; // executor uid
    const timestamp = Date.now(); // epoch time

    try {
        const result = await session.run(
            `OPTIONAL MATCH (org:Organization { uid: $organizationUid })
             OPTIONAL MATCH (game:Game { uid: $gameUid })
             MERGE (creator:User { discord_id: $creatorDiscordId })
             ON CREATE SET creator.uid = $creatorUid, creator.id = $creatorUid
             MERGE (executor:User { discord_id: $executorDiscordId })
             ON CREATE SET executor.uid = $executorUid, executor.id = $executorUid
             WITH org, game, creator, executor
             OPTIONAL MATCH (linked { uid: $objectUid })
             CREATE (task:${TASK_LABEL} {
                 id: $taskId,
                 uid: $taskId,
                 short_description: $shortDescription,
                 description: $description,
                 status: $status,
                 creator_discord_id: $creatorDiscordId,
                 executor_discord_id: $executorDiscordId,
                 organization_uid: $organizationUid,
                 game_uid: $gameUid,
                 turn_number: $turnNumber,
                 object_uid: $objectUid,
                 created_at: $timestamp,
                 updated_at: $timestamp,
                 version: 1
             })
             MERGE (creator)-[:${REL_CREATED_TASK}]->(task)
             FOREACH (_ IN CASE WHEN org IS NULL THEN [] ELSE [1] END |
                 MERGE (task)-[:${REL_BELONGS_TO}]->(org)
             )
             FOREACH (_ IN CASE WHEN game IS NULL THEN [] ELSE [1] END |
                 MERGE (task)-[:${REL_PART_OF_GAME}]->(game)
             )
             FOREACH (_ IN CASE WHEN executor IS NULL THEN [] ELSE [1] END |
                 MERGE (executor)-[:${REL_EXECUTES_TASK}]->(task)
             )
             FOREACH (_ IN CASE WHEN linked IS NULL THEN [] ELSE [1] END |
                 MERGE (task)-[:${REL_RELATES_TO}]->(linked)
             )
             RETURN task, org AS organization, creator, executor`,
            {
                organizationUid: input.organizationUid,
                gameUid: input.gameUid ?? null,
                turnNumber: input.turnNumber ?? null,
                creatorDiscordId: input.creatorDiscordId,
                executorDiscordId,
                objectUid: input.objectUid ?? null,
                shortDescription: input.shortDescription,
                description: input.description,
                status: input.status ?? DEFAULT_TASK_STATUS,
                taskId,
                creatorUid,
                executorUid,
                timestamp,
            },
        );

        const record = result.records?.[0];
        if (!record) {
            throw new Error(`Failed to create task`);
        }
        return MapTaskRecord({
            task: record.get(`task`),
            organization: record.get(`organization`),
            creator: record.get(`creator`),
            executor: record.get(`executor`),
        });
    } finally {
        await session.close();
    }
}
