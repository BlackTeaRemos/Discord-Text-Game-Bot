import type { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import { PromptText } from '../../../../SubCommand/Prompt/TextAsync.js';
import type { DescriptionComposerOptions, DescriptionComposerResult } from './Types.js';

/** Default timeout for text input collection in milliseconds. */
const DEFAULT_TIMEOUT_MS = 300000;

/** Default maximum character length for description. */
const DEFAULT_MAX_LENGTH = 4000;

/** Default cancel keywords. */
const DEFAULT_CANCEL_WORDS = [`cancel`];

/**
 * Run the description composer flow.
 * Collects description text from user without any database operations.
 * Returns the composed text for caller to handle persistence.
 * Caller is responsible for deferring the interaction before calling this flow.
 * @param interaction ChatInputCommandInteraction | ButtonInteraction The triggering interaction.
 * @param options DescriptionComposerOptions Configuration for the composer.
 * @returns Promise<DescriptionComposerResult> Result containing the composed text.
 * @example
 * const result = await RunDescriptionComposerFlow(interaction, { userUid: '123' });
 * if (result.success) {
 *   console.log(result.content);
 * }
 */
export async function RunDescriptionComposerFlow(
    interaction: ChatInputCommandInteraction | ButtonInteraction,
    options: DescriptionComposerOptions,
): Promise<DescriptionComposerResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
    const cancelWords = options.cancelWords ?? DEFAULT_CANCEL_WORDS;
    const prompt = options.prompt ?? __BuildDefaultPrompt(options.initialContent);

    try {
        const content = await PromptText({
            interaction: interaction as ChatInputCommandInteraction,
            prompt,
            timeoutMs,
            cancelWords,
            maxLength,
        });

        return {
            success: true,
            content,
            cancelled: false,
            timedOut: false,
        };
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const wasCancelled = errorMessage.toLowerCase().includes(`cancel`);
        const wasTimeout = errorMessage.toLowerCase().includes(`timeout`) ||
                           errorMessage.toLowerCase().includes(`timed out`);

        return {
            success: false,
            content: null,
            cancelled: wasCancelled,
            timedOut: wasTimeout,
        };
    }
}

/**
 * Build the default prompt message for description input.
 * @param initialContent string | undefined Current content for context.
 * @returns string Prompt message to display.
 */
function __BuildDefaultPrompt(initialContent?: string): string {
    const hasContent = initialContent && initialContent.trim().length > 0;
    if (hasContent) {
        return `Type your new description in this channel.\nYour next message will replace the current content.\nType **cancel** to abort.`;
    }
    return `Type your description in this channel.\nType **cancel** to abort.`;
}
