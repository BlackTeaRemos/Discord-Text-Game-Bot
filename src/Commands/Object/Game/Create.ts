import { Colors, EmbedBuilder, MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { createGameCreateState } from '../../../Flow/Object/Game/Create.js';
import { GameCreateFlowConstants } from '../../../Flow/Object/Game/CreateState.js';
import { BuildGamePreviewEmbed } from '../../../SubCommand/Object/Game/Renderers/BuildGamePreviewEmbed.js';
import { BuildControlsContent } from '../../../SubCommand/Object/Game/Renderers/BuildControlsContent.js';
import { BuildControlRows } from '../../../SubCommand/Object/Game/Renderers/BuildControlRows.js';
import { AwaitTextInput } from '../../../SubCommand/Prompt/TextAsync.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`create`)
    .setDescription(`Preview a new game before completing creation`);

export const permissionTokens = `object:game:create`;

/**
 * Show a basic game preview embed before starting the interactive flow.
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction used to reply with execution context hydrated. @example await execute(interaction)
 * @returns Promise<void> Resolves after the preview embed is sent. @example await execute(interaction)
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const serverId = interaction.guildId;
    if (!serverId) {
        throw new Error(`This command must be used in a server.`);
    }

    const state = createGameCreateState({ serverId });
    const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle(`# New Game Preview`)
        .setDescription(`Describe the experience your players should expect.`)
        .setFooter({ text: `Server ${serverId}` })
        .setImage(GameCreateFlowConstants.defaultImageUrl);

    await interaction.reply({
        content: `Preview how your game will appear once created.`,
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
    });

    const previewMessage = await interaction.fetchReply();
    state.previewMessageId = previewMessage.id;

    const controlsContent = BuildControlsContent(state);
    const controlRows = BuildControlRows(state);
    const controlsMessage = await interaction.followUp({
        content: controlsContent,
        components: controlRows,
        flags: MessageFlags.Ephemeral,
    });

    state.controlsMessageId = controlsMessage.id;

    const bucket = interaction.executionContext.shared.objectGameCreate ?? {};
    bucket.state = state;
    bucket.previewMessageId = state.previewMessageId;
    bucket.controlsMessageId = state.controlsMessageId;
    interaction.executionContext.shared.objectGameCreate = bucket;

    state.awaitingName = true;
    await interaction.webhook.editMessage(state.controlsMessageId, {
        content: BuildControlsContent(state),
        components: BuildControlRows(state),
    });

    try {
        const newName = await AwaitTextInput({
            interaction,
            prompt: `Send the game title you want to use. Type **cancel** to keep the current name.`,
            minLength: 1,
            maxLength: 100,
            cancelWords: [`cancel`],
        });
        state.gameName = newName;
        await interaction.webhook.editMessage(state.previewMessageId, {
            content: `Preview how your game will appear once created.`,
            embeds: [BuildGamePreviewEmbed(state)],
        });
    } finally {
        state.awaitingName = false;
        await interaction.webhook.editMessage(state.controlsMessageId, {
            content: BuildControlsContent(state),
            components: BuildControlRows(state),
        });
        const finalBucket = interaction.executionContext.shared.objectGameCreate ?? {};
        finalBucket.state = state;
        finalBucket.previewMessageId = state.previewMessageId;
        finalBucket.controlsMessageId = state.controlsMessageId;
        interaction.executionContext.shared.objectGameCreate = finalBucket;
    }
}
