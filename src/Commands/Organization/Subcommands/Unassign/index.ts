import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import { Log } from '../../../../Common/Log.js';
import { GetOrganizationByUid } from '../../../../Flow/Object/Organization/View/GetOrganizationByUid.js';
import { ResolveObjectByUid } from '../../../../Flow/Object/ResolveByUid.js';
import { RemoveObjectFromOrganization } from '../../../../Flow/Object/Organization/Association/RemoveObjectFromOrganization.js';
import type { CommandSubcommand } from '../../../CommandSubcommand.js';
import { Translate, TranslateFromContext } from '../../../../Services/I18nService.js';

const _subcommandName = `unassign`; // subcommand name

/**
 * Build unassign subcommand definition
 * @param subcommand SlashCommandSubcommandBuilder Subcommand builder
 * @returns SlashCommandSubcommandBuilder Updated subcommand builder
 */
export function BuildOrganizationUnassignSubcommand(
    subcommand: SlashCommandSubcommandBuilder,
): SlashCommandSubcommandBuilder {
    return subcommand
        .setName(_subcommandName)
        .setDescription(Translate(`commands.organization.unassign.description`))
        .addStringOption(opt => {
            return opt.setName(`organization`).setDescription(Translate(`commands.organization.unassign.options.organization`)).setAutocomplete(true).setRequired(true);
        })
        .addStringOption(opt => {
            return opt.setName(`object`).setDescription(Translate(`commands.organization.unassign.options.object`)).setAutocomplete(true).setRequired(true);
        });
}

/**
 * Execute unassign subcommand to remove an object from an organization
 * @param interaction InteractionExecutionContextCarrier Discord interaction
 * @returns void
 */
export async function ExecuteOrganizationUnassignSubcommand(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const organizationUidRaw = interaction.options.getString(`organization`, true);
        const organizationUid = organizationUidRaw.trim();
        const objectUid = interaction.options.getString(`object`, true).trim();

        const organization = await GetOrganizationByUid(organizationUid);
        if (!organization) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.unassign.errors.organizationNotFound`, {
                    params: { organization: organizationUid },
                }),
            });
            return;
        }

        const resolved = await ResolveObjectByUid(objectUid);
        if (!resolved) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.unassign.errors.objectNotFound`, {
                    params: { object: objectUid },
                }),
            });
            return;
        }

        const result = await RemoveObjectFromOrganization(objectUid, organizationUid);
        if (!result.success) {
            const reason = result.error
                ?? TranslateFromContext(interaction.executionContext, `commands.organization.unassign.errors.unknownError`);
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.unassign.errors.failed`, {
                    params: { reason },
                }),
            });
            return;
        }

        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.unassign.messages.success`, {
                params: { name: resolved.name, uid: resolved.uid, organizationUid },
            }),
        });
        Log.info(`Object unassigned from organization via command`, `OrganizationUnassignSubcommand`, `object=${objectUid} org=${organizationUid} by=${interaction.user.id}`);
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        Log.error(`Organization unassign subcommand failed`, message, `OrganizationUnassignSubcommand`);
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.unassign.errors.failed`, {
                params: { reason: message },
            }),
        });
    } finally {
        // no op
    }
}

/** Exported unassign subcommand module */
export const OrganizationUnassignSubcommand: CommandSubcommand = {
    subcommandName: _subcommandName,
    BuildSubcommand: BuildOrganizationUnassignSubcommand,
    Execute: ExecuteOrganizationUnassignSubcommand,
};
