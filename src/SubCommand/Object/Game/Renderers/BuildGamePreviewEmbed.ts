import { Colors, EmbedBuilder } from 'discord.js';
import type { GameCreateFlowState } from '../../../../Flow/Object/Game/CreateState.js';
import { GameCreateFlowConstants } from '../../../../Flow/Object/Game/CreateState.js';
import { ResolveEmbedThumbnailUrl } from '../../../../Common/Flow/ResolveEmbedThumbnailUrl.js';
import { Translate } from '../../../../Services/I18nService.js';

/**
 * Build the embed showing the live preview of the game being configured.
 * @param state GameCreateFlowState Current mutable flow state. @example BuildGamePreviewEmbed(state)
 * @returns EmbedBuilder Configured embed for the preview message. @example const embed = BuildGamePreviewEmbed(state)
 */
export function BuildGamePreviewEmbed(state: GameCreateFlowState): EmbedBuilder {
    const organization = state.organizationName ?? Translate(`gameCreate.preview.selectOrganization`);
    const gameName = state.gameName?.trim() ? state.gameName.trim() : Translate(`gameCreate.preview.unnamedGame`);
    const description = state.description?.trim() ? state.description.trim() : Translate(`gameCreate.preview.noDescription`);
    const imageUrl = ResolveEmbedThumbnailUrl(state.imageUrl, GameCreateFlowConstants.defaultImageUrl);
    const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setAuthor({ name: organization })
        .setTitle(gameName)
        .setDescription(description)
        .setFooter({ text: Translate(`gameCreate.preview.serverFooter`, { params: { serverId: state.serverId } }) });
    if (imageUrl) {
        embed.setThumbnail(imageUrl);
    }
    if (!state.organizationUid) {
        embed.setTimestamp(new Date());
    }
    return embed;
}
