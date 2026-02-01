export interface FilePromptValidationOptions {
    content?: string;
    attachment?: any;
    validator?: (attachment: any) => boolean | string;
    cancelWords?: string[];
}

/**
 * Result from file or image validation.
 * @property status 'ok' | 'cancel' | 'error' Indicates validation outcome. @example 'ok'
 * @property value any | undefined Validated URL or attachment object if ok. @example { type: 'url', value: 'http://...' }
 * @property errorMessage string | undefined Error details if validation failed. @example 'Invalid file type'
 */
export interface FilePromptValidationResult {
    status: `ok` | `cancel` | `error`;
    value?: { type: `url` | `attachment`; value: any };
    errorMessage?: string;
}

/**
 * Validate file or image input (pure business logic, no Discord API interactions).
 * @param options FilePromptValidationOptions Configuration for validation. @example ValidateFileOrImageInput({ attachment: discordAttachment });
 * @returns FilePromptValidationResult Validation result. @example { status: 'ok', value: { type: 'attachment', value: {...} } }
 */
export function ValidateFileOrImageInput(options: FilePromptValidationOptions): FilePromptValidationResult {
    const { content, attachment, validator, cancelWords = [] } = options;

    const contentLower = content?.toLowerCase() ?? ``;
    if (
        cancelWords.some(word => {
            return contentLower.includes(word);
        })
    ) {
        return { status: `cancel` };
    }

    if (attachment) {
        const contentType = attachment.contentType ?? ``;
        const looksLikeImage =
            contentType.startsWith(`image/`) || /\.(png|jpe?g|gif|webp)$/i.test(attachment.name ?? ``);
        if (!looksLikeImage) {
            return { status: `error`, errorMessage: `Attachment is not an image.` };
        }

        if (validator) {
            const result = validator(attachment);
            if (result === false) {
                return { status: `error`, errorMessage: `Attachment validation failed.` };
            }
            if (typeof result === `string`) {
                return { status: `error`, errorMessage: result };
            }
        }

        return { status: `ok`, value: { type: `attachment`, value: attachment } };
    }

    if (content) {
        const urlLooksValid = /^https?:\/\//i.test(content);
        if (!urlLooksValid) {
            return { status: `error`, errorMessage: `Provide a direct image URL starting with http or https.` };
        }
        return { status: `ok`, value: { type: `url`, value: content } };
    }

    return { status: `error`, errorMessage: `No input provided.` };
}
