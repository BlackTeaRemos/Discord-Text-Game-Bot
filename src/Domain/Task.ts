/**
 * Task domain model and helper types encapsulating persisted task metadata.
 * Provides a shared contract for task operations across flows and repositories.
 * @example
 * const task: TaskEntity = {
 *   id: 'task_123',
 *   organizationUid: 'org_1',
 *   creatorDiscordId: '123456',
 *   description: 'Prepare weekly report',
 *   status: 'active',
 *   createdAt: Date.now(),
 *   updatedAt: Date.now(),
 *   version: 1
 * };
 */
export interface TaskEntity {
    /** Stable task identifier shared across systems. */
    id: string;
    /** Owning organization UID that constrains visibility. */
    organizationUid: string;
    /** Game UID that this task belongs to; null when not linked to a game. */
    gameUid: string | null;
    /** Turn number this task belongs to; null when not tied to a specific turn. */
    turnNumber: number | null;
    /** Discord snowflake of the user who created the task. */
    creatorDiscordId: string;
    /** Optional Discord snowflake of the assigned executor; null when unassigned. */
    executorDiscordId?: string | null;
    /** Optional UID of the related object providing domain linkage. */
    objectUid?: string | null;
    /** Short task description for list views */
    shortDescription: string;
    /** Free-form task description supplied by users. */
    description: string;
    /** Arbitrary task status chosen from configured values. */
    status: TaskStatus;
    /** Unix epoch in milliseconds when the task was created. */
    createdAt: number;
    /** Unix epoch in milliseconds for the last task update. */
    updatedAt: number;
    /** Monotonically increasing version counter for optimistic updates. */
    version: number;
}

/**
 * Enriched task view model returned to Discord flows for display purposes.
 * Mirrors TaskEntity properties while adding optional human readable names.
 * @example
 * const item: TaskListItem = { ...task, organizationName: 'Main Org' };
 */
export interface TaskListItem extends TaskEntity {
    /** Friendly organization name for UI embeds. */
    organizationName?: string;
    /** Human readable creator display name. */
    creatorName?: string;
    /** Human readable executor display name. */
    executorName?: string;
}

/**
 * Canonical task statuses understood by the UI. Additional custom states are allowed at runtime.
 * @example
 * const allStatuses = [...DEFAULT_TASK_STATUSES, 'blocked'];
 */
export const DEFAULT_TASK_STATUSES: readonly string[] = Object.freeze([
    `incomplete`,
    `in_progress`,
    `complete`,
    `failed`,
]);

/**
 * String literal union describing known task statuses while permitting custom values.
 * The intersection with Record<never, never> keeps TypeScript extensible without widening to string.
 * @example
 * const status: TaskStatus = userInput as TaskStatus;
 */
export type TaskStatus =
    | `incomplete`
    | `in_progress`
    | `complete`
    | `failed`
    | (string & Record<never, never>);
