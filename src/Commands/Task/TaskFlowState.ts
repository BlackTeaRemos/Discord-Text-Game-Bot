import type { ChatInputCommandInteraction } from 'discord.js';
import type { TaskListItem } from '../../Domain/Task.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import type { TaskViewUiMode } from './View/TaskViewTypes.js';

export type TaskFlowAction = `create` | `view_mine` | `view_org` | `assign` | `status` | `manage_turn` | `exit`;

export type TaskViewScope = `current_turn` | `all_turns`;
export type TaskStatusGroup = `todo` | `completed` | `failed` | `all`;

export interface TaskFlowState {
    organizationUid?: string;
    organizationName?: string;
    organizationUidFilter?: string | null;
    organizationNameFilter?: string;
    gameUid?: string;
    gameName?: string;
    currentTurn?: number;
    uiMode?: TaskViewUiMode;
    pageIndex?: number;
    pageSize?: number;
    action?: TaskFlowAction;
    isTaskAdmin?: boolean;
    taskAdminUserIds?: string[];
    viewScope?: TaskViewScope;
    statusGroup?: TaskStatusGroup;
    description?: string;
    objectUid?: string | null;
    tasks?: TaskListItem[];
    selectedTaskId?: string;
    requestedTaskId?: string;
    targetUserId?: string;
    statusChoice?: string;
    executorDiscordId?: string | null;
    pendingTaskList?: TaskListItem[];
    awaitingStatus?: boolean;
    awaitingAssignment?: boolean;
    latestTask?: TaskListItem | null;
    baseInteraction?: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
}
