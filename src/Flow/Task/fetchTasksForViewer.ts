import type { Neo4jClient } from '../../Repository/Neo4jClient.js';
import type { TaskListItem } from '../../Domain/Task.js';
import { REL_BELONGS_TO, REL_CREATED_TASK, REL_EXECUTES_TASK, TASK_LABEL } from './taskConstants.js';
import { mapTaskRecord } from './mapTaskRecord.js';
import type { TaskFetchInput } from './TaskFlowTypes.js';

export async function fetchTasksForViewer(client: Neo4jClient, input: TaskFetchInput): Promise<TaskListItem[]> {
    const session = await client.GetSession(`READ`);

    try {
        const result = await session.run(
            `MATCH (org:Organization { uid: $organizationUid })
             MATCH (task:${TASK_LABEL})-[:${REL_BELONGS_TO}]->(org)
             OPTIONAL MATCH (creator:User)-[:${REL_CREATED_TASK}]->(task)
             OPTIONAL MATCH (executor:User)-[:${REL_EXECUTES_TASK}]->(task)
             WITH task,
                  org,
                  collect(DISTINCT creator) AS creators,
                  collect(DISTINCT executor) AS executors,
                  ($includeAll OR task.creator_discord_id = $viewerDiscordId OR task.executor_discord_id = $viewerDiscordId) AS allowed
             WHERE allowed
             WITH task,
                  org,
                  head(creators) AS creator,
                  head(executors) AS executor
             RETURN task, org AS organization, creator, executor
             ORDER BY task.updated_at DESC, task.created_at DESC`,
            {
                organizationUid: input.organizationUid,
                viewerDiscordId: input.viewerDiscordId,
                includeAll: Boolean(input.includeAll),
            },
        );

        return result.records.map(record => {
            return mapTaskRecord({
                task: record.get(`task`),
                organization: record.get(`organization`),
                creator: record.get(`creator`),
                executor: record.get(`executor`),
            });
        });
    } finally {
        await session.close();
    }
}
