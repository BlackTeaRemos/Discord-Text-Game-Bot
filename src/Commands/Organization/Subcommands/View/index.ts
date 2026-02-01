import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import { log } from '../../../../Common/Log.js';
import { ExecuteOrganizationView } from '../../View.js';
import type { CommandSubcommand } from '../../../CommandSubcommand.js';

const _subcommandName = `view`; // subcommand name

/**
 * Build view subcommand.
 * @param subcommand SlashCommandSubcommandBuilder Subcommand builder. @example BuildOrganizationViewSubcommand(builder)
 * @returns SlashCommandSubcommandBuilder Updated subcommand builder. @example const updated = BuildOrganizationViewSubcommand(builder)
 */
export function BuildOrganizationViewSubcommand(
    subcommand: SlashCommandSubcommandBuilder,
): SlashCommandSubcommandBuilder {
    return subcommand
        .setName(_subcommandName)
        .setDescription(`View organization details and hierarchy`)
        .addStringOption(option => {
            return option
                .setName(`id`)
                .setDescription(`Organization UID to view (use 'global' for shared org)`)
                .setRequired(true);
        });
}

/**
 * Execute view subcommand.
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Command interaction. @example await ExecuteOrganizationViewSubcommand(interaction)
 * @returns Promise<void> Resolves when command completes. @example await ExecuteOrganizationViewSubcommand(interaction)
 */
export async function ExecuteOrganizationViewSubcommand(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    try {
        await ExecuteOrganizationView(interaction);
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Organization view subcommand failed`, message, `OrganizationViewSubcommand`);
        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({ content: `Failed to view organization: ${message}`, flags: MessageFlags.Ephemeral });
            return;
        }
        await interaction.editReply({ content: `Failed to view organization: ${message}` });
    } finally {
        // no-op
    }
}

/**
 * Exported view subcommand module.
 * @example const subcommand = OrganizationViewSubcommand
 */
export const OrganizationViewSubcommand: CommandSubcommand = {
    subcommandName: _subcommandName,
    BuildSubcommand: BuildOrganizationViewSubcommand,
    Execute: ExecuteOrganizationViewSubcommand,
};
