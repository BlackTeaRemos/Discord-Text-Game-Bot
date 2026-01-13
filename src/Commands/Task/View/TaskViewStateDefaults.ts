import type { TaskFlowState } from '../TaskFlowState.js';

/**
 * Apply view defaults for the task dashboard.
 * @param state TaskFlowState Mutable state. @example ApplyTaskViewDefaults(state)
 * @returns void Nothing. @example void
 */
export function ApplyTaskViewDefaults(state: TaskFlowState): void {
    state.viewScope = state.viewScope ?? `current_turn`;
    state.statusGroup = state.statusGroup ?? `todo`;
    state.pageIndex = state.pageIndex ?? 0;
    state.pageSize = state.pageSize ?? 10;
}
