import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ExecuteCreateGame } from './Game.js';
import { ExecuteCreateDescription } from './Description.js';
import { Translate, TranslateFromContext, BuildLocalizations } from '../../Services/I18nService.js';

export const data = new SlashCommandBuilder()
    .setName(`create`)
    .setDescription(Translate(`commands.create.description`))
    .setDescriptionLocalizations(BuildLocalizations(`commands.create.description`))
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`game`)
            .setDescription(Translate(`commands.create.subcommands.game.description`))
            .setDescriptionLocalizations(BuildLocalizations(`commands.create.subcommands.game.description`))
            .addStringOption(option => {
                return option
                    .setName(`name`)
                    .setDescription(Translate(`commands.create.options.game.name`))
                    .setDescriptionLocalizations(BuildLocalizations(`commands.create.options.game.name`))
                    .setRequired(true);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`description`)
            .setDescription(Translate(`commands.create.subcommands.description.description`))
            .addStringOption(option => {
                return option
                    .setName(`id`)
                    .setDescription(Translate(`commands.create.options.description.id`))
                    .setRequired(true);
            })
            .addStringOption(option => {
                return option
                    .setName(`organization`)
                    .setDescription(Translate(`commands.create.options.description.organization`))
                    .setRequired(false);
            });
    });

export const permissionTokens: TokenSegmentInput[][] = [[`create`]];

/**
 * Route /create subcommands to respective handlers
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when handler completes
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case `game`:
            await ExecuteCreateGame(interaction);
            break;
        case `description`:
            await ExecuteCreateDescription(interaction);
            break;
        default:
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.create.errors.unknownSubcommand`, {
                    params: { subcommand },
                }),
                flags: MessageFlags.Ephemeral,
            });
    }
}
