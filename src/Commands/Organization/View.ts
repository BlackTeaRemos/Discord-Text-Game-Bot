import { MessageFlags, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { log } from '../../Common/Log.js';
import {
    GetOrganizationWithMembers,
    GetChildOrganizations,
    EnsureGlobalOrganization,
    GLOBAL_ORGANIZATION_NAME,
} from '../../Flow/Object/Organization/index.js';
import { TranslateFromContext } from '../../Services/I18nService.js';

/**
 * Handle /organization view command.
 * Displays organization information including hierarchy and members.
 * @param interaction Discord interaction with view options.
 * @returns Promise<void> Resolves when view completes.
 */
export async function ExecuteOrganizationView(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const organizationUid = interaction.options.getString(`organization`, true);

    if (!organizationUid.trim()) {
        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.view.errors.emptyId`),
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const rawOrganizationUid = organizationUid.trim(); // provided organization identifier
        const resolvedOrganizationUid = rawOrganizationUid === GLOBAL_ORGANIZATION_NAME
            ? (await EnsureGlobalOrganization()).uid
            : rawOrganizationUid; // resolved organization uid

        const organizationData = await GetOrganizationWithMembers(resolvedOrganizationUid);

        if (!organizationData) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.view.errors.notFound`, {
                    params: { id: organizationUid },
                }),
            });
            return;
        }

        const { organization, users } = organizationData;
        const children = await GetChildOrganizations(organization.uid);

        const hierarchyDisplay = organization.hierarchyChain.length > 1
            ? organization.hierarchyChain.join(` → `)
            : TranslateFromContext(interaction.executionContext, `commands.organization.view.labels.rootOrganization`);

        const membersDisplay = users.length > 0
            ? users.map(user => {
                return `• ${user.friendlyName} (<@${user.discordId}>)`;
            }).join(`\n`)
            : TranslateFromContext(interaction.executionContext, `commands.organization.view.labels.noMembers`);

        const childrenDisplay = children.length > 0
            ? children.map(child => {
                return `• ${child.friendlyName} (\`${child.uid}\`)`;
            }).join(`\n`)
            : TranslateFromContext(interaction.executionContext, `commands.organization.view.labels.noChildren`);

        const uidLabel = TranslateFromContext(interaction.executionContext, `commands.organization.view.labels.uid`);
        const nameLabel = TranslateFromContext(interaction.executionContext, `commands.organization.view.labels.name`);
        const parentLabel = TranslateFromContext(interaction.executionContext, `commands.organization.view.labels.parent`);
        const parentRootLabel = TranslateFromContext(interaction.executionContext, `commands.organization.view.labels.parentRoot`);
        const hierarchyLabel = TranslateFromContext(interaction.executionContext, `commands.organization.view.labels.hierarchyPath`);
        const membersLabel = TranslateFromContext(interaction.executionContext, `commands.organization.view.labels.members`, {
            params: { count: users.length },
        });
        const childrenLabel = TranslateFromContext(interaction.executionContext, `commands.organization.view.labels.children`, {
            params: { count: children.length },
        });

        const embed = new EmbedBuilder()
            .setTitle(organization.friendlyName)
            .setColor(0x5865F2)
            .addFields(
                { name: uidLabel, value: `\`${organization.uid}\``, inline: true },
                { name: nameLabel, value: organization.name, inline: true },
                { name: parentLabel, value: organization.parentUid ? `\`${organization.parentUid}\`` : parentRootLabel, inline: true },
                { name: hierarchyLabel, value: hierarchyDisplay, inline: false },
                { name: membersLabel, value: membersDisplay.substring(0, 1024), inline: false },
                { name: childrenLabel, value: childrenDisplay.substring(0, 1024), inline: false },
            )
            .setTimestamp();

        await interaction.editReply({
            embeds: [embed],
        });

        log.debug(
            `Organization viewed: ${organization.uid}`,
            `OrganizationViewCommand`,
            `by=${interaction.user.id}`,
        );
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to view organization`, message, `OrganizationViewCommand`);
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.view.errors.failed`, {
                params: { message },
            }),
        });
    }
}
