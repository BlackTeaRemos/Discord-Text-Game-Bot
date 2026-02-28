import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ExecuteCreateGame } from './Game.js';
import { ExecuteCreateObject } from './Object.js';
import { AutocompleteTemplateName } from '../Common/AutocompleteTemplateName.js';
import { AutocompleteOrganization } from '../Common/AutocompleteOrganization.js';
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
            .setName(`object`)
            .setDescription(Translate(`commands.create.subcommands.object.description`))
            .addStringOption(option => {
                return option
                    .setName(`template`)
                    .setDescription(Translate(`commands.create.options.object.template`))
                    .setAutocomplete(true)
                    .setRequired(true);
            })
            .addStringOption(option => {
                return option
                    .setName(`organization`)
                    .setDescription(Translate(`commands.create.options.object.organization`))
                    .setAutocomplete(true)
                    .setRequired(false);
            })
            .addStringOption(option => {
                return option
                    .setName(`name`)
                    .setDescription(Translate(`commands.create.options.object.name`))
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
        case `object`:
            await ExecuteCreateObject(interaction);
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

/**
 * Handle autocomplete interactions for /create subcommands
 * Routes template name and organization completion for the object subcommand
 *
 * @param interaction AutocompleteInteraction Discord autocomplete interaction
 * @returns Promise<void>
 */
export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === `template`) {
        await AutocompleteTemplateName(interaction);
    } else if (focusedOption.name === `organization`) {
        await AutocompleteOrganization(interaction);
    } else {
        await interaction.respond([]);
    }
}
