/**
 * Fetch a single task record by id with viewer permission enforcement.
 */
import type { Neo4jClient } from '../../Repository/Neo4jClient.js';
import type { TaskListItem } from '../../Domain/Task.js';
import { REL_BELONGS_TO, REL_CREATED_TASK, REL_EXECUTES_TASK, TASK_LABEL } from './TaskConstants.js';
import { MapTaskRecord } from './MapTaskRecord.js';
import type { FetchTaskByIdInput } from './TaskFlowTypes.js';

export async function FetchTaskById(client: Neo4jClient, input: FetchTaskByIdInput): Promise<TaskListItem | null> {
    const session = await client.GetSession(`READ`);

    try {
        const result = await session.run(
            `MATCH (task:${TASK_LABEL} { id: $taskId })-[:${REL_BELONGS_TO}]->(org:Organization { uid: $organizationUid })
             OPTIONAL MATCH (creator:User)-[:${REL_CREATED_TASK}]->(task)
             OPTIONAL MATCH (executor:User)-[:${REL_EXECUTES_TASK}]->(task)
             WITH task,
                  org,
                  creator,
                  executor,
                  ($allowOverride OR task.creator_discord_id = $viewerDiscordId OR task.executor_discord_id = $viewerDiscordId) AS permitted
             WHERE permitted
             RETURN task, org AS organization, creator, executor`,
            {
                taskId: input.taskId,
                organizationUid: input.organizationUid,
                viewerDiscordId: input.viewerDiscordId,
                allowOverride: Boolean(input.allowOverride),
            },
        );

        const record = result.records?.[0];
        if (!record) {
            return null;
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
