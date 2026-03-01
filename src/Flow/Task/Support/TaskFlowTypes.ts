import type { TaskStatus } from '../../../Domain/Task.js';

/**
 * Input payload required to persist a task record
 */
export interface CreateTaskInput {
    organizationUid: string; // owning organization uid
    gameUid?: string | null; // owning game uid or null when not linked
    turnNumber?: number | null; // owning turn number or null when not linked
    creatorDiscordId: string; // creator discord snowflake
    executorDiscordId?: string | null; // executor discord snowflake or null to clear
    objectUid?: string | null; // related object uid
    shortDescription: string; // short description for list views
    description: string; // task description
    status?: TaskStatus; // optional custom status
}

/**
 * Parameters used when listing tasks with viewer specific visibility
 */
export interface TaskFetchInput {
    organizationUid?: string | null; // scope organization uid or null for all allowed organizations
    viewerDiscordId: string; // requesting user discord id
    gameUid?: string | null; // optional game uid filter
    turnNumber?: number | null; // optional turn number filter
    includeAll?: boolean; // include every org task when true
    allowOverride?: boolean; // bypass viewer restrictions when true
    targetDiscordId?: string | null; // optionally limit tasks to this user as creator or executor
    statuses?: TaskStatus[]; // optional status filter
}

/**
 * Payload for updating task status while checking permissions
 */
export interface UpdateTaskStatusInput {
    taskId: string; // target task id
    organizationUid: string; // owning organization uid
    viewerDiscordId: string; // executor or admin discord id
    status: TaskStatus; // new status value
    allowOverride?: boolean; // bypass creator or executor restriction
}

/**
 * Payload for assigning or clearing a task executor
 */
export interface AssignTaskInput {
    taskId: string; // target task id
    organizationUid: string; // owning organization uid
    viewerDiscordId: string; // caller discord id
    executorDiscordId?: string | null; // target executor id or null to remove assignment
    allowOverride?: boolean; // bypass restrictions when true
}

/**
 * Payload for fetching a single task record by id with permission check
 */
export interface FetchTaskByIdInput {
    taskId: string; // target task id
    organizationUid: string; // owning organization uid
    viewerDiscordId: string; // caller discord id
    allowOverride?: boolean; // bypass viewer restrictions when true
}

/**
 * Payload for deleting a task while checking permissions
 */
export interface RemoveTaskInput {
    taskId: string; // target task id
    organizationUid: string; // owning organization uid
    viewerDiscordId: string; // creator or admin discord id
    allowOverride?: boolean; // bypass creator restriction
}
