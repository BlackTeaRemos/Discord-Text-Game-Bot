import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import { log } from '../../../../Common/Log.js';
import { ExecuteOrganizationSelect } from '../../Select.js';
import type { CommandSubcommand } from '../../../CommandSubcommand.js';
import { Translate, TranslateFromContext } from '../../../../Services/I18nService.js';

const _subcommandName = `select`; // subcommand name

/**
 * Build select subcommand
 * @param subcommand SlashCommandSubcommandBuilder Subcommand builder @example BuildOrganizationSelectSubcommand(builder)
 * @returns SlashCommandSubcommandBuilder Updated subcommand builder @example const updated = BuildOrganizationSelectSubcommand(builder)
 */
export function BuildOrganizationSelectSubcommand(
    subcommand: SlashCommandSubcommandBuilder,
): SlashCommandSubcommandBuilder {
    return subcommand
        .setName(_subcommandName)
        .setDescription(Translate(`commands.organization.select.description`));
}

/**
 * Execute select subcommand
 * @param interaction InteractionExecutionContextCarrier Command interaction @example await ExecuteOrganizationSelectSubcommand(interaction)
 * @returns void Resolves when command completes @example await ExecuteOrganizationSelectSubcommand(interaction)
 */
export async function ExecuteOrganizationSelectSubcommand(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    try {
        await ExecuteOrganizationSelect(interaction);
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Organization select subcommand failed`, message, `OrganizationSelectSubcommand`);
        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.select.errors.failed`, {
                    params: { message },
                }),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.select.errors.failed`, {
                params: { message },
            }),
        });
    } finally {
        // noop
    }
}

/**
 * Exported select subcommand module
 * @example const subcommand = OrganizationSelectSubcommand
 */
export const OrganizationSelectSubcommand: CommandSubcommand = {
    subcommandName: _subcommandName,
    BuildSubcommand: BuildOrganizationSelectSubcommand,
    Execute: ExecuteOrganizationSelectSubcommand,
};
