import { Colors, EmbedBuilder } from 'discord.js';
import type { OrganizationCreateFlowState } from '../../../../Flow/Object/Organization/CreateState.js';

/**
 * Compose the embed summarizing the organization being configured.
 * @param state OrganizationCreateFlowState Mutable flow state backing the interaction. @example BuildOrganizationPreviewEmbed(state)
 * @returns EmbedBuilder Embed configured for the preview message. @example const embed = BuildOrganizationPreviewEmbed(state)
 */
export function BuildOrganizationPreviewEmbed(state: OrganizationCreateFlowState): EmbedBuilder {
    const organizationName = state.organizationName?.trim() ? state.organizationName.trim() : `New organization`;
    const friendlyName = state.friendlyName?.trim() ? state.friendlyName.trim() : `Not provided`;
    const description = state.description?.trim() ? state.description.trim() : `No description provided yet.`;

    const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle(organizationName)
        .setDescription(description)
        .addFields({ name: `Friendly name`, value: friendlyName, inline: true });

    embed.addFields({ name: `Identifier`, value: `Assigned automatically.`, inline: true });

    return embed;
}
