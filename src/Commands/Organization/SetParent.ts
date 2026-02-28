import { MessageFlags, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { log } from '../../Common/Log.js';
import {
    SetOrganizationParent,
    GetOrganizationByUid,
    CheckCircularDependency,
} from '../../Flow/Object/Organization/index.js';
import { TranslateFromContext } from '../../Services/I18nService.js';

/**
 * Handle organization set_parent command with circular dependency protection
 * @param interaction Discord interaction with set_parent options
 * @returns void
 */
export async function ExecuteOrganizationSetParent(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const organizationUid = interaction.options.getString(`organization`, true);
    const newParentUid = interaction.options.getString(`parent`) ?? null;

    if (!organizationUid.trim()) {
        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.setParent.errors.emptyId`),
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const existingOrganization = await GetOrganizationByUid(organizationUid.trim());
        if (!existingOrganization) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.setParent.errors.notFound`, {
                    params: { id: organizationUid },
                }),
            });
            return;
        }

        if (newParentUid) {
            const parentOrganization = await GetOrganizationByUid(newParentUid.trim());
            if (!parentOrganization) {
                await interaction.editReply({
                    content: TranslateFromContext(interaction.executionContext, `commands.organization.setParent.errors.parentNotFound`, {
                        params: { id: newParentUid },
                    }),
                });
                return;
            }

            const circularCheck = await CheckCircularDependency(newParentUid.trim(), organizationUid.trim());
            if (!circularCheck.valid) {
                const chainDisplay = circularCheck.chain?.length
                    ? TranslateFromContext(interaction.executionContext, `commands.organization.setParent.labels.dependencyChain`, {
                        params: { chain: circularCheck.chain.join(` → `) },
                    })
                    : ``;
                const reasonText = TranslateFromContext(interaction.executionContext, `commands.organization.setParent.errors.circularDependency`, {
                    params: { reason: circularCheck.reason },
                });
                const combined = chainDisplay ? `${reasonText}\n${chainDisplay}` : reasonText;

                await interaction.editReply({
                    content: combined,
                });
                return;
            }
        }

        const result = await SetOrganizationParent(
            organizationUid.trim(),
            newParentUid?.trim() ?? null,
        );

        if (!result.success) {
            const reason = result.error
                ?? TranslateFromContext(interaction.executionContext, `commands.organization.setParent.errors.unknownError`);
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.setParent.errors.failed`, {
                    params: { reason },
                }),
            });
            return;
        }

        const updatedOrganization = await GetOrganizationByUid(organizationUid.trim());
        const hierarchyDisplay = updatedOrganization
            ? updatedOrganization.hierarchyChain.join(` → `)
            : organizationUid;

        const title = TranslateFromContext(interaction.executionContext, `commands.organization.setParent.labels.title`);
        const organizationLabel = TranslateFromContext(interaction.executionContext, `commands.organization.setParent.labels.organization`);
        const previousParentLabel = TranslateFromContext(interaction.executionContext, `commands.organization.setParent.labels.previousParent`);
        const newParentLabel = TranslateFromContext(interaction.executionContext, `commands.organization.setParent.labels.newParent`);
        const newHierarchyLabel = TranslateFromContext(interaction.executionContext, `commands.organization.setParent.labels.newHierarchy`);
        const previousParentValue = existingOrganization.parentUid
            ? `\`${existingOrganization.parentUid}\``
            : TranslateFromContext(interaction.executionContext, `commands.organization.setParent.labels.noneWasRoot`);
        const newParentValue = newParentUid
            ? `\`${newParentUid}\``
            : TranslateFromContext(interaction.executionContext, `commands.organization.setParent.labels.noneNowRoot`);
        const updatedByLabel = TranslateFromContext(interaction.executionContext, `commands.organization.setParent.labels.updatedBy`, {
            params: { userTag: interaction.user.tag },
        });

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(0x00AE86)
            .addFields(
                { name: organizationLabel, value: `${existingOrganization.friendlyName} (\`${existingOrganization.uid}\`)`, inline: false },
                { name: previousParentLabel, value: previousParentValue, inline: true },
                { name: newParentLabel, value: newParentValue, inline: true },
                { name: newHierarchyLabel, value: hierarchyDisplay, inline: false },
            )
            .setTimestamp()
            .setFooter({ text: updatedByLabel });

        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.setParent.messages.success`),
            embeds: [embed],
        });

        log.info(
            `Organization parent updated: ${organizationUid}`,
            `OrganizationSetParentCommand`,
            `oldParent=${existingOrganization.parentUid ?? `none`} newParent=${newParentUid ?? `none`} by=${interaction.user.id}`,
        );
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to set organization parent`, message, `OrganizationSetParentCommand`);
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.setParent.errors.failed`, {
                params: { reason: message },
            }),
        });
    }
}
