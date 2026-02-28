import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ExecuteImportTemplate } from './Template.js';
import { Translate, TranslateFromContext, BuildLocalizations } from '../../Services/I18nService.js';

export const data = new SlashCommandBuilder()
    .setName(`import`)
    .setDescription(Translate(`commands.import.description`))
    .setDescriptionLocalizations(BuildLocalizations(`commands.import.description`))
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`template`)
            .setDescription(Translate(`commands.import.subcommands.template.description`))
            .addAttachmentOption(option => {
                return option
                    .setName(`file`)
                    .setDescription(Translate(`commands.import.options.template.file`))
                    .setRequired(true);
            });
    });

export const permissionTokens: TokenSegmentInput[][] = [[`import`]];

/**
 * Route /import subcommands to respective handlers
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when handler completes
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case `template`:
            await ExecuteImportTemplate(interaction);
            break;
        default:
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.import.errors.unknownSubcommand`, {
                    params: { subcommand },
                }),
                flags: MessageFlags.Ephemeral,
            });
    }
}
