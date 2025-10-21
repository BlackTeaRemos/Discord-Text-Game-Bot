import type { ChatInputCommandInteraction } from 'discord.js';
import type { FlowManager } from '../../Common/Flow/Manager.js';
import type { ExecutionContext } from '../../Domain/Command.js';
import type { TaskFlowState } from './TaskFlowState.js';
import { registerTaskOrganizationStep } from './registerTaskOrganizationStep.js';
import { registerTaskActionMenuStep } from './registerTaskActionMenuStep.js';
import { registerTaskCreateStep } from './registerTaskCreateStep.js';
import { registerTaskViewStep } from './registerTaskViewStep.js';

export async function startTaskFlow(
    flowManager: FlowManager,
    interaction: ChatInputCommandInteraction,
    executionContext?: ExecutionContext,
): Promise<void> {
    const builder = flowManager.builder<TaskFlowState>(interaction.user.id, interaction, {}, executionContext);
    registerTaskOrganizationStep(builder, interaction);
    registerTaskActionMenuStep(builder);
    registerTaskCreateStep(builder);
    registerTaskViewStep(builder);
    await builder.start();
}
