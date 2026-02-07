import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors } from 'discord.js';
import type { DescriptionViewerState } from './Types.js';
import { GetPageContent, CalculatePageCount } from '../Scope/Types.js';
import { Translate } from '../../../../Services/I18nService.js';

/** Custom ID for previous page button. */
export const VIEWER_PAGE_PREV_BUTTON_ID = `description_viewer_page_prev`;

/** Custom ID for next page button. */
export const VIEWER_PAGE_NEXT_BUTTON_ID = `description_viewer_page_next`;

/** Custom ID for edit button in viewer. */
export const VIEWER_EDIT_BUTTON_ID = `description_viewer_edit`;

/**
 * Result of building viewer preview.
 * @property embed EmbedBuilder The preview embed.
 * @property components ActionRowBuilder<ButtonBuilder>[] Navigation and action buttons.
 */
export interface ViewerPreviewResult {
    embed: EmbedBuilder;
    components: ActionRowBuilder<ButtonBuilder>[];
}

/**
 * Options for building viewer preview.
 * @property showEditButton boolean Whether to include edit button.
 */
export interface ViewerPreviewOptions {
    showEditButton: boolean;
}

/**
 * Build paginated description preview with navigation buttons.
 * @param state DescriptionViewerState Current viewer state with content and page info.
 * @param options ViewerPreviewOptions Configuration for preview rendering.
 * @returns ViewerPreviewResult Embed and button components for display.
 * @example const preview = BuildViewerPreview(state, { showEditButton: true });
 */
export function BuildViewerPreview(
    state: DescriptionViewerState,
    options: ViewerPreviewOptions,
): ViewerPreviewResult {
    const totalPages = CalculatePageCount(state.currentContent);
    const currentPage = Math.min(state.currentPage, totalPages - 1);
    const pageContent = GetPageContent(state.currentContent, currentPage);

    const embed = new EmbedBuilder()
        .setColor(Colors.Blue)
        .setTitle(__BuildPreviewTitle(state))
        .setDescription(pageContent || Translate(`descriptionViewer.noDescription`))
        .setFooter({ text: __BuildFooterText(currentPage, totalPages, state) });

    const components = __BuildNavigationButtons(currentPage, totalPages, options.showEditButton);

    return { embed, components };
}

/**
 * Build title for the preview embed.
 * @param state DescriptionViewerState Current viewer state.
 * @returns string Title text including scope label.
 */
function __BuildPreviewTitle(state: DescriptionViewerState): string {
    const scopeLabel = state.selectedScope?.label ?? Translate(`descriptionViewer.scopeDefault`);
    return `${state.objectReference.objectType} - ${scopeLabel}`;
}

/**
 * Build footer text showing page info and scope.
 * @param currentPage number Zero-based current page index.
 * @param totalPages number Total page count.
 * @param state DescriptionViewerState Current viewer state.
 * @returns string Footer text.
 */
function __BuildFooterText(
    currentPage: number,
    totalPages: number,
    state: DescriptionViewerState,
): string {
    const pageIndicator = totalPages > 1
        ? Translate(`descriptionViewer.pageIndicator`, { params: { index: currentPage + 1, total: totalPages } })
        : ``;
    const scopeIndicator = state.selectedScope ? state.selectedScope.scopeType : ``;
    return [pageIndicator, scopeIndicator].filter(Boolean).join(` | `);
}

/**
 * Build navigation and action button rows.
 * @param currentPage number Zero-based current page index.
 * @param totalPages number Total page count.
 * @param showEditButton boolean Whether to include edit button.
 * @returns ActionRowBuilder<ButtonBuilder>[] Button component rows.
 */
function __BuildNavigationButtons(
    currentPage: number,
    totalPages: number,
    showEditButton: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
    const buttons: ButtonBuilder[] = [];

    if (totalPages > 1) {
        const prevButton = new ButtonBuilder()
            .setCustomId(VIEWER_PAGE_PREV_BUTTON_ID)
            .setLabel(Translate(`descriptionViewer.previous`))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0);

        const nextButton = new ButtonBuilder()
            .setCustomId(VIEWER_PAGE_NEXT_BUTTON_ID)
            .setLabel(Translate(`descriptionViewer.next`))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= totalPages - 1);

        buttons.push(prevButton, nextButton);
    }

    if (showEditButton) {
        const editButton = new ButtonBuilder()
            .setCustomId(VIEWER_EDIT_BUTTON_ID)
            .setLabel(Translate(`descriptionViewer.edit`))
            .setStyle(ButtonStyle.Primary);

        buttons.push(editButton);
    }

    if (buttons.length === 0) {
        return [];
    }

    return [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)];
}
