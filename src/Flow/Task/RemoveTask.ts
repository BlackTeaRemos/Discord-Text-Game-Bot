import type { Neo4jClient } from '../../Repository/Neo4jClient.js';
import { TASK_LABEL, REL_BELONGS_TO } from './taskConstants.js';
import type { RemoveTaskInput } from './TaskFlowTypes.js';

/**
 * Permanently remove a task record from Neo4j after verifying permissions.
 * Only the creator or an administrator can remove a task.
 * @param client Neo4jClient Database client.
 * @param input RemoveTaskInput Deletion payload.
 * @returns Promise<boolean> True if the task was found and deleted.
 * @example
 * const deleted = await RemoveTask(neo4jClient, { taskId: 'task_1', viewerDiscordId: '123' });
 */
export async function RemoveTask(
    client: Neo4jClient,
    input: RemoveTaskInput,
): Promise<boolean> {
    const session = await client.GetSession(`WRITE`);

    try {
        const result = await session.run(
            `MATCH (task:${TASK_LABEL} { id: $taskId })
             OPTIONAL MATCH (task)-[:${REL_BELONGS_TO}]->(org:Organization)
             WITH task, org,
                  ($allowOverride OR task.creator_discord_id = $viewerDiscordId) AS permitted
             WHERE permitted
               AND ($organizationUid IS NULL OR $organizationUid = '' OR org.uid = $organizationUid)
             DETACH DELETE task
             RETURN count(task) AS deletedCount`,
            {
                taskId: input.taskId,
                organizationUid: input.organizationUid ?? null,
                viewerDiscordId: input.viewerDiscordId,
                allowOverride: Boolean(input.allowOverride),
            },
        );

        const count = result.records[0]?.get(`deletedCount`)?.toNumber() ?? 0;
        return count > 0;
    } finally {
        await session.close();
    }
}
