import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { log } from '../../../Common/Log.js';
import { createOrganizationCreateState } from '../../../Flow/Object/Organization/CreateState.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import { RegisterOrganizationCreateSession } from '../../../SubCommand/Object/Organization/OrganizationCreateControls.js';
import { BuildOrganizationPreviewEmbed } from '../../../SubCommand/Object/Organization/Renderers/BuildOrganizationPreviewEmbed.js';
import { BuildOrganizationCreateControlsContent } from '../../../SubCommand/Object/Organization/Renderers/BuildOrganizationCreateControlsContent.js';
import { BuildOrganizationCreateControlRows } from '../../../SubCommand/Object/Organization/Renderers/BuildOrganizationCreateControlRows.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`create`)
    .setDescription(`Preview a new organization before completing creation`);

export const permissionTokens = `object:organization:create`;

/**
 * Start an interactive organization creation session with live preview and controls.
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction used to reply. @example await execute(interaction)
 * @returns Promise<void> Resolves after the preview and controls have been rendered. @example await execute(interaction)
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    try {
        const ownerDiscordId = interaction.user.id;
        const state = createOrganizationCreateState({ ownerDiscordId });

        await interaction.reply({
            content: `Preview how your organization will appear once created.`,
            embeds: [BuildOrganizationPreviewEmbed(state)],
            flags: MessageFlags.Ephemeral,
        });

        const previewMessage = await interaction.fetchReply();
        state.previewMessageId = previewMessage.id;

        const controlsContent = BuildOrganizationCreateControlsContent(state);
        const controlRows = BuildOrganizationCreateControlRows(state);
        const controlsMessage = await interaction.followUp({
            content: controlsContent,
            components: controlRows,
            flags: MessageFlags.Ephemeral,
        });

        state.controlsMessageId = controlsMessage.id;

        const bucket = interaction.executionContext.shared.objectOrganizationCreate ?? {};
        bucket.state = state;
        bucket.previewMessageId = state.previewMessageId;
        bucket.controlsMessageId = state.controlsMessageId;
        interaction.executionContext.shared.objectOrganizationCreate = bucket;

        await RegisterOrganizationCreateSession({
            interaction,
            state,
            previewMessageId: state.previewMessageId!,
            controlsMessageId: state.controlsMessageId!,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to execute object organization create`, message, `ObjectOrganizationCreateCommand`);
        const response = {
            content: `Unable to start organization creation: ${message}`,
            flags: MessageFlags.Ephemeral,
        } as const;
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(response);
            } else {
                await interaction.reply(response);
            }
        } catch {
            // Silent failure if Discord refuses the message.
        }
        throw error instanceof Error ? error : new Error(message);
    }
}
