import type { FlowBuilder } from '../../Common/Flow/Builder.js';
import type { TaskFlowState } from './TaskFlowState.js';
import { PromptTaskView } from './View/TaskViewPrompt.js';
import { HandleTaskViewInteraction } from './View/TaskViewInteraction.js';
import {
    TASK_VIEW_ALL_BUTTON_ID,
    TASK_VIEW_CLOSE_BUTTON_ID,
    TASK_VIEW_CUSTOM_FILTER_BUTTON_ID,
    TASK_VIEW_FILTER_MENU_ID,
    TASK_VIEW_NEXT_BUTTON_ID,
    TASK_VIEW_PREV_BUTTON_ID,
    TASK_VIEW_SELECT_ID,
    TASK_VIEW_SELECT_ORG_BUTTON_ID,
    TASK_VIEW_SELECT_ORG_MENU_ID,
} from './View/TaskViewIds.js';

/**
 * Register the task dashboard step.
 * Keeps the task list visible for the entire interaction and applies filters in-place.
 * @param builder FlowBuilder<TaskFlowState> Builder used to register steps. @example registerTaskViewStep(builder)
 * @returns FlowBuilder<TaskFlowState> Builder for chaining. @example registerTaskViewStep(builder).next()
 */
export function registerTaskViewStep(builder: FlowBuilder<TaskFlowState>): FlowBuilder<TaskFlowState> {
    return builder
        .step(
            [
                TASK_VIEW_SELECT_ID,
                TASK_VIEW_PREV_BUTTON_ID,
                TASK_VIEW_NEXT_BUTTON_ID,
                TASK_VIEW_ALL_BUTTON_ID,
                TASK_VIEW_CUSTOM_FILTER_BUTTON_ID,
                TASK_VIEW_FILTER_MENU_ID,
                TASK_VIEW_SELECT_ORG_BUTTON_ID,
                TASK_VIEW_SELECT_ORG_MENU_ID,
                TASK_VIEW_CLOSE_BUTTON_ID,
            ],
            `task_view`,
        )
        .prompt(PromptTaskView)
        .onInteraction(HandleTaskViewInteraction)
        .next();
}
