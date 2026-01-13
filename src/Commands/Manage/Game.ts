import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import type { ChatInputCommandInteraction, ButtonInteraction, ModalSubmitInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import { GetGameCurrentTurn, UpdateGameTurn } from '../../Flow/Object/Game/Turn.js';
import { flowManager } from '../../Common/Flow/Manager.js';
import { log } from '../../Common/Log.js';

const MANAGE_GAME_NEXT_TURN_ID = `manage_game_next_turn`;
const MANAGE_GAME_SET_TURN_ID = `manage_game_set_turn`;
const MANAGE_GAME_SET_TURN_MODAL_ID = `manage_game_set_turn_modal`;
const MANAGE_GAME_TURN_INPUT_ID = `manage_game_turn_input`;

/**
 * Flow state for game management
 */
interface ManageGameState {
    gameUid: string; // tracked game identifier
    gameName: string; // game display name
    currentTurn: number; // current turn value
    baseInteraction: ChatInputCommandInteraction; // original interaction
}

/**
 * Show game management buttons: Set Turn, Next Turn
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when flow completes
 */
export async function ExecuteManageGame(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const serverId = interaction.guildId;
    if (!serverId) {
        await interaction.reply({
            content: `This command must be used in a server`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const games = await ListGamesForServer(serverId);
        const game = games[0];
        if (!game) {
            await interaction.editReply({
                content: `No game exists in this server. Create one first with \`/create game\``,
            });
            return;
        }

        const currentTurn = await GetGameCurrentTurn(game.uid);
        const initialState: ManageGameState = {
            gameUid: game.uid,
            gameName: game.name,
            currentTurn,
            baseInteraction: interaction as unknown as ChatInputCommandInteraction,
        };

        await flowManager
            .builder(interaction.user.id, interaction, initialState)
            .step([MANAGE_GAME_NEXT_TURN_ID, MANAGE_GAME_SET_TURN_ID, MANAGE_GAME_SET_TURN_MODAL_ID], `manage_game`)
            .prompt(async ctx => {
                await __RenderManageGameUi(ctx.state);
            })
            .onInteraction(async (ctx, incomingInteraction) => {
                if (incomingInteraction.isButton()) {
                    return await __HandleButton(ctx.state, incomingInteraction as ButtonInteraction);
                }
                if (incomingInteraction.isModalSubmit()) {
                    return await __HandleModal(ctx.state, incomingInteraction as ModalSubmitInteraction);
                }
                return false;
            })
            .next()
            .start();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to manage game`, message, `ManageGame`);
        await interaction.editReply({
            content: `Failed to manage game: ${message}`,
        });
    }
}

/**
 * Render the game management embed with buttons
 * @param state ManageGameState Current flow state
 * @returns Promise<void> Resolves when reply is updated
 */
async function __RenderManageGameUi(state: ManageGameState): Promise<void> {
    const embed = new EmbedBuilder()
        .setTitle(`Game Management`)
        .setDescription(`**${state.gameName}**\n\nCurrent Turn: **${state.currentTurn}**`)
        .setColor(`Blue`);

    const nextTurnButton = new ButtonBuilder()
        .setCustomId(MANAGE_GAME_NEXT_TURN_ID)
        .setLabel(`Next Turn`)
        .setStyle(ButtonStyle.Primary);

    const setTurnButton = new ButtonBuilder()
        .setCustomId(MANAGE_GAME_SET_TURN_ID)
        .setLabel(`Set Turn`)
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(nextTurnButton, setTurnButton);

    await state.baseInteraction.editReply({
        embeds: [embed],
        components: [row],
    });
}

/**
 * Handle button interactions for game management
 * @param state ManageGameState Current flow state
 * @param interaction ButtonInteraction Button click interaction
 * @returns Promise<boolean> False to stay in flow
 */
async function __HandleButton(state: ManageGameState, interaction: ButtonInteraction): Promise<boolean> {
    if (interaction.customId === MANAGE_GAME_NEXT_TURN_ID) {
        state.currentTurn = state.currentTurn + 1;
        await UpdateGameTurn(state.gameUid, state.currentTurn);
        await interaction.deferUpdate();
        await __RenderManageGameUi(state);
        return false;
    }

    if (interaction.customId === MANAGE_GAME_SET_TURN_ID) {
        const modal = new ModalBuilder()
            .setCustomId(MANAGE_GAME_SET_TURN_MODAL_ID)
            .setTitle(`Set Turn Number`)
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId(MANAGE_GAME_TURN_INPUT_ID)
                        .setLabel(`Turn Number`)
                        .setStyle(TextInputStyle.Short)
                        .setValue(state.currentTurn.toString())
                        .setRequired(true),
                ),
            );
        await interaction.showModal(modal);
        return false;
    }

    return false;
}

/**
 * Handle modal submissions for setting turn number
 * @param state ManageGameState Current flow state
 * @param interaction ModalSubmitInteraction Modal submit interaction
 * @returns Promise<boolean> False to stay in flow
 */
async function __HandleModal(state: ManageGameState, interaction: ModalSubmitInteraction): Promise<boolean> {
    if (interaction.customId !== MANAGE_GAME_SET_TURN_MODAL_ID) {
        return false;
    }

    const turnInput = interaction.fields.getTextInputValue(MANAGE_GAME_TURN_INPUT_ID);
    const newTurn = parseInt(turnInput, 10);

    if (isNaN(newTurn) || newTurn < 1) {
        await interaction.reply({
            content: `Invalid turn number. Must be a positive integer`,
            flags: MessageFlags.Ephemeral,
        });
        return false;
    }

    state.currentTurn = newTurn;
    await UpdateGameTurn(state.gameUid, state.currentTurn);
    await interaction.deferUpdate();
    await __RenderManageGameUi(state);
    return false;
}
