import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ExecuteViewGame } from './Game.js';
import { ExecuteViewTask } from './Task.js';
import { ExecuteViewObject } from './Object.js';
import { Translate, TranslateFromContext } from '../../Services/I18nService.js';

export const data = new SlashCommandBuilder()
    .setName(`view`)
    .setDescription(Translate(`commands.view.description`))
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`game`)
            .setDescription(Translate(`commands.view.subcommands.game.description`))
            .addStringOption(option => {
                return option
                    .setName(`organization`)
                    .setDescription(Translate(`commands.view.options.organization`))
                    .setRequired(false);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`task`)
            .setDescription(Translate(`commands.view.subcommands.task.description`))
            .addStringOption(option => {
                return option
                    .setName(`id`)
                    .setDescription(Translate(`commands.view.options.task.id`))
                    .setRequired(false);
            })
            .addIntegerOption(option => {
                return option
                    .setName(`turn`)
                    .setDescription(Translate(`commands.view.options.task.turn`))
                    .setRequired(false);
            })
            .addUserOption(option => {
                return option
                    .setName(`creator`)
                    .setDescription(Translate(`commands.view.options.task.creator`))
                    .setRequired(false);
            })
            .addStringOption(option => {
                return option
                    .setName(`organization`)
                    .setDescription(Translate(`commands.view.options.organization`))
                    .setRequired(false);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`object`)
            .setDescription(Translate(`commands.view.subcommands.object.description`))
            .addStringOption(option => {
                return option
                    .setName(`id`)
                    .setDescription(Translate(`commands.view.options.object.id`))
                    .setRequired(true);
            })
            .addStringOption(option => {
                return option
                    .setName(`organization`)
                    .setDescription(Translate(`commands.view.options.organization`))
                    .setRequired(false);
            });
    });

export const permissionTokens: TokenSegmentInput[][] = [[`view`]];

/**
 * Route /view subcommands to respective handlers
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when handler completes
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case `game`:
            await ExecuteViewGame(interaction);
            break;
        case `task`:
            await ExecuteViewTask(interaction);
            break;
        case `object`:
            await ExecuteViewObject(interaction);
            break;
        default:
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.view.errors.unknownSubcommand`, {
                    params: { subcommand },
                }),
                flags: MessageFlags.Ephemeral,
            });
    }
}
