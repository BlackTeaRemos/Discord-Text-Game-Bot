import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ExecuteManageGame } from './Game.js';
import { Translate, TranslateFromContext, BuildLocalizations } from '../../Services/I18nService.js';

export const data = new SlashCommandBuilder()
    .setName(`manage`)
    .setDescription(Translate(`commands.manage.description`))
    .setDescriptionLocalizations(BuildLocalizations(`commands.manage.description`))
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`game`)
            .setDescription(Translate(`commands.manage.subcommands.game.description`))
            .setDescriptionLocalizations(BuildLocalizations(`commands.manage.subcommands.game.description`));
    });

export const permissionTokens: TokenSegmentInput[][] = [[`manage`]];

/**
 * Route /manage subcommands to respective handlers
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when handler completes
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case `game`:
            await ExecuteManageGame(interaction);
            break;
        default:
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.manage.errors.unknownSubcommand`, {
                    params: { subcommand },
                }),
                flags: MessageFlags.Ephemeral,
            });
    }
}
