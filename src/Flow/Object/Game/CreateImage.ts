import type { Message } from 'discord.js';
import { GameCreateFlowConstants } from './CreateState.js';
import type { GameCreateStepContext } from './CreateTypes.js';
import { recallRenderers } from './CreateTypes.js';
import { log } from '../../../Common/Log.js';
import { UploadImage } from '../../../Repository/Common/UploadImage.js';

/**
 * Process an image attachment or URL provided while updating the game preview.
 * @param ctx GameCreateStepContext Flow state context. @example await ProcessImageInput(ctx, message)
 * @param message Message Incoming Discord message from the user.
 * @returns Promise<boolean> True when the image update succeeds.
 */
export async function ProcessImageInput(ctx: GameCreateStepContext, message: Message): Promise<boolean> {
    const content = message.content?.trim();
    const attachment = message.attachments.first();
    if (attachment) {
        const contentType = attachment.contentType ?? ``;
        const looksLikeImage =
            contentType.startsWith(`image/`) || /\.((png)|(jpe?g)|(gif)|(webp))$/i.test(attachment.name ?? ``);
        if (!looksLikeImage) {
            await message.reply(`Provide an actual image attachment or paste a direct URL.`);
            return false;
        }
        ctx.state.uploadInProgress = true;
        const renderers = recallRenderers(ctx);
        if (renderers) {
            await renderers.RenderControls(ctx, renderers.BuildControlsContent(ctx.state));
        }
        try {
            const response = await fetch(attachment.url);
            const buffer = Buffer.from(await response.arrayBuffer());
            const objectName = `${ctx.userId}_${Date.now()}_${attachment.name ?? `image`}`;
            const uploadedUrl = await UploadImage(
                GameCreateFlowConstants.imageBucket,
                objectName,
                buffer,
                contentType || `application/octet-stream`,
            );
            ctx.state.imageUrl = uploadedUrl;
            await message.reply(`Image updated for preview.`);
            return true;
        } catch (error) {
            log.error(
                `Failed to upload image: ${String(error)}`,
                GameCreateFlowConstants.logSource,
                `ProcessImageInput`,
            );
            await message.reply(`Uploading the image failed. Try again or paste a direct URL.`);
            return false;
        } finally {
            ctx.state.uploadInProgress = false;
        }
    }
    if (!content) {
        await message.reply(`Send an image attachment or paste a direct image URL.`);
        return false;
    }
    if (content.toLowerCase() === `cancel`) {
        await message.reply(`Image update cancelled.`);
        return false;
    }
    const urlLooksValid = /^https?:\/\//i.test(content);
    if (!urlLooksValid) {
        await message.reply(`Provide a direct image URL starting with http or https.`);
        return false;
    }
    ctx.state.imageUrl = content;
    await message.reply(`Image URL set for preview.`);
    return true;
}
