import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import { log } from '../../../../Common/Log.js';
import { GetOrganizationByUid } from '../../../../Flow/Object/Organization/View/GetOrganizationByUid.js';
import { ResolveObjectByUid } from '../../../../Flow/Object/ResolveByUid.js';
import { RemoveObjectFromOrganization } from '../../../../Flow/Object/Organization/Association/RemoveObjectFromOrganization.js';
import type { CommandSubcommand } from '../../../CommandSubcommand.js';

const _subcommandName = `remove`; // subcommand name

export function BuildOrganizationRemoveSubcommand(
    subcommand: SlashCommandSubcommandBuilder,
): SlashCommandSubcommandBuilder {
    return subcommand
        .setName(_subcommandName)
        .setDescription(`Remove an object from an organization`)
        .addStringOption(opt => {
            return opt.setName(`id`).setDescription(`Organization UID`).setRequired(true);
        })
        .addStringOption(opt => {
            return opt.setName(`object`).setDescription(`Object UID to remove`).setRequired(true);
        });
}

export async function ExecuteOrganizationRemoveSubcommand(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const organizationUidRaw = interaction.options.getString(`id`, true);
        const organizationUid = organizationUidRaw.trim();
        const objectUid = interaction.options.getString(`object`, true).trim();

        const organization = await GetOrganizationByUid(organizationUid);
        if (!organization) {
            await interaction.editReply({ content: `Organization \`${organizationUid}\` not found.` });
            return;
        }

        const resolved = await ResolveObjectByUid(objectUid);
        if (!resolved) {
            await interaction.editReply({ content: `Object \`${objectUid}\` not found.` });
            return;
        }

        const result = await RemoveObjectFromOrganization(objectUid, organizationUid);
        if (!result.success) {
            await interaction.editReply({ content: `Failed to remove object: ${result.error ?? `Unknown error`}` });
            return;
        }

        await interaction.editReply({ content: `Removed \`${resolved.name}\` (${resolved.uid}) from organization \`${organizationUid}\`.` });
        log.info(`Object removed from organization via command`, `OrganizationRemoveSubcommand`, `object=${objectUid} org=${organizationUid} by=${interaction.user.id}`);
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Organization remove subcommand failed`, message, `OrganizationRemoveSubcommand`);
        await interaction.editReply({ content: `Failed to remove object: ${message}` });
    } finally {
        // no-op
    }
}

export const OrganizationRemoveSubcommand: CommandSubcommand = {
    subcommandName: _subcommandName,
    BuildSubcommand: BuildOrganizationRemoveSubcommand,
    Execute: ExecuteOrganizationRemoveSubcommand,
};
