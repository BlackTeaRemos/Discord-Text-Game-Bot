import type { Neo4jClient } from '../../Repository/Neo4jClient.js';
import type { TaskListItem } from '../../Domain/Task.js';
import { REL_BELONGS_TO, REL_CREATED_TASK, REL_EXECUTES_TASK, TASK_LABEL } from './TaskConstants.js';
import { MapTaskRecord } from './MapTaskRecord.js';
import type { TaskFetchInput } from './TaskFlowTypes.js';

export async function FetchTasksForViewer(client: Neo4jClient, input: TaskFetchInput): Promise<TaskListItem[]> {
    const session = await client.GetSession(`READ`);

    try {
        const result = await session.run(
            `MATCH (task:${TASK_LABEL})
             OPTIONAL MATCH (task)-[:${REL_BELONGS_TO}]->(org:Organization)
             OPTIONAL MATCH (creator:User)-[:${REL_CREATED_TASK}]->(task)
             OPTIONAL MATCH (executor:User)-[:${REL_EXECUTES_TASK}]->(task)
               WITH task,
                   org,
                   collect(DISTINCT creator) AS creators,
                   collect(DISTINCT executor) AS executors,
                   ($allowOverride OR $includeAll OR task.creator_discord_id = $viewerDiscordId OR task.executor_discord_id = $viewerDiscordId) AS allowed,
                   ($targetDiscordId IS NULL OR task.creator_discord_id = $targetDiscordId OR task.executor_discord_id = $targetDiscordId) AS matchesTarget
               WHERE allowed
                 AND matchesTarget
                 AND ($organizationUid IS NULL OR $organizationUid = '' OR org.uid = $organizationUid)
                 AND ($gameUid IS NULL OR task.game_uid = $gameUid)
                 AND ($turnNumber IS NULL OR task.turn_number = $turnNumber)
                 AND (size($statuses) = 0 OR task.status IN $statuses)
               WITH task,
                   org,
                   head(creators) AS creator,
                   head(executors) AS executor
               RETURN task, org AS organization, creator, executor
             ORDER BY task.updated_at DESC, task.created_at DESC`,
            {
                organizationUid: input.organizationUid ?? null,
                viewerDiscordId: input.viewerDiscordId,
                gameUid: input.gameUid ?? null,
                turnNumber: input.turnNumber ?? null,
                includeAll: Boolean(input.includeAll),
                allowOverride: Boolean(input.allowOverride),
                targetDiscordId: input.targetDiscordId ?? null,
                statuses: input.statuses ?? [],
            },
        );

        return result.records.map(record => {
            return MapTaskRecord({
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
