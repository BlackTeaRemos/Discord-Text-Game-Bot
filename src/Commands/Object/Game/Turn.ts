import {
    SlashCommandSubcommandBuilder,
    ChatInputCommandInteraction,
    ButtonInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import { flowManager } from '../../../Common/Flow/Manager.js';
import { GetGameCurrentTurn, UpdateGameTurn } from '../../../Flow/Object/Game/Turn.js';
import { log } from '../../../Common/Log.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import type { TokenSegmentInput } from '../../../Common/Permission/index.js';
import { GetGame } from '../../../Flow/Object/Game/View.js';
import { ListGamesForServer } from '../../../Flow/Object/Game/ListGamesForServer.js';

/**
 * Track turn management session state.
 */
interface State {
    gameUid?: string; // tracked game identifier
    currentTurn?: number; // active turn counter
    gameName?: string; // friendly game name
}

export const data = new SlashCommandSubcommandBuilder()
    .setName(`turn`)
    .setDescription(`Manage current turn for a game`);

export const permissionTokens: TokenSegmentInput[][] = [[`object`, `game`, `turn`]];

/**
 * Provide interactive controls for adjusting the tracked game turn.
 * @param commandInteraction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction carrying execution context. @example await ExecuteObjectGameTurn(commandInteraction)
 * @returns Promise<void> Resolves once the flow completes or errors are reported. @example await ExecuteObjectGameTurn(commandInteraction)
 */
export async function ExecuteObjectGameTurn(
    commandInteraction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    await StartGameTurnFlow(commandInteraction);
}

/**
 * Launch the game turn management flow, supporting slash commands and UI button invocations.
 * @param baseInteraction InteractionExecutionContextCarrier interaction source (command or button).
 */
export async function StartGameTurnFlow(
    baseInteraction: ChatInputCommandInteraction | ButtonInteraction,
): Promise<void> {
    try {
        const serverId = baseInteraction.guildId; // Discord guild hosting the game
        if (!serverId) {
            throw new Error(`This command must be used in a server.`);
        }

        const games = await ListGamesForServer(serverId);
        const game = games[0];
        if (!game) {
            if (!baseInteraction.deferred && !baseInteraction.replied) {
                await baseInteraction.deferReply({ flags: MessageFlags.Ephemeral });
            }
            await baseInteraction.editReply({ content: `No game found in this server. Create one first.`, components: [] });
            return;
        }

        /**
         * Render the current turn management UI.
         * @param state State Flow state holding game and turn data. @example state.currentTurn
         * @returns Promise<void> Resolves once the reply is updated. @example await __RenderTurnUi(state)
         */
        const __RenderTurnUi = async(state: State): Promise<void> => {
            const embed = new EmbedBuilder()
                .setTitle(`Game Turn Management`)
                .setDescription(
                    `${state.gameName ? `Game: **${state.gameName}**\n` : ``}Current turn: **${state.currentTurn ?? 1}**`,
                )
                .setColor(`Blue`);
            const incrementBtn = new ButtonBuilder()
                .setCustomId(`increment_turn`)
                .setLabel(`Next turn`)
                .setStyle(ButtonStyle.Secondary);
            const setBtn = new ButtonBuilder()
                .setCustomId(`set_turn`)
                .setLabel(`Set specific turn`)
                .setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(incrementBtn, setBtn); // action row containing control buttons
            await baseInteraction.editReply({ embeds: [embed], components: [row] });
        };

        await flowManager
            .builder(baseInteraction.user.id, baseInteraction, { gameUid: game.uid, gameName: game.name } as State)
            .step([`increment_turn`, `set_turn`, `set_turn_modal`], `manage_turn`)
            .prompt(async (ctx: any) => {
                if (!ctx.state.gameUid) {
                    await ctx.cancel();
                    return;
                }
                ctx.state.currentTurn = await GetGameCurrentTurn(ctx.state.gameUid);
                if (!baseInteraction.deferred && !baseInteraction.replied) {
                    await baseInteraction.deferReply({ flags: MessageFlags.Ephemeral });
                }
                await __RenderTurnUi(ctx.state as State);
            })
            .onInteraction(async (ctx: any, incomingInteraction: any) => {
                if (incomingInteraction.isButton()) {
                    const customId = incomingInteraction.customId; // interaction identifier
                    if (customId === `increment_turn`) {
                        if (!ctx.state.gameUid) {
                            await incomingInteraction.reply({
                                content: `Game context is missing. Restart the flow.`,
                                flags: MessageFlags.Ephemeral,
                            });
                            return false;
                        }
                        ctx.state.currentTurn = (ctx.state.currentTurn || 1) + 1;
                        await UpdateGameTurn(ctx.state.gameUid, ctx.state.currentTurn);
                        await incomingInteraction.deferUpdate();
                        ctx.state.currentTurn = await GetGameCurrentTurn(ctx.state.gameUid);
                        await __RenderTurnUi(ctx.state as State);
                        return false; // Re-prompt
                    } else if (customId === `set_turn`) {
                        const modal = new ModalBuilder()
                            .setCustomId(`set_turn_modal`)
                            .setTitle(`Set Turn Number`)
                            .addComponents(
                                new ActionRowBuilder<TextInputBuilder>().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId(`turn_number`)
                                        .setLabel(`Turn Number`)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(ctx.state.currentTurn.toString())
                                        .setRequired(true),
                                ),
                            );
                        await incomingInteraction.showModal(modal);
                        return false;
                    }
                } else if (incomingInteraction.isModalSubmit() && incomingInteraction.customId === `set_turn_modal`) {
                    if (!ctx.state.gameUid) {
                        await incomingInteraction.reply({
                            content: `Game context is missing. Restart the flow.`,
                            flags: MessageFlags.Ephemeral,
                        });
                        return false;
                    }
                    const turnStr = incomingInteraction.fields.getTextInputValue(`turn_number`); // raw turn input
                    const newTurn = parseInt(turnStr, 10); // parsed turn value
                    if (isNaN(newTurn) || newTurn < 1) {
                        await incomingInteraction.reply({
                            content: `Invalid turn number. Must be a positive integer.`,
                            flags: MessageFlags.Ephemeral,
                        });
                        return false;
                    }
                    ctx.state.currentTurn = newTurn;
                    await UpdateGameTurn(ctx.state.gameUid, ctx.state.currentTurn);
                    await incomingInteraction.deferUpdate();
                    ctx.state.currentTurn = await GetGameCurrentTurn(ctx.state.gameUid);
                    await __RenderTurnUi(ctx.state as State);
                    return false; // Re-prompt
                }
                return false;
            })
            .next()
            .start();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error); // normalized error message
        log.error(`Failed to execute object game turn`, message, `ObjectGameTurnCommand`);
        const response = {
            content: `Unable to manage game turn: ${message}`,
            flags: MessageFlags.Ephemeral,
        } as const; // error response payload
        try {
            if (baseInteraction.replied || baseInteraction.deferred) {
                await baseInteraction.followUp(response);
            } else {
                await baseInteraction.reply(response);
            }
        } catch {
            // ignore secondary discord failures
        }
        throw error instanceof Error ? error : new Error(message);
    }
}

export const execute = ExecuteObjectGameTurn;
