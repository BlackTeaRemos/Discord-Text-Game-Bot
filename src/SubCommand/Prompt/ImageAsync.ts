import { Attachment, ChatInputCommandInteraction, Message, MessageFlags } from 'discord.js';
import { MAIN_EVENT_BUS } from '../../Events/MainEventBus.js';
import { log } from '../../Common/Log.js';
import { ValidateFileOrImageInput } from './File.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { TranslateFromContext } from '../../Services/I18nService.js';
import type { ExecutionContext } from '../../Domain/Command.js';

/**
 * Options controlling awaited image collection from a Discord user.
 * @property interaction ChatInputCommandInteraction Base interaction used for prompting. @example interaction
 * @property prompt string Instruction sent to user. @example "Send an image attachment to use as the game cover."
 * @property timeoutMs number | undefined Optional timeout before aborting (default 2 minutes). @example 120000
 * @property cancelWords string[] | undefined Cancellation keywords (default ['cancel']). @example ['cancel', 'stop']
 * @property maxFileSizeBytes number | undefined Maximum accepted file size in bytes. @example 10485760
 */
export interface AwaitImageInputOptions {
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    prompt: string;
    timeoutMs?: number;
    cancelWords?: string[];
    maxFileSizeBytes?: number;
}

/** Result from an awaited image prompt. */
export interface AwaitImageInputResult {
    url: string;
    objectName: string;
}

const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000;
const DEFAULT_CANCEL_WORDS = [`cancel`];
const TIMEOUT_ERROR_KEY = `prompt.image.timeout`;
const CANCELLATION_ERROR_KEY = `prompt.image.cancelled`;
const HTTPS_REQUIRED_KEY = `prompt.image.httpsRequired`;
const UPLOAD_ERROR_KEY = `prompt.image.uploadFailed`;
const ATTACHMENT_DELETE_DELAY_MS = 5000;

/**
 * Await an image from the commanding user via attachment or direct URL and return an https URL safe for Discord embeds.
 * @param options AwaitImageInputOptions Prompt and validation configuration. @example await AwaitImageInput({ interaction, prompt })
 * @returns Promise<AwaitImageInputResult> Stored image metadata including resulting URL.
 */
