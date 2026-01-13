import { randomUUID } from 'crypto';
import type { Neo4jClient } from '../../Repository/Neo4jClient.js';
import type { TaskListItem } from '../../Domain/Task.js';
import {
    DEFAULT_TASK_STATUS,
    REL_BELONGS_TO,
    REL_CREATED_TASK,
    REL_EXECUTES_TASK,
    REL_PART_OF_GAME,
    REL_RELATES_TO,
    TASK_LABEL,
} from './TaskConstants.js';
import { MapTaskRecord } from './MapTaskRecord.js';
import type { CreateTaskInput } from './TaskFlowTypes.js';

export async function CreateTaskRecord(client: Neo4jClient, input: CreateTaskInput): Promise<TaskListItem> {
    const session = await client.GetSession(`WRITE`);
    const executorDiscordId = input.executorDiscordId ?? input.creatorDiscordId;
    const taskId = `task_${randomUUID().replace(/-/g, ``).toLowerCase()}`;
    const timestamp = Date.now();

    try {
        const result = await session.run(
            `MATCH (org:Organization { uid: $organizationUid })
             OPTIONAL MATCH (game:Game { uid: $gameUid })
             MATCH (creator:User { discord_id: $creatorDiscordId })
             OPTIONAL MATCH (executor:User { discord_id: $executorDiscordId })
             OPTIONAL MATCH (linked { uid: $objectUid })
             CREATE (task:${TASK_LABEL} {
                 id: $taskId,
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
             MERGE (task)-[:${REL_BELONGS_TO}]->(org)
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
                description: input.description,
                status: input.status ?? DEFAULT_TASK_STATUS,
                taskId,
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
