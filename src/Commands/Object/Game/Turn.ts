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
import { GetGameForServer, UpdateGameTurn } from '../../../Flow/Object/Game/Turn.js';
import { log } from '../../../Common/Log.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import type { TokenSegmentInput } from '../../../Common/Permission/index.js';

/**
 * Track turn management session state.
 */
interface State {
    gameUid?: string; // tracked game identifier
    currentTurn?: number; // active turn counter
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

        await flowManager
            .builder(baseInteraction.user.id, baseInteraction, {} as State)
            .step(`manage_turn`)
            .prompt(async (ctx: any) => {
                const game = await GetGameForServer(serverId); // latest game data for server
                if (!game) {
                    if (!baseInteraction.deferred && !baseInteraction.replied) {
                        await baseInteraction.deferReply({ flags: MessageFlags.Ephemeral });
                    }
                    await baseInteraction.editReply({ content: `No game found in this server.`, components: [] });
                    return;
                }
                ctx.state.gameUid = game.uid;
                ctx.state.currentTurn = game.parameters.currentTurn || 1;
                const embed = new EmbedBuilder()
                    .setTitle(`Game Turn Management`)
                    .setDescription(`Current turn: **${ctx.state.currentTurn}**`)
                    .setColor(`Blue`);
                const decrementBtn = new ButtonBuilder()
                    .setCustomId(`decrement_turn`)
                    .setLabel(`-1`)
                    .setStyle(ButtonStyle.Secondary);
                const incrementBtn = new ButtonBuilder()
                    .setCustomId(`increment_turn`)
                    .setLabel(`+1`)
                    .setStyle(ButtonStyle.Secondary);
                const setBtn = new ButtonBuilder()
                    .setCustomId(`set_turn`)
                    .setLabel(`Set Turn`)
                    .setStyle(ButtonStyle.Primary);
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(decrementBtn, incrementBtn, setBtn); // action row containing control buttons
                if (!baseInteraction.deferred && !baseInteraction.replied) {
                    await baseInteraction.deferReply({ flags: MessageFlags.Ephemeral });
                }
                await baseInteraction.editReply({
                    embeds: [embed],
                    components: [row],
                });
            })
            .onInteraction(async (ctx: any, incomingInteraction: any) => {
                if (incomingInteraction.isButton()) {
                    const customId = incomingInteraction.customId; // interaction identifier
                    if (customId === `decrement_turn`) {
                        ctx.state.currentTurn = Math.max(1, (ctx.state.currentTurn || 1) - 1);
                        await UpdateGameTurn(ctx.state.gameUid, ctx.state.currentTurn);
                        await incomingInteraction.deferUpdate();
                        return false; // Re-prompt
                    } else if (customId === `increment_turn`) {
                        ctx.state.currentTurn = (ctx.state.currentTurn || 1) + 1;
                        await UpdateGameTurn(ctx.state.gameUid, ctx.state.currentTurn);
                        await incomingInteraction.deferUpdate();
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
