import {
    SlashCommandSubcommandBuilder,
    ChatInputCommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalSubmitInteraction,
} from 'discord.js';
import { flowManager } from '../../../Common/Flow/Manager.js';
import { executeWithContext } from '../../../Common/ExecutionContextHelpers.js';
import { GetGameForServer, UpdateGameTurn } from '../../../Flow/Object/Game/Turn.js';
import { log } from '../../../Common/Log.js';

interface State {
    gameUid?: string;
    currentTurn?: number;
}

export const data = new SlashCommandSubcommandBuilder()
    .setName(`turn`)
    .setDescription(`Manage current turn for a game`);

export const permissionTokens: any[] = [[`object`, `game`, `turn`]];

export async function execute(interaction: ChatInputCommandInteraction) {
    await executeWithContext(interaction, async(flowManager, executionContext) => {
        await flowManager
            .builder(interaction.user.id, interaction, {} as State, executionContext)
            .step(`manage_turn`)
            .prompt(async(ctx: any) => {
                const game = await GetGameForServer(executionContext.guildId);
                if (!game) {
                    if (!interaction.deferred && !interaction.replied) {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    }
                    await interaction.editReply({ content: `No game found in this server.`, components: [] });
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
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(decrementBtn, incrementBtn, setBtn);
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                }
                await interaction.editReply({
                    embeds: [embed],
                    components: [row],
                });
            })
            .onInteraction(async(ctx: any, interaction: any) => {
                if (interaction.isButton()) {
                    const customId = interaction.customId;
                    if (customId === `decrement_turn`) {
                        ctx.state.currentTurn = Math.max(1, (ctx.state.currentTurn || 1) - 1);
                        await UpdateGameTurn(ctx.state.gameUid, ctx.state.currentTurn);
                        await interaction.deferUpdate();
                        return false; // Re-prompt
                    } else if (customId === `increment_turn`) {
                        ctx.state.currentTurn = (ctx.state.currentTurn || 1) + 1;
                        await UpdateGameTurn(ctx.state.gameUid, ctx.state.currentTurn);
                        await interaction.deferUpdate();
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
                        await interaction.showModal(modal);
                        return false;
                    }
                } else if (interaction.isModalSubmit() && interaction.customId === `set_turn_modal`) {
                    const turnStr = interaction.fields.getTextInputValue(`turn_number`);
                    const newTurn = parseInt(turnStr, 10);
                    if (isNaN(newTurn) || newTurn < 1) {
                        await interaction.reply({
                            content: `Invalid turn number. Must be a positive integer.`,
                            flags: MessageFlags.Ephemeral,
                        });
                        return false;
                    }
                    ctx.state.currentTurn = newTurn;
                    await UpdateGameTurn(ctx.state.gameUid, ctx.state.currentTurn);
                    await interaction.deferUpdate();
                    return false; // Re-prompt
                }
                return false;
            })
            .next()
            .start();
    });
}
