import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Colors,
    EmbedBuilder,
    MessageFlags,
    SlashCommandSubcommandBuilder,
    StringSelectMenuBuilder,
} from 'discord.js';
import type { FlowManager } from '../../../Common/Flow/Manager.js';
import { flowManager as sharedFlowManager } from '../../../Common/Flow/Manager.js';
import { StartGameCreateFlow, createGameCreateState } from '../../../Flow/Object/Game/Create.js';
import type { GameCreateFlowState } from '../../../Flow/Object/Game/CreateState.js';
import { GameCreateFlowConstants } from '../../../Flow/Object/Game/CreateState.js';
import type { GameCreateRenderers, GameCreateStepContext } from '../../../Flow/Object/Game/CreateTypes.js';
import { recallBaseInteraction } from '../../../Flow/Object/Game/CreateTypes.js';
import { log } from '../../../Common/Log.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`create`)
    .setDescription(`Start interactive game creation flow`)
    .addStringOption(option => {
        return option
            .setName(`name`)
            .setDescription(`Optional default game name to prefill in the editor`)
            .setMaxLength(100)
            .setRequired(false);
    });

export const permissionTokens = `object:game:create`;

/**
 * Launch the interactive game creation UI that renders preview and control buttons.
 * @param interaction ChatInputCommandInteraction Slash subcommand interaction from Discord. @example await execute(interaction)
 * @returns Promise<void> Resolves after the flow is scheduled. @example await execute(interaction)
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const serverId = interaction.guildId;
    if (!serverId) {
        await interaction.reply({ content: `This command must be used in a server.`, flags: MessageFlags.Ephemeral });
        return;
    }
    const defaultName = interaction.options.getString(`name`) ?? undefined;
    const state = createGameCreateState({ serverId, defaultName });
    const fm = sharedFlowManager as FlowManager;
    const builder = fm.builder<GameCreateFlowState>(interaction.user.id, interaction, state);
    const configured = StartGameCreateFlow({
        builder,
        memorySeed: {
            interaction,
            renderers: gameCreateRenderers,
        },
        serverId,
        defaultName,
    });
    await configured.start();
}

/**
 * Build the embed showing the live preview of the game being configured.
 * @param state GameCreateFlowState Current mutable flow state. @example buildGamePreviewEmbed(state)
 * @returns EmbedBuilder Configured embed for the preview message. @example const embed = buildGamePreviewEmbed(state)
 */
function buildGamePreviewEmbed(state: GameCreateFlowState): EmbedBuilder {
    const organization = state.organizationName ?? `Select an organization`;
    const gameName = state.gameName?.trim() ? state.gameName.trim() : `Unnamed game`;
    const description = state.description?.trim() ? state.description.trim() : `No description provided yet.`;
    const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setAuthor({ name: organization })
        .setTitle(gameName)
        .setDescription(description)
        .setFooter({ text: `Server ${state.serverId}` })
        .setImage(state.imageUrl || GameCreateFlowConstants.defaultImageUrl);
    if (!state.organizationUid) {
        embed.setTimestamp(new Date());
    }
    return embed;
}

/**
 * Provide instructional text for the control panel message based on current state.
 * @param state GameCreateFlowState Mutable flow state. @example buildControlsContent(state)
 * @returns string Multiline guidance text. @example const text = buildControlsContent(state)
 */
function buildControlsContent(state: GameCreateFlowState): string {
    const segments: string[] = [`Adjust the game details using the buttons below before creating it.`];
    if (state.awaitingName) {
        segments.push(`Waiting for a message containing the new name.`);
    }
    if (state.awaitingDescription) {
        segments.push(`Waiting for a message containing the description text.`);
    }
    if (state.awaitingImage) {
        segments.push(`Waiting for an image attachment or direct image URL.`);
    }
    if (state.uploadInProgress) {
        segments.push(`Uploading the latest image; controls are temporarily paused.`);
    }
    return segments.join(`\n`);
}

/**
 * Create the action rows representing the control buttons for the flow.
 * @param state GameCreateFlowState Mutable flow state. @example buildControlRows(state)
 * @returns ActionRowBuilder<ButtonBuilder>[] Button rows representing UI controls.
 */
function buildControlRows(state: GameCreateFlowState): ActionRowBuilder<ButtonBuilder>[] {
    const primaryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.changeNameId)
            .setLabel(`Change name`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(Boolean(state.awaitingName) || state.uploadInProgress === true),
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.changeDescriptionId)
            .setLabel(`Change description`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(Boolean(state.awaitingDescription) || state.uploadInProgress === true),
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.changeImageId)
            .setLabel(`Change image`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(Boolean(state.awaitingImage) || state.uploadInProgress === true),
    );

    const secondaryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.confirmCreateId)
            .setLabel(`Create game`)
            .setStyle(ButtonStyle.Success)
            .setDisabled(!state.gameName?.trim() || state.uploadInProgress === true),
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.cancelCreateId)
            .setLabel(`Cancel`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(state.uploadInProgress === true),
    );

    return [primaryRow, secondaryRow];
}

/**
 * Render or update the preview embed message.
 * @param ctx GameCreateStepContext Flow execution context. @example await renderPreview(ctx)
 * @returns Promise<void> Resolves after the preview is shown. @example await renderPreview(ctx)
 */
async function renderPreview(ctx: GameCreateStepContext): Promise<void> {
    const base = recallBaseInteraction(ctx);
    if (!base) {
        return;
    }
    const embed = buildGamePreviewEmbed(ctx.state);
    const payload = {
        content: `Preview of the game as it will appear after creation.`,
        embeds: [embed],
    };
    try {
        if (!ctx.state.previewMessageId) {
            const message = await base.editReply(payload);
            ctx.state.previewMessageId = message.id;
        } else {
            await base.webhook.editMessage(ctx.state.previewMessageId, payload);
        }
    } catch (error) {
        log.error(
            `Failed to render game preview: ${String(error)}`,
            GameCreateFlowConstants.logSource,
            `renderPreview`,
        );
    }
}

/**
 * Render or update the control panel message with optional custom components.
 * @param ctx GameCreateStepContext Flow state context. @example await renderControls(ctx, 'Ready')
 * @param content string Descriptive content placed above the buttons. @example await renderControls(ctx, 'Waiting')
 * @param components ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] Optional component override list. @example await renderControls(ctx, 'Ready', customRows)
 * @returns Promise<void> Resolves once the control message is sent. @example await renderControls(ctx, 'Ready')
 */
async function renderControls(
    ctx: GameCreateStepContext,
    content: string,
    components?: Array<ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>>,
): Promise<void> {
    const base = recallBaseInteraction(ctx);
    if (!base) {
        return;
    }
    const rows =
        components ?? (buildControlRows(ctx.state) as Array<ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>>);
    const payload = {
        content,
        components: rows,
    };
    try {
        if (!ctx.state.controlsMessageId) {
            const message = await base.followUp({ ...payload, flags: MessageFlags.Ephemeral });
            ctx.state.controlsMessageId = message.id;
        } else {
            await base.webhook.editMessage(ctx.state.controlsMessageId, payload);
        }
    } catch (error) {
        log.error(`Failed to render controls: ${String(error)}`, GameCreateFlowConstants.logSource, `renderControls`);
    }
}

const gameCreateRenderers: GameCreateRenderers = {
    buildControlsContent,
    renderPreview,
    renderControls,
};
