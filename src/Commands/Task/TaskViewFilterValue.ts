import type { TaskStatusGroup, TaskViewScope } from './TaskFlowState.js';

export type TaskViewFilterValue = `${TaskViewScope}:${TaskStatusGroup}`;

/**
 * Build filter options for the task list.
 * @param currentTurn number | undefined Current game turn used for labels. @example 3
 * @returns Array<{label,value}> Select options. @example BuildTaskViewFilterOptions(3)
 */
export function BuildTaskViewFilterOptions(
    currentTurn?: number,
): Array<{ label: string; value: TaskViewFilterValue }> {
    const turnLabel = currentTurn ? `turn ${currentTurn}` : `current turn`;
    return [
        { label: `To do for ${turnLabel}`, value: `current_turn:todo` },
        { label: `Completed for ${turnLabel}`, value: `current_turn:completed` },
        { label: `Failed for ${turnLabel}`, value: `current_turn:failed` },
        { label: `All statuses for ${turnLabel}`, value: `current_turn:all` },
        { label: `To do for all turns`, value: `all_turns:todo` },
        { label: `Completed for all turns`, value: `all_turns:completed` },
        { label: `Failed for all turns`, value: `all_turns:failed` },
        { label: `All tasks for all turns`, value: `all_turns:all` },
    ];
}

/**
 * Parse a filter value posted back from Discord.
 * @param value string Raw menu value. @example 'current_turn:todo'
 * @returns {scope,group} Parsed parts or null when invalid. @example ParseTaskViewFilterValue('all_turns:all')
 */
export function ParseTaskViewFilterValue(
    value: string,
): { scope: TaskViewScope; group: TaskStatusGroup } | null {
    const raw = String(value ?? ``).trim();
    const parts = raw.split(`:`);
    if (parts.length !== 2) {
        return null;
    }
    const scope = parts[0] as TaskViewScope;
    const group = parts[1] as TaskStatusGroup;
    const scopeOk = scope === `current_turn` || scope === `all_turns`;
    const groupOk = group === `todo` || group === `completed` || group === `failed` || group === `all`;
    if (!scopeOk || !groupOk) {
        return null;
    }
    return { scope, group };
}
