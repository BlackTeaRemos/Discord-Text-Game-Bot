import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ExecuteManageGame } from './Game.js';
import { ExecuteManageTemplate } from './Template.js';
import { ExecuteManageObject } from './Object.js';
import { AutocompleteTemplateName } from '../Common/AutocompleteTemplateName.js';
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
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`template`)
            .setDescription(`Upload a JSON template to define a game object type`)
            .addAttachmentOption(option => {
                return option
                    .setName(`file`)
                    .setDescription(`JSON template file to upload`)
                    .setRequired(true);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`object`)
            .setDescription(`Create a game object instance from a template`)
            .addStringOption(option => {
                return option
                    .setName(`template`)
                    .setDescription(`Template name to instantiate`)
                    .setAutocomplete(true)
                    .setRequired(true);
            })
            .addStringOption(option => {
                return option
                    .setName(`organization`)
                    .setDescription(`Organization UID that will own this object (uses your default if omitted)`)
                    .setRequired(false);
            })
            .addStringOption(option => {
                return option
                    .setName(`name`)
                    .setDescription(`Custom name for the object instance`)
                    .setRequired(false);
            });
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
        case `template`:
            await ExecuteManageTemplate(interaction);
            break;
        case `object`:
            await ExecuteManageObject(interaction);
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

/**
 * Handle autocomplete interactions for /manage subcommands.
 * Delegates template name completion to the shared handler.
 *
 * @param interaction AutocompleteInteraction Discord autocomplete interaction.
 * @returns Promise<void>
 */
export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    await AutocompleteTemplateName(interaction);
}
