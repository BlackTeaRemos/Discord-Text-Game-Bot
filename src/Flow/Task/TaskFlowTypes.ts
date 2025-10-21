import type { TaskStatus } from '../../Domain/Task.js';

/**
 * Input payload required to persist a task record.
 */
export interface CreateTaskInput {
    organizationUid: string; // owning organization uid
    creatorDiscordId: string; // creator discord snowflake
    executorDiscordId?: string | null; // executor discord snowflake; null clears
    objectUid?: string | null; // related object uid
    description: string; // task description
    status?: TaskStatus; // optional custom status
}

/**
 * Parameters used when listing tasks with viewer-specific visibility.
 */
export interface TaskFetchInput {
    organizationUid: string; // scope organization uid
    viewerDiscordId: string; // requesting user discord id
    includeAll?: boolean; // include every org task when true
}

/**
 * Payload for updating task status while checking permissions.
 */
export interface UpdateTaskStatusInput {
    taskId: string; // target task id
    organizationUid: string; // owning organization uid
    viewerDiscordId: string; // executor or admin discord id
    status: TaskStatus; // new status value
    allowOverride?: boolean; // bypass creator/executor restriction
}

/**
 * Payload for assigning or clearing a task executor.
 */
export interface AssignTaskInput {
    taskId: string; // target task id
    organizationUid: string; // owning organization uid
    viewerDiscordId: string; // caller discord id
    executorDiscordId?: string | null; // target executor id; null removes assignment
    allowOverride?: boolean; // bypass restrictions when true
}
