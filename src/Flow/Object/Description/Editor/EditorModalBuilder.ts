import type { ModalSubmitFields } from 'discord.js';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Translate } from '../../../../Services/I18nService.js';

/**
 * Custom ID for the description editor modal.
 */
export const EDITOR_MODAL_ID = `description_editor_modal`;

/**
 * Custom ID for the content text input field.
 */
export const EDITOR_CONTENT_FIELD_ID = `description_editor_content`;

/**
 * Options for building the editor modal.
 * @property scopeLabel string Label of the scope being edited. @example 'Military Alpha Notes'
 * @property currentContent string Existing content to prefill. @example 'Heavy transport vehicle...'
 */
export interface EditorModalOptions {
    scopeLabel: string;
    currentContent: string;
}

/**
 * Build a modal dialog for editing description content.
 * @param options EditorModalOptions Configuration for the modal.
 * @returns ModalBuilder Configured modal ready for interaction.showModal().
 * @example const modal = BuildEditorModal({ scopeLabel: 'Notes', currentContent: '' });
 */
export function BuildEditorModal(options: EditorModalOptions): ModalBuilder {
    const contentInput = new TextInputBuilder()
        .setCustomId(EDITOR_CONTENT_FIELD_ID)
        .setLabel(Translate(`descriptionEditor.contentLabel`))
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(Translate(`descriptionEditor.contentPlaceholder`))
        .setMaxLength(4000)
        .setRequired(false);

    if (options.currentContent) {
        contentInput.setValue(options.currentContent);
    }

    const contentRow = new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput);

    const modal = new ModalBuilder()
        .setCustomId(EDITOR_MODAL_ID)
        .setTitle(Translate(`descriptionEditor.title`, { params: { scopeLabel: options.scopeLabel } }))
        .addComponents(contentRow);

    return modal;
}

/**
 * Extract content from modal submission.
 * @param fields ModalSubmitFields from the interaction.
 * @returns string Submitted content text, trimmed.
 */
export function ExtractModalContent(fields: ModalSubmitFields): string {
    const rawContent = fields.getTextInputValue(EDITOR_CONTENT_FIELD_ID);
    return rawContent?.trim() ?? ``;
}
