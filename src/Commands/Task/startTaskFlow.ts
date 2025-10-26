import type { ChatInputCommandInteraction } from 'discord.js';
import type { FlowManager } from '../../Common/Flow/Manager.js';
import type { ExecutionContext } from '../../Domain/Command.js';
import type { TaskFlowState } from './TaskFlowState.js';
import { registerTaskOrganizationStep } from './RegisterTaskOrganizationStep.js';
import { registerTaskActionMenuStep } from './RegisterTaskActionMenuStep.js';
import { registerTaskCreateStep } from './RegisterTaskCreateStep.js';
import { registerTaskViewStep } from './RegisterTaskViewStep.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';

export async function startTaskFlow(
    flowManager: FlowManager,
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
    executionContext?: ExecutionContext,
): Promise<void> {
    const builder = flowManager.builder<TaskFlowState>(interaction.user.id, interaction, {}, executionContext);
    registerTaskOrganizationStep(builder, interaction);
    registerTaskActionMenuStep(builder);
    registerTaskCreateStep(builder);
    registerTaskViewStep(builder);
    await builder.start();
}
