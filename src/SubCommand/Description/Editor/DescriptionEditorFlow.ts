import type { ButtonInteraction, ChatInputCommandInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';
import type { DescriptionEditorFlowOptions } from '../../../Flow/Object/Description/Scope/Types.js';
import type { DescriptionViewerState, ViewerEditCallback } from '../Viewer/Types.js';
import { CalculatePageCount } from '../../../Flow/Object/Description/Scope/Types.js';
import { RunDescriptionViewerFlow } from '../Viewer/DescriptionViewerFlow.js';
import { SaveScopedDescription } from '../../../Flow/Object/Description/Scope/SaveScopedDescription.js';
import { RunDescriptionComposerFlow } from '../Composer/DescriptionComposerFlow.js';
import { TranslateFromContext } from '../../../Services/I18nService.js';
/** Timeout for text input collection in milliseconds. */
const TEXT_INPUT_TIMEOUT_MS = 300000;

/**
 * Run the description editor flow.
 * Wraps the viewer flow and provides edit capability via chat message input.
 * Permissions are validated by the caller before invoking this flow.
 * Scope visibility is filtered in the viewer based on options.permissions.
 * @param interaction ChatInputCommandInteraction | ButtonInteraction The triggering interaction.
 * @param options DescriptionEditorFlowOptions Configuration for the flow.
 * @returns Promise<void> Resolves when flow completes or times out.
 * @example await RunDescriptionEditorFlow(interaction, { objectType: 'vehicle', ... });
 */
export async function RunDescriptionEditorFlow(
    interaction: ChatInputCommandInteraction | ButtonInteraction,
    options: DescriptionEditorFlowOptions,
): Promise<void> {
    const editCallback = __CreateEditCallback(options);

    await RunDescriptionViewerFlow(interaction, {
        objectType: options.objectType,
        objectUid: options.objectUid,
        userUid: options.userUid,
        organizationUid: options.organizationUid,
        canEditGlobal: options.canEditGlobal,
        permissions: options.permissions,
        showEditButton: true,
        onEditRequest: editCallback,
    });
}

/**
 * Create the edit callback for the viewer.
 * Uses the composer flow for text collection, then persists via SaveScopedDescription.
 * Permission validation is done upstream before flow entry.
 * @param options DescriptionEditorFlowOptions Editor options.
 * @returns ViewerEditCallback Callback function for edit button.
 */
function __CreateEditCallback(
    options: DescriptionEditorFlowOptions,
): ViewerEditCallback {
    void options; // Reserved for future use

    return async(
        state: DescriptionViewerState,
        buttonInteraction: ButtonInteraction,
    ): Promise<DescriptionViewerState> => {
        if (!state.selectedScope) {
            await buttonInteraction.deferUpdate();
            return state;
        }

        // Defer the button so composer can use the interaction for followUp
        await buttonInteraction.deferUpdate();

        const composerResult = await RunDescriptionComposerFlow(
            buttonInteraction as unknown as ChatInputCommandInteraction,
            {
                initialContent: state.currentContent,
                maxLength: 4000,
                prompt: TranslateFromContext((buttonInteraction as any).executionContext, `descriptionEditor.prompt`, {
                    params: { scope: state.selectedScope.label },
                }),
                timeoutMs: TEXT_INPUT_TIMEOUT_MS,
                userUid: state.userUid,
                organizationUid: state.organizationUid,
                canEditGlobal: options.canEditGlobal,
                permissions: state.permissions,
            },
        );

        if (!composerResult.success || !composerResult.content) {
            if (composerResult.cancelled) {
                await buttonInteraction.followUp({
                    content: TranslateFromContext((buttonInteraction as any).executionContext, `descriptionEditor.messages.cancelled`),
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }
            return state;
        }

        try {
            await SaveScopedDescription({
                objectType: state.objectReference.objectType,
                objectUid: state.objectReference.objectUid,
                scope: state.selectedScope,
                content: composerResult.content,
                createdBy: state.userUid,
            });

            await buttonInteraction.followUp({
                content: TranslateFromContext((buttonInteraction as any).executionContext, `descriptionEditor.messages.updated`),
                flags: MessageFlags.Ephemeral,
            });

            return {
                ...state,
                currentContent: composerResult.content,
                currentPage: 0,
                totalPages: CalculatePageCount(composerResult.content),
            };
        } catch(error) {
            const errorMessage = error instanceof Error
                ? error.message
                : TranslateFromContext((buttonInteraction as any).executionContext, `descriptionEditor.errors.saveFailed`);
            await buttonInteraction.followUp({
                content: errorMessage,
                flags: MessageFlags.Ephemeral,
            }).catch(() => {});
            return state;
        }
    };
}
