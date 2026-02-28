import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import { log } from '../../../../Common/Log.js';
import { ExecuteOrganizationSetParent } from '../../SetParent.js';
import type { CommandSubcommand } from '../../../CommandSubcommand.js';
import { Translate, TranslateFromContext } from '../../../../Services/I18nService.js';

const _subcommandName = `set_parent`; // subcommand name

/**
 * Build set_parent subcommand.
 * @param subcommand SlashCommandSubcommandBuilder Subcommand builder. @example BuildOrganizationSetParentSubcommand(builder)
 * @returns SlashCommandSubcommandBuilder Updated subcommand builder. @example const updated = BuildOrganizationSetParentSubcommand(builder)
 */
export function BuildOrganizationSetParentSubcommand(
    subcommand: SlashCommandSubcommandBuilder,
): SlashCommandSubcommandBuilder {
    return subcommand
        .setName(_subcommandName)
        .setDescription(Translate(`commands.organization.setParent.description`))
        .addStringOption(option => {
            return option
                .setName(`organization`)
                .setDescription(Translate(`commands.organization.setParent.options.organization`))
                .setAutocomplete(true)
                .setRequired(true);
        })
        .addStringOption(option => {
            return option
                .setName(`parent`)
                .setDescription(Translate(`commands.organization.setParent.options.parent`))
                .setAutocomplete(true)
                .setRequired(false);
        });
}

/**
 * Execute set_parent subcommand.
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Command interaction. @example await ExecuteOrganizationSetParentSubcommand(interaction)
 * @returns Promise<void> Resolves when command completes. @example await ExecuteOrganizationSetParentSubcommand(interaction)
 */
export async function ExecuteOrganizationSetParentSubcommand(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    try {
        await ExecuteOrganizationSetParent(interaction);
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Organization set_parent subcommand failed`, message, `OrganizationSetParentSubcommand`);
        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.setParent.errors.failed`, {
                    params: { reason: message },
                }),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.setParent.errors.failed`, {
                params: { reason: message },
            }),
        });
    } finally {
        // no-op
    }
}

/**
 * Exported set_parent subcommand module.
 * @example const subcommand = OrganizationSetParentSubcommand
 */
export const OrganizationSetParentSubcommand: CommandSubcommand = {
    subcommandName: _subcommandName,
    BuildSubcommand: BuildOrganizationSetParentSubcommand,
    Execute: ExecuteOrganizationSetParentSubcommand,
};
