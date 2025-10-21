import { ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { StartDescriptionCreateFlow } from './DescriptionFlow.js';
import type { FlowManager } from '../../Common/Flow/Manager.js';

/**
 * Start the interactive description editor. Accept a FlowManager instance from the
 * command environment so the subcommand can orchestrate the multi-step interaction.
 */
export async function StartInteractiveDescriptionEditor(
    flowManager: FlowManager,
    interaction: ChatInputCommandInteraction,
    executionContext?: any,
) {
    return StartDescriptionCreateFlow(flowManager, interaction, executionContext as any);
}
