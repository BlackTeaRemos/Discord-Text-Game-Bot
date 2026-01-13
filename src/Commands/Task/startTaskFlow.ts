import type { ChatInputCommandInteraction } from 'discord.js';
import type { FlowManager } from '../../Common/Flow/Manager.js';
import type { ExecutionContext } from '../../Domain/Command.js';
import type { TaskFlowState } from './TaskFlowState.js';
import { registerTaskOrganizationStep } from './RegisterTaskOrganizationStep.js';
import { registerTaskGameStep } from './RegisterTaskGameStep.js';
import { registerTaskActionMenuStep } from './RegisterTaskActionMenuStep.js';
import { registerTaskCreateStep } from './RegisterTaskCreateStep.js';
import { registerTaskViewStep } from './RegisterTaskViewStep.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { GetCachedConfig } from '../../Services/ConfigCache.js';

export async function startTaskFlow(
    flowManager: FlowManager,
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
    executionContext?: ExecutionContext,
): Promise<void> {
    const config = await GetCachedConfig();
    const taskAdminUserIds = config.taskAdminUserIds ?? [];
    const requestedTaskId = interaction.options.getString(`id`) ?? undefined;
    const initialState: TaskFlowState = {
        taskAdminUserIds,
        isTaskAdmin: taskAdminUserIds.includes(interaction.user.id),
        requestedTaskId,
        selectedTaskId: requestedTaskId ?? undefined,
        action: requestedTaskId ? `status` : undefined,
        awaitingStatus: Boolean(requestedTaskId),
    };
    const builder = flowManager.builder<TaskFlowState>(interaction.user.id, interaction, initialState, executionContext);
    registerTaskOrganizationStep(builder, interaction);
    registerTaskGameStep(builder, interaction);
    registerTaskActionMenuStep(builder);
    registerTaskCreateStep(builder);
    registerTaskViewStep(builder);
    await builder.start();
}
