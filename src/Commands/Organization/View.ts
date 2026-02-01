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

/**
 * Handle /organization view command.
 * Displays organization information including hierarchy and members.
 * @param interaction Discord interaction with view options.
 * @returns Promise<void> Resolves when view completes.
 */
export async function ExecuteOrganizationView(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const organizationUid = interaction.options.getString(`id`, true);

    if (!organizationUid.trim()) {
        await interaction.reply({
            content: `Organization UID cannot be empty.`,
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
                content: `Organization \`${organizationUid}\` not found.`,
            });
            return;
        }

        const { organization, users } = organizationData;
        const children = await GetChildOrganizations(organization.uid);

        const hierarchyDisplay = organization.hierarchyChain.length > 1
            ? organization.hierarchyChain.join(` → `)
            : `Root organization`;

        const membersDisplay = users.length > 0
            ? users.map(user => {
                return `• ${user.friendlyName} (<@${user.discordId}>)`;
            }).join(`\n`)
            : `No members`;

        const childrenDisplay = children.length > 0
            ? children.map(child => {
                return `• ${child.friendlyName} (\`${child.uid}\`)`;
            }).join(`\n`)
            : `No child organizations`;

        const embed = new EmbedBuilder()
            .setTitle(organization.friendlyName)
            .setColor(0x5865F2)
            .addFields(
                { name: `UID`, value: `\`${organization.uid}\``, inline: true },
                { name: `Name`, value: organization.name, inline: true },
                { name: `Parent`, value: organization.parentUid ? `\`${organization.parentUid}\`` : `None (Root)`, inline: true },
                { name: `Hierarchy Path`, value: hierarchyDisplay, inline: false },
                { name: `Members (${users.length})`, value: membersDisplay.substring(0, 1024), inline: false },
                { name: `Child Organizations (${children.length})`, value: childrenDisplay.substring(0, 1024), inline: false },
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
            content: `Failed to view organization: ${message}`,
        });
    }
}
