import type { Neo4jClient } from '../../Repository/Neo4jClient.js';
import type { TaskListItem } from '../../Domain/Task.js';
import { REL_BELONGS_TO, REL_CREATED_TASK, REL_EXECUTES_TASK, TASK_LABEL } from './TaskConstants.js';
import { MapTaskRecord } from './MapTaskRecord.js';
import type { AssignTaskInput } from './TaskFlowTypes.js';

export async function AssignTaskExecutor(client: Neo4jClient, input: AssignTaskInput): Promise<TaskListItem | null> {
    const session = await client.GetSession(`WRITE`);

    try {
        const result = await session.run(
            `MATCH (task:${TASK_LABEL} { id: $taskId })-[:${REL_BELONGS_TO}]->(org:Organization { uid: $organizationUid })
             OPTIONAL MATCH (creator:User)-[:${REL_CREATED_TASK}]->(task)
             OPTIONAL MATCH (currentExec:User)-[:${REL_EXECUTES_TASK}]->(task)
             WITH task, org, creator, currentExec,
                  ($allowOverride OR task.creator_discord_id = $viewerDiscordId OR task.executor_discord_id = $viewerDiscordId) AS permitted
             WHERE permitted
             OPTIONAL MATCH (currentExec)-[rel:${REL_EXECUTES_TASK}]->(task)
             FOREACH (_ IN CASE WHEN rel IS NULL THEN [] ELSE [1] END | DELETE rel)
             WITH task, org, creator
             OPTIONAL MATCH (newExec:User { discord_id: $executorDiscordId })
             FOREACH (_ IN CASE WHEN newExec IS NULL THEN [] ELSE [1] END |
                 MERGE (newExec)-[:${REL_EXECUTES_TASK}]->(task)
             )
             SET task.executor_discord_id = $executorDiscordId,
                 task.updated_at = $timestamp,
                 task.version = coalesce(task.version, 1) + 1
             RETURN task, org AS organization, creator, newExec AS executor`,
            {
                taskId: input.taskId,
                organizationUid: input.organizationUid,
                viewerDiscordId: input.viewerDiscordId,
                executorDiscordId: input.executorDiscordId ?? null,
                timestamp: Date.now(),
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
