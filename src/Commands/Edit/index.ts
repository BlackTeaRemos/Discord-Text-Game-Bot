import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ExecuteEditDescription } from './Description.js';
import { AutocompleteObjectName } from '../Common/AutocompleteObjectName.js';
import { AutocompleteOrganization } from '../Common/AutocompleteOrganization.js';
import { Translate, TranslateFromContext, BuildLocalizations } from '../../Services/I18nService.js';

export const data = new SlashCommandBuilder()
    .setName(`edit`)
    .setDescription(Translate(`commands.edit.description`))
    .setDescriptionLocalizations(BuildLocalizations(`commands.edit.description`))
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`description`)
            .setDescription(Translate(`commands.edit.subcommands.description.description`))
            .addStringOption(option => {
                return option
                    .setName(`object`)
                    .setDescription(Translate(`commands.edit.options.description.object`))
                    .setAutocomplete(true)
                    .setRequired(true);
            })
            .addStringOption(option => {
                return option
                    .setName(`organization`)
                    .setDescription(Translate(`commands.edit.options.description.organization`))
                    .setAutocomplete(true)
                    .setRequired(false);
            });
    });

export const permissionTokens: TokenSegmentInput[][] = [[`edit`]];

/**
 * Route /edit subcommands to respective handlers
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when handler completes
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case `description`:
            await ExecuteEditDescription(interaction);
            break;
        default:
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.edit.errors.unknownSubcommand`, {
                    params: { subcommand },
                }),
                flags: MessageFlags.Ephemeral,
            });
    }
}

/**
 * Handle autocomplete interactions for /edit subcommands
 * Routes object name completion for the description object option
 *
 * @param interaction AutocompleteInteraction Discord autocomplete interaction
 * @returns Promise<void>
 */
export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === `object`) {
        await AutocompleteObjectName(interaction, `object`);
    } else if (focusedOption.name === `organization`) {
        await AutocompleteOrganization(interaction);
    } else {
        await interaction.respond([]);
    }
}
