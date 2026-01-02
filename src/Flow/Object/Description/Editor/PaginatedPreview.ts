import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors } from 'discord.js';
import type { DescriptionFlowState } from '../Scope/Types.js';
import { GetPageContent, CalculatePageCount } from '../Scope/Types.js';

/**
 * Custom ID for previous page button.
 */
export const PAGE_PREV_BUTTON_ID = `description_page_prev`;

/**
 * Custom ID for next page button.
 */
export const PAGE_NEXT_BUTTON_ID = `description_page_next`;

/**
 * Custom ID for edit button.
 */
export const EDIT_BUTTON_ID = `description_edit`;

/**
 * Result of building paginated preview.
 * @property embed EmbedBuilder The preview embed.
 * @property components ActionRowBuilder<ButtonBuilder>[] Navigation and action buttons.
 */
export interface PaginatedPreviewResult {
    embed: EmbedBuilder;
    components: ActionRowBuilder<ButtonBuilder>[];
}

/**
 * Build paginated description preview with navigation buttons.
 * @param state DescriptionFlowState Current flow state with content and page info.
 * @returns PaginatedPreviewResult Embed and button components for display.
 * @example const preview = BuildPaginatedPreview(state);
 */
export function BuildPaginatedPreview(state: DescriptionFlowState): PaginatedPreviewResult {
    const totalPages = CalculatePageCount(state.currentContent);
    const currentPage = Math.min(state.currentPage, totalPages - 1);
    const pageContent = GetPageContent(state.currentContent, currentPage);

    const embed = new EmbedBuilder()
        .setColor(Colors.Blue)
        .setTitle(BuildPreviewTitle(state))
        .setDescription(pageContent || `No description yet.`)
        .setFooter({ text: BuildFooterText(currentPage, totalPages, state) });

    const components = BuildNavigationButtons(currentPage, totalPages, state.isEditing);

    return { embed, components };
}

/**
 * Build title for the preview embed.
 * @param state DescriptionFlowState Current flow state.
 * @returns string Title text including scope label.
 */
function BuildPreviewTitle(state: DescriptionFlowState): string {
    const scopeLabel = state.selectedScope?.label ?? `Description`;
    return `${state.objectReference.objectType} - ${scopeLabel}`;
}

/**
 * Build footer text showing page info and version.
 * @param currentPage number Zero-based current page index.
 * @param totalPages number Total page count.
 * @param state DescriptionFlowState Current flow state.
 * @returns string Footer text.
 */
function BuildFooterText(currentPage: number, totalPages: number, state: DescriptionFlowState): string {
    const pageIndicator = totalPages > 1 ? `Page ${currentPage + 1}/${totalPages}` : ``;
    const scopeIndicator = state.selectedScope ? state.selectedScope.scopeType : ``;
    return [pageIndicator, scopeIndicator].filter(Boolean).join(` | `);
}

/**
 * Build navigation and action button rows.
 * @param currentPage number Zero-based current page index.
 * @param totalPages number Total page count.
 * @param isEditing boolean Whether currently in edit mode.
 * @returns ActionRowBuilder<ButtonBuilder>[] Button component rows.
 */
function BuildNavigationButtons(
    currentPage: number,
    totalPages: number,
    isEditing: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
    const buttons: ButtonBuilder[] = [];

    if (totalPages > 1) {
        const prevButton = new ButtonBuilder()
            .setCustomId(PAGE_PREV_BUTTON_ID)
            .setLabel(`Previous`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0);

        const nextButton = new ButtonBuilder()
            .setCustomId(PAGE_NEXT_BUTTON_ID)
            .setLabel(`Next`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= totalPages - 1);

        buttons.push(prevButton, nextButton);
    }

    if (!isEditing) {
        const editButton = new ButtonBuilder()
            .setCustomId(EDIT_BUTTON_ID)
            .setLabel(`Edit`)
            .setStyle(ButtonStyle.Primary);

        buttons.push(editButton);
    }

    if (buttons.length === 0) {
        return [];
    }

    return [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)];
}
