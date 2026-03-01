import type { Message } from 'discord.js';
import { GameCreateFlowConstants } from '../../Flow/Object/Game/CreateState.js';
import { recallRenderers, type GameCreateStepContext } from '../../Flow/Object/Game/CreateTypes.js';
import { Log } from '../../Common/Log.js';
import { Translate } from '../../Services/I18nService.js';

/**
 * Process an image attachment or URL provided while updating the game preview
 * @param ctx GameCreateStepContext Flow state context @example await ProcessImageInput(ctx, message)
 * @param message Message Incoming Discord message from the user
 * @returns boolean True when the image update succeeds
 */
export async function ProcessImageInput(ctx: GameCreateStepContext, message: Message): Promise<boolean> {
    const content = message.content?.trim();
    const attachment = message.attachments.first();
    if (attachment) {
        const contentType = attachment.contentType ?? ``;
        const looksLikeImage =
            contentType.startsWith(`image/`) || /\.((png)|(jpe?g)|(gif)|(webp))$/i.test(attachment.name ?? ``);
        if (!looksLikeImage) {
            await message.reply(Translate(`prompt.image.invalidAttachment`));
            return false;
        }
        ctx.state.uploadInProgress = true;
        const renderers = recallRenderers(ctx);
        if (renderers) {
            await renderers.RenderControls(ctx, renderers.BuildControlsContent(ctx.state));
        }
        try {
            const httpsUrl = ensureHttpsUrl(attachment.url);
            ctx.state.imageUrl = httpsUrl;
            await message.reply(Translate(`prompt.image.updatedPreview`));
            return true;
        } catch (error) {
            Log.error(
                `Failed to process image: ${String(error)}`,
                GameCreateFlowConstants.logSource,
                `ProcessImageInput`,
            );
            await message.reply(error instanceof Error ? error.message : Translate(`prompt.image.uploadFailed`));
            return false;
        } finally {
            ctx.state.uploadInProgress = false;
        }
    }
    if (!content) {
        await message.reply(Translate(`prompt.image.requestInput`));
        return false;
    }
    if (content.toLowerCase() === `cancel`) {
        await message.reply(Translate(`prompt.image.cancelledShort`));
        return false;
    }
    try {
        const httpsUrl = ensureHttpsUrl(content);
        ctx.state.imageUrl = httpsUrl;
    } catch (error) {
        await message.reply(error instanceof Error ? error.message : Translate(`prompt.image.httpsRequired`));
        return false;
    }
    await message.reply(Translate(`prompt.image.urlSet`));
    return true;
}

function ensureHttpsUrl(raw: string): string {
    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        throw new Error(Translate(`prompt.image.invalidUrl`));
    }
    if (parsed.protocol !== `https:`) {
        throw new Error(Translate(`prompt.image.httpsRequired`));
    }
    return parsed.toString();
}
