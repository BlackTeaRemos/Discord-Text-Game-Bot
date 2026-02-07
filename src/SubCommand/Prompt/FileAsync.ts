import { Attachment, ChatInputCommandInteraction, Message, MessageFlags } from 'discord.js';
import { MAIN_EVENT_BUS } from '../../Events/MainEventBus.js';
import { ValidateFileOrImageInput } from './File.js';
import { log } from '../../Common/Log.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { TranslateFromContext } from '../../Services/I18nService.js';

/**
 * Options for awaiting file input via Discord messages.
 * @property interaction ChatInputCommandInteraction Interaction used to prompt the user. @example interaction
 * @property prompt string Instructional text for the user. @example 'Upload an image or paste a link.'
 * @property timeoutMs number Optional timeout in milliseconds (default 2 minutes). @example 60000
 * @property cancelWords string[] Optional cancellation keywords (case-insensitive). @example ['cancel']
 * @property validator (attachment: AttachmentBuilder) => boolean | string Optional additional validation logic. @example (att) => att.size < MAX
 */
export interface AwaitFileInputOptions {
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    prompt: string;
    timeoutMs?: number;
    cancelWords?: string[];
    validator?: (attachment: Attachment) => boolean | string;
}

/** Default timeout (in milliseconds) applied when options.timeoutMs is not defined. */
const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000;
const FILE_TIMEOUT_KEY = `prompt.file.timeout`;
const FILE_CANCEL_KEY = `prompt.file.cancelled`;
const FILE_INVALID_KEY = `prompt.file.invalid`;
const FILE_MISSING_CHANNEL_KEY = `prompt.file.missingChannel`;

/**
 * Await an image attachment or direct image URL from the invoking user.
 * @param options AwaitFileInputOptions Configuration for the prompt and validation. @example await AwaitFileInput({ interaction, prompt: 'Upload an image.' })
 * @returns Promise<{ type: 'url' | 'attachment'; value: string | AttachmentBuilder }>
 * @throws Error When the user cancels, input is invalid, or the timeout elapses.
 */
export async function AwaitFileInput(options: AwaitFileInputOptions): Promise<{
    type: `url` | `attachment`;
    value: string | Attachment;
}> {
    const { interaction, prompt, timeoutMs = DEFAULT_TIMEOUT_MS, cancelWords, validator } = options;

    const payload = { content: prompt, flags: MessageFlags.Ephemeral } as const;
    const promptResponse = (await (interaction.replied || interaction.deferred
        ? interaction.followUp(payload)
        : interaction.reply(payload))) as Message;

    const channelId = interaction.channelId;
    if (!channelId) {
        throw new Error(TranslateFromContext(interaction.executionContext, FILE_MISSING_CHANNEL_KEY));
    }

    return await new Promise((resolve, reject) => {
        let timeoutHandle: NodeJS.Timeout | undefined;
        let settled = false;

        const cleanup = () => {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
                timeoutHandle = undefined;
            }
            MAIN_EVENT_BUS.off(`discord:message:raw`, onMessage);
        };

        const resolveWith = async(
            payload: { type: `url` | `attachment`; value: string | Attachment },
            message: Message,
        ) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();

            try {
                await interaction.webhook.deleteMessage(promptResponse.id);
            } catch(error) {
                log.warning(
                    `Failed to delete prompt message ${promptResponse.id}: ${error instanceof Error ? error.message : String(error)}`,
                    `Prompt/FileAsync`,
                );
            }

            try {
                await message.delete();
            } catch(error) {
                log.warning(
                    `Failed to delete file response ${message.id}: ${error instanceof Error ? error.message : String(error)}`,
                    `Prompt/FileAsync`,
                );
            }

            resolve(payload);
        };

        const rejectWith = async(error: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();

            try {
                await interaction.webhook.deleteMessage(promptResponse.id);
            } catch(deleteError) {
                log.warning(
                    `Failed to delete prompt message ${promptResponse.id}: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`,
                    `Prompt/FileAsync`,
                );
            }

            reject(error);
        };

        const onMessage = async(message: Message) => {
            if (settled) {
                return;
            }
            if (!message.author || message.author.bot) {
                return;
            }
            if (message.author.id !== interaction.user.id) {
                return;
            }
            if (message.channelId !== channelId) {
                return;
            }

            const validation = ValidateFileOrImageInput({
                content: message.content?.trim(),
                attachment: message.attachments.first(),
                validator,
                cancelWords,
            });

            if (validation.status === `cancel`) {
                await rejectWith(new Error(TranslateFromContext(interaction.executionContext, FILE_CANCEL_KEY)));
                return;
            }

            if (validation.status === `error` || !validation.value) {
                await message.reply(
                    validation.errorMessage
                        ?? TranslateFromContext(interaction.executionContext, FILE_INVALID_KEY),
                );
                return;
            }

            await resolveWith(validation.value, message);
        };

        timeoutHandle = setTimeout(
            () => {
                void rejectWith(new Error(TranslateFromContext(interaction.executionContext, FILE_TIMEOUT_KEY)));
            },
            Math.max(0, timeoutMs),
        );

        MAIN_EVENT_BUS.on(`discord:message:raw`, onMessage);
    });
}
