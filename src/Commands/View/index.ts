import {
    SlashCommandBuilder,
    ActionRowBuilder,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import type { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import { buildEmbedFor, getSupportedTypes, type ObjectTypeKey } from '../../Common/Flow/ObjectRegistry.js';
import { log } from '../../Common/Log.js';
import { GetGame } from '../../Flow/Object/Game/View.js';
import { createGameUpdateState } from '../../Flow/Object/Game/Create.js';
import { RemoveGame } from '../../Flow/Object/Game/Remove.js';
import { StartGameTurnFlow } from '../Object/Game/Turn.js';
import { ResolveViewPermissions } from '../../Flow/Command/ViewFlow.js';
import { RequestPermissionFromAdmin } from '../../SubCommand/Permission/PermissionUI.js';
import { GrantForever } from '../../Common/Permission/Store.js';
import { ExtractFlowContext, ExtractFlowMember } from '../../Common/Type/FlowContext.js';
import { BuildGamePreviewEmbed } from '../../SubCommand/Object/Game/Renderers/BuildGamePreviewEmbed.js';
import { BuildControlsContent } from '../../SubCommand/Object/Game/Renderers/BuildControlsContent.js';
import { BuildControlRows } from '../../SubCommand/Object/Game/Renderers/BuildControlRows.js';
import { RegisterGameCreateSession } from '../../SubCommand/Object/Game/GameCreateControls.js';
import type { PermissionToken } from '../../Common/Permission/types.js';
import { SelectViewTarget } from './SelectViewTarget.js';
import { BuildDescriptionActionRows } from './DescriptionActionRows.js';
import { BuildParameterActionRows } from './ParameterActionRows.js';
export { HandleViewDescriptionActionInteraction } from './DescriptionActionHandler.js';
export { HandleViewParameterActionInteraction } from './ParameterActionHandler.js';

/**
 * Command definition for /view.
 * Displays object details based on type.
 */
export const data = new SlashCommandBuilder()
    .setName(`view`)
    .setDescription(`View details`)
    .addStringOption((option) => {
        return option
            .setName(`type`)
            .setDescription(`Type`)
            .setRequired(false)
            .addChoices(...getSupportedTypes().map((typeObj) => {
                return { name: typeObj.label, value: typeObj.value };
            }));
    })
    .addStringOption((option) => {
        return option.setName(`id`).setDescription(`ID`).setRequired(false);
    });

/** Permission tokens required to execute view command. */
export const permissionTokens = [`command:view`];

/** Internal state for view command flow. */
interface State {
    type: ObjectTypeKey;
    id: string;
}

/** Context for game action buttons. */
interface GameActionContext {
    interaction: ChatInputCommandInteraction;
    gameId: string;
    createdAt: number;
}

const GAME_ACTION_UPDATE_ID = `view_game_action_update`;
const GAME_ACTION_REMOVE_ID = `view_game_action_remove`;
const GAME_ACTION_MANAGE_TURN_ID = `view_game_action_turn`;
const GAME_ACTION_CONTEXT_TTL_MS = 300_000; // 5 minutes

const _gameActionContexts = new Map<string, GameActionContext>();

/**
 * Build action rows for game view.
 * @param messageId string Message identifier for button custom IDs.
 * @returns ActionRowBuilder[] Array containing game action buttons.
 */
function BuildGameActionRows(messageId: string): ActionRowBuilder<ButtonBuilder>[] {
    const updateButton = new ButtonBuilder()
        .setCustomId(`${GAME_ACTION_UPDATE_ID}:${messageId}`)
        .setLabel(`Update`)
        .setStyle(ButtonStyle.Primary);

    const removeButton = new ButtonBuilder()
        .setCustomId(`${GAME_ACTION_REMOVE_ID}:${messageId}`)
        .setLabel(`Remove`)
        .setStyle(ButtonStyle.Danger);

    const manageTurnButton = new ButtonBuilder()
        .setCustomId(`${GAME_ACTION_MANAGE_TURN_ID}:${messageId}`)
        .setLabel(`Manage Turn`)
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(updateButton, manageTurnButton, removeButton);
    return [row];
}

/**
 * Register game action context for later button handling.
 * @param messageId string Message identifier.
 * @param context GameActionContext Context data.
 */
function RegisterGameActionContext(messageId: string, context: GameActionContext): void {
    PruneExpiredGameActionContexts();
    _gameActionContexts.set(messageId, context);
}

/**
 * Remove expired game action contexts.
 */
function PruneExpiredGameActionContexts(): void {
    const now = Date.now();
    for (const [key, ctx] of _gameActionContexts.entries()) {
        if (now - ctx.createdAt > GAME_ACTION_CONTEXT_TTL_MS) {
            _gameActionContexts.delete(key);
        }
    }
}

/**
 * Update game action components to disabled state.
 * @param interaction ButtonInteraction The button interaction.
 * @param label string Label to show on disabled button.
 */
async function UpdateGameActionComponents(
    interaction: ButtonInteraction,
    label: string,
): Promise<void> {
    const disabledButton = new ButtonBuilder()
        .setCustomId(`disabled`)
        .setLabel(label)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(disabledButton);
    await interaction.message.edit({ components: [row] });
}

/**
 * Handle permission denied result.
 * @param interaction ChatInputCommandInteraction The command interaction.
 * @param tokens PermissionToken[] Denied permission tokens.
 * @param reason string | undefined Denial reason.
 * @param guildId string | undefined Guild identifier for permission grant.
 */
async function HandlePermissionDenied(
    interaction: ChatInputCommandInteraction,
    tokens: PermissionToken[],
    reason: string | undefined,
    guildId: string | undefined,
): Promise<void> {
    if (reason === `approvable`) {
        const approved = await RequestPermissionFromAdmin(interaction, { tokens, reason });
        if (approved) {
            for (const token of tokens) {
                await GrantForever(guildId ?? ``, interaction.user.id, token, interaction.user.id);
            }
            await interaction.followUp({
                content: `Permission granted. Please run the command again.`,
                flags: MessageFlags.Ephemeral,
            });
        }
        return;
    }
    const payload = {
        content: `Permission denied: ${reason ?? `unknown`}`,
        flags: MessageFlags.Ephemeral,
    } as const;

    if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
        return;
    }

    await interaction.reply(payload);
}

/**
 * Start game update flow.
 * @param interaction ButtonInteraction The button interaction.
 * @param gameId string Game identifier to update.
 * @param guildId string Guild identifier.
 */
async function StartGameUpdateFlow(
    interaction: ButtonInteraction,
    gameId: string,
    guildId: string,
): Promise<void> {
    const game = await GetGame(gameId);
    if (!game) {
        await interaction.reply({
            content: `Game not found.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const state = createGameUpdateState({
        serverId: guildId,
        ownerDiscordId: interaction.user.id,
        game,
    });
    const embed = BuildGamePreviewEmbed(state);
    const content = BuildControlsContent(state);
    const rows = BuildControlRows(state);

    const previewReply = await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
        fetchReply: true,
    });

    const controlsReply = await interaction.followUp({
        content,
        components: rows,
        flags: MessageFlags.Ephemeral,
        fetchReply: true,
    });

    await RegisterGameCreateSession({
        interaction: interaction as unknown as Parameters<typeof RegisterGameCreateSession>[0][`interaction`],
        state,
        previewMessageId: previewReply.id,
        controlsMessageId: controlsReply.id,
    });
}

/**
 * Execute the view command.
 * @param interaction ChatInputCommandInteraction The command interaction.
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const providedType = interaction.options.getString(`type`) as ObjectTypeKey | null;
    const providedId = interaction.options.getString(`id`);

    const selection = !providedType || !providedId
        ? await SelectViewTarget(interaction, {
            type: providedType ?? undefined,
            id: providedId ?? undefined,
        })
        : ({ type: providedType, id: providedId } as State);

    if (!selection) {
        return;
    }

    const guildId = interaction.guildId ?? undefined;
    const flowContext = ExtractFlowContext(interaction);
    const memberProvider = async() => {
        const member = await interaction.guild?.members.fetch(interaction.user.id);
        return member ? ExtractFlowMember(member) : null;
    };

    const permissionResult = await ResolveViewPermissions({
        context: flowContext,
        viewContext: { type: selection.type, id: selection.id },
        memberProvider,
    });

    if (!permissionResult.allowed) {
        await HandlePermissionDenied(
            interaction,
            permissionResult.tokens ?? [],
            permissionResult.reason,
            guildId,
        );
        return;
    }

    const isSelectionFlow = interaction.deferred || interaction.replied;

    if (selection.type === `game`) {
        const embed = await buildEmbedFor(
            selection.type,
            selection.id,
            interaction.user.id,
            undefined,
            (interaction as any).flowContext?.character?.organizationUid,
        );
        if (!embed) {
            if (isSelectionFlow) {
                await interaction.editReply({ content: `Game not found.`, components: [] });
            } else {
                await interaction.reply({ content: `Game not found.`, flags: MessageFlags.Ephemeral });
            }
            return;
        }

        if (isSelectionFlow) {
            await interaction.editReply({ content: `Opening game view...`, components: [] });
            const reply = await interaction.followUp({ embeds: [embed], fetchReply: true });
            const actionRows = [
                ...BuildDescriptionActionRows(selection.type, selection.id),
                ...BuildParameterActionRows(selection.type, selection.id),
                ...BuildGameActionRows((reply as any).id),
            ];
            await (reply as any).edit({ components: actionRows });

            RegisterGameActionContext((reply as any).id, {
                interaction,
                gameId: selection.id,
                createdAt: Date.now(),
            });
            return;
        }

        const reply = await interaction.reply({ embeds: [embed], fetchReply: true });
        const actionRows = [
            ...BuildDescriptionActionRows(selection.type, selection.id),
            ...BuildParameterActionRows(selection.type, selection.id),
            ...BuildGameActionRows((reply as any).id),
        ];
        await interaction.editReply({ components: actionRows });

        RegisterGameActionContext((reply as any).id, {
            interaction,
            gameId: selection.id,
            createdAt: Date.now(),
        });
        return;
    }

    const embed = await buildEmbedFor(
        selection.type,
        selection.id,
        interaction.user.id,
        undefined,
        (interaction as any).flowContext?.character?.organizationUid,
    );
    if (!embed) {
        const message = `${selection.type} not found.`;
        if (isSelectionFlow) {
            await interaction.editReply({ content: message, components: [] });
        } else {
            await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
        }
        return;
    }

    if (isSelectionFlow) {
        await interaction.editReply({ content: `Opening view...`, components: [] });
        await interaction.followUp({
            embeds: [embed],
            components: [...BuildDescriptionActionRows(selection.type, selection.id), ...BuildParameterActionRows(selection.type, selection.id)],
        });
        return;
    }

    await interaction.reply({
        embeds: [embed],
        components: [...BuildDescriptionActionRows(selection.type, selection.id), ...BuildParameterActionRows(selection.type, selection.id)],
    });
}

/**
 * Handle game action button interactions.
 * @param interaction ButtonInteraction The button interaction.
 * @returns Promise<boolean> True if the interaction was handled.
 */
export async function HandleViewGameActionInteraction(interaction: ButtonInteraction): Promise<boolean> {
    const customId = interaction.customId;

    if (
        !customId.startsWith(GAME_ACTION_UPDATE_ID) &&
        !customId.startsWith(GAME_ACTION_REMOVE_ID) &&
        !customId.startsWith(GAME_ACTION_MANAGE_TURN_ID)
    ) {
        return false;
    }

    const parts = customId.split(`:`);
    if (parts.length < 2) {
        return false;
    }

    const messageId = parts[1];
    const context = _gameActionContexts.get(messageId);

    if (!context) {
        await interaction.reply({
            content: `This action has expired. Please run /view again.`,
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    if (interaction.user.id !== context.interaction.user.id) {
        await interaction.reply({
            content: `You cannot perform this action.`,
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    const guildId = interaction.guildId ?? ``;

    try {
        if (customId.startsWith(GAME_ACTION_UPDATE_ID)) {
            await UpdateGameActionComponents(interaction, `Updating...`);
            await StartGameUpdateFlow(interaction, context.gameId, guildId);
            _gameActionContexts.delete(messageId);
            return true;
        }

        if (customId.startsWith(GAME_ACTION_MANAGE_TURN_ID)) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await StartGameTurnFlow(interaction);
            return true;
        }

        if (customId.startsWith(GAME_ACTION_REMOVE_ID)) {
            await UpdateGameActionComponents(interaction, `Removing...`);
            const removed = await RemoveGame(context.gameId);

            if (removed) {
                await interaction.followUp({
                    content: `Game removed successfully.`,
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.followUp({
                    content: `Failed to remove game.`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            _gameActionContexts.delete(messageId);
            return true;
        }
    } catch(error) {
        log.error(`Error handling game action:`, String(error));
        await interaction.followUp({
            content: `An error occurred while processing your request.`,
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    return false;
}
