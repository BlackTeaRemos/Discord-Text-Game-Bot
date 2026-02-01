import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import { log } from '../../../../Common/Log.js';
import { ExecuteOrganizationSetParent } from '../../SetParent.js';
import type { CommandSubcommand } from '../../../CommandSubcommand.js';

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
        .setDescription(`Change organization parent (hierarchy)`)
        .addStringOption(option => {
            return option
                .setName(`id`)
                .setDescription(`Organization UID to modify`)
                .setRequired(true);
        })
        .addStringOption(option => {
            return option
                .setName(`parent`)
                .setDescription(`New parent organization UID (leave empty to make root)`)
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
            await interaction.reply({ content: `Failed to update organization parent: ${message}`, flags: MessageFlags.Ephemeral });
            return;
        }
        await interaction.editReply({ content: `Failed to update organization parent: ${message}` });
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
