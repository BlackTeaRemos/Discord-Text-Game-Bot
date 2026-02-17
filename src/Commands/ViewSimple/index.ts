import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ExecuteViewGame } from './Game.js';
import { ExecuteViewTask } from './Task.js';
import { ExecuteViewObject } from './Object.js';
import { ExecuteViewTemplate } from './Template.js';
import { ExecuteViewObjectList } from './ObjectList.js';
import { AutocompleteTemplateName } from '../Common/AutocompleteTemplateName.js';
import { AutocompleteObjectName } from '../Common/AutocompleteObjectName.js';
import { AutocompleteOrganization } from '../Common/AutocompleteOrganization.js';
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
                    .setAutocomplete(true)
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
                    .setAutocomplete(true)
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
                    .setAutocomplete(true)
                    .setRequired(true);
            })
            .addStringOption(option => {
                return option
                    .setName(`organization`)
                    .setDescription(Translate(`commands.view.options.organization`))
                    .setAutocomplete(true)
                    .setRequired(false);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`template`)
            .setDescription(Translate(`commands.view.subcommands.template.description`));
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`objects`)
            .setDescription(Translate(`commands.view.subcommands.objects.description`))
            .addStringOption(option => {
                return option
                    .setName(`template`)
                    .setDescription(Translate(`commands.view.options.objects.template`))
                    .setAutocomplete(true)
                    .setRequired(false);
            })
            .addStringOption(option => {
                return option
                    .setName(`organization`)
                    .setDescription(Translate(`commands.view.options.organization`))
                    .setAutocomplete(true)
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
        case `template`:
            await ExecuteViewTemplate(interaction);
            break;
        case `objects`:
            await ExecuteViewObjectList(interaction);
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

/**
 * Handle autocomplete interactions for /view subcommands
 * Routes to template name or object name completion based on focused option
 *
 * @param interaction AutocompleteInteraction Discord autocomplete interaction
 * @returns Promise<void>
 */
export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === `template`) {
        await AutocompleteTemplateName(interaction);
    } else if (focusedOption.name === `id`) {
        await AutocompleteObjectName(interaction);
    } else if (focusedOption.name === `organization`) {
        await AutocompleteOrganization(interaction);
    } else {
        await interaction.respond([]);
    }
}
