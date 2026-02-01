import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import { log } from '../../../../Common/Log.js';
import { ExecuteOrganizationCreate } from '../../Create.js';
import type { CommandSubcommand } from '../../../CommandSubcommand.js';

const _subcommandName = `create`; // subcommand name

/**
 * Build create subcommand.
 * @param subcommand SlashCommandSubcommandBuilder Subcommand builder. @example BuildOrganizationCreateSubcommand(builder)
 * @returns SlashCommandSubcommandBuilder Updated subcommand builder. @example const updated = BuildOrganizationCreateSubcommand(builder)
 */
export function BuildOrganizationCreateSubcommand(
    subcommand: SlashCommandSubcommandBuilder,
): SlashCommandSubcommandBuilder {
    return subcommand
        .setName(_subcommandName)
        .setDescription(`Create a new organization`)
        .addStringOption(option => {
            return option
                .setName(`name`)
                .setDescription(`Organization name (used in permission tokens)`)
                .setRequired(true);
        })
        .addStringOption(option => {
            return option
                .setName(`display_name`)
                .setDescription(`Friendly display name for the organization`)
                .setRequired(false);
        })
        .addStringOption(option => {
            return option
                .setName(`parent`)
                .setDescription(`Parent organization UID for hierarchy`)
                .setRequired(false);
        });
}

/**
 * Execute create subcommand.
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Command interaction. @example await ExecuteOrganizationCreateSubcommand(interaction)
 * @returns Promise<void> Resolves when command completes. @example await ExecuteOrganizationCreateSubcommand(interaction)
 */
export async function ExecuteOrganizationCreateSubcommand(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    try {
        await ExecuteOrganizationCreate(interaction);
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Organization create subcommand failed`, message, `OrganizationCreateSubcommand`);
        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({ content: `Failed to create organization: ${message}`, flags: MessageFlags.Ephemeral });
            return;
        }
        await interaction.editReply({ content: `Failed to create organization: ${message}` });
    } finally {
        // no-op
    }
}

/**
 * Exported create subcommand module.
 * @example const subcommand = OrganizationCreateSubcommand
 */
export const OrganizationCreateSubcommand: CommandSubcommand = {
    subcommandName: _subcommandName,
    BuildSubcommand: BuildOrganizationCreateSubcommand,
    Execute: ExecuteOrganizationCreateSubcommand,
};