export async function AwaitImageInput(options: AwaitImageInputOptions): Promise<AwaitImageInputResult> {
    const cancelWords = options.cancelWords ?? DEFAULT_CANCEL_WORDS;
    const maxSize = options.maxFileSizeBytes;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const payload = { content: options.prompt, flags: MessageFlags.Ephemeral } as const;
    const promptResponse = (await (options.interaction.replied || options.interaction.deferred
        ? options.interaction.followUp(payload)
        : options.interaction.reply(payload))) as Message;

    const channelId = options.interaction.channelId;
    if (!channelId) {
        throw new Error(TranslateFromContext(options.interaction.executionContext, `prompt.image.missingChannel`));
    }

    const reportIssue = async (message: string): Promise<void> => {
        try {
            await options.interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
        } catch {
            // Ignore follow-up failures; initial prompt already reached the user.
        }
    };

    return await new Promise<AwaitImageInputResult>((resolve, reject) => {
        let timeoutHandle: NodeJS.Timeout | undefined;
        let settled = false;

        const cleanup = () => {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
                timeoutHandle = undefined;
            }
            MAIN_EVENT_BUS.off(`discord:message:raw`, onMessage);
        };

        const resolveWith = async (
            result: AwaitImageInputResult,
            sourceMessage: Message,
            shouldDeleteSource: boolean,
        ) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();

            try {
                await options.interaction.webhook.deleteMessage(promptResponse.id);
            } catch (error) {
                log.warning(
                    `Failed to delete prompt message ${promptResponse.id}: ${error instanceof Error ? error.message : String(error)}`,
                    `Prompt/ImageAsync`,
                );
            }

            if (shouldDeleteSource) {
                try {
                    await sourceMessage.delete();
                } catch (error) {
                    log.warning(
                        `Failed to delete user image message ${sourceMessage.id}: ${error instanceof Error ? error.message : String(error)}`,
                        `Prompt/ImageAsync`,
                    );
                }
            } else {
                setTimeout(() => {
                    void sourceMessage.delete().catch(error => {
                        log.warning(
                            `Deferred delete failed for image message ${sourceMessage.id}: ${error instanceof Error ? error.message : String(error)}`,
                            `Prompt/ImageAsync`,
                        );
                    });
                }, ATTACHMENT_DELETE_DELAY_MS);
            }

            resolve(result);
        };

        const rejectWith = async (error: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();

            try {
                await options.interaction.webhook.deleteMessage(promptResponse.id);
            } catch (deleteError) {
                log.warning(
                    `Failed to delete prompt message ${promptResponse.id}: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`,
                    `Prompt/ImageAsync`,
                );
            }

            reject(error);
        };

        const onMessage = async (message: Message) => {
            if (settled) {
                return;
            }
            if (!message.author || message.author.bot) {
                return;
            }
            if (message.author.id !== options.interaction.user.id) {
                return;
            }
            if (message.channelId !== channelId) {
                return;
            }

            const attachment = message.attachments.first();
            const content = message.content?.trim() ?? ``;
            const validation = ValidateFileOrImageInput({
                content,
                attachment,
                cancelWords,
                validator: fileValidator(maxSize, options.interaction.executionContext),
            });

            if (validation.status === `cancel`) {
                await rejectWith(new Error(TranslateFromContext(options.interaction.executionContext, CANCELLATION_ERROR_KEY)));
                return;
            }

            if (validation.status === `error`) {
                await reportIssue(
                    validation.errorMessage ?? TranslateFromContext(options.interaction.executionContext, UPLOAD_ERROR_KEY),
                );
                return;
            }

            if (!validation.value) {
                await reportIssue(TranslateFromContext(options.interaction.executionContext, `prompt.image.noImageDetected`));
                return;
            }

            try {
                if (validation.value.type === `attachment`) {
                    const result = await uploadAttachment(
                        validation.value.value as Attachment,
                        maxSize,
                        options.interaction.executionContext,
                    );
                    await resolveWith(result, message, false);
                } else {
                    const result = resolveExternalImage(validation.value.value as string, options.interaction.executionContext);
                    await resolveWith(result, message, true);
                }
            } catch (error) {
                const messageText = error instanceof Error
                    ? error.message
                    : TranslateFromContext(options.interaction.executionContext, UPLOAD_ERROR_KEY);
                await reportIssue(messageText);
            }
        };

        timeoutHandle = setTimeout(
            () => {
                void rejectWith(new Error(TranslateFromContext(options.interaction.executionContext, TIMEOUT_ERROR_KEY)));
            },
            Math.max(0, timeoutMs),
        );

        MAIN_EVENT_BUS.on(`discord:message:raw`, onMessage);
    });
}

function fileValidator(maxSize?: number, executionContext?: ExecutionContext) {
    if (!maxSize) {
        return undefined;
    }
    return (attachment: Attachment) => {
        if (typeof attachment.size === `number` && attachment.size > maxSize) {
            return TranslateFromContext(executionContext, `prompt.image.maxSize`, {
                params: { maxSizeMb: (maxSize / (1024 * 1024)).toFixed(1) },
            });
        }
        return true;
    };
}

async function uploadAttachment(
    attachment: Attachment,
    maxSize?: number,
    executionContext?: ExecutionContext,
): Promise<AwaitImageInputResult> {
    if (maxSize && typeof attachment.size === `number` && attachment.size > maxSize) {
        throw new Error(
            TranslateFromContext(executionContext, `prompt.image.maxSize`, {
                params: { maxSizeMb: (maxSize / (1024 * 1024)).toFixed(1) },
            }),
        );
    }
    const url = ensureHttpsUrl(attachment.url, executionContext);
    return { url, objectName: attachment.name ?? `image` };
}

function resolveExternalImage(url: string, executionContext?: ExecutionContext): AwaitImageInputResult {
    const normalized = ensureHttpsUrl(url, executionContext);
    const parsed = new URL(normalized);
    const objectName = extractFileName(parsed.pathname) ?? `image`;
    return { url: normalized, objectName };
}

function extractFileName(path: string): string | undefined {
    const segments = path.split(`/`).filter(Boolean);
    if (segments.length === 0) {
        return undefined;
    }
    return segments[segments.length - 1];
}

function ensureHttpsUrl(raw: string, executionContext?: ExecutionContext): string {
    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        throw new Error(TranslateFromContext(executionContext, `prompt.image.invalidUrl`));
    }
    if (parsed.protocol !== `https:`) {
        throw new Error(TranslateFromContext(executionContext, HTTPS_REQUIRED_KEY));
    }
    return parsed.toString();
}
