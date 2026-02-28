/**
 * Map a task status group into a set of task status strings.
 * @param statusGroup string Status group identifier. @example 'todo'
 * @returns string[] List of statuses. @example ['incomplete','in_progress']
 */
export function ResolveStatusesForGroup(statusGroup: string): string[] {
    const normalized = (statusGroup ?? ``).trim().toLowerCase();
    if (normalized === `todo`) {
        return [`incomplete`, `in_progress`];
    }
    if (normalized === `completed`) {
        return [`complete`];
    }
    if (normalized === `failed`) {
        return [`failed`];
    }
    return [];
}
