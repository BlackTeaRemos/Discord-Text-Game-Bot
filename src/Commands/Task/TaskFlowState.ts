import type { ChatInputCommandInteraction } from 'discord.js';
import type { TaskListItem } from '../../Domain/Task.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';

export type TaskFlowAction = `create` | `view_mine` | `view_org` | `assign` | `status` | `exit`;

export interface TaskFlowState {
    organizationUid?: string;
    organizationName?: string;
    action?: TaskFlowAction;
    description?: string;
    objectUid?: string | null;
    tasks?: TaskListItem[];
    selectedTaskId?: string;
    statusChoice?: string;
    executorDiscordId?: string | null;
    pendingTaskList?: TaskListItem[];
    awaitingStatus?: boolean;
    awaitingAssignment?: boolean;
    latestTask?: TaskListItem;
    baseInteraction?: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
}
