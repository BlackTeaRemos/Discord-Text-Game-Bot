import type { Message } from 'discord.js';
import { GameCreateFlowConstants } from '../../Flow/Object/Game/CreateState.js';
import { recallRenderers, type GameCreateStepContext } from '../../Flow/Object/Game/CreateTypes.js';
import { log } from '../../Common/Log.js';

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
            const httpsUrl = ensureHttpsUrl(attachment.url);
            ctx.state.imageUrl = httpsUrl;
            await message.reply(`Image updated for preview.`);
            return true;
        } catch (error) {
            log.error(
                `Failed to process image: ${String(error)}`,
                GameCreateFlowConstants.logSource,
                `ProcessImageInput`,
            );
            await message.reply(error instanceof Error ? error.message : `Processing the image failed.`);
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
    try {
        const httpsUrl = ensureHttpsUrl(content);
        ctx.state.imageUrl = httpsUrl;
    } catch (error) {
        await message.reply(error instanceof Error ? error.message : `Provide a direct https image URL.`);
        return false;
    }
    await message.reply(`Image URL set for preview.`);
    return true;
}

function ensureHttpsUrl(raw: string): string {
    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        throw new Error(`Provide a valid image URL starting with https.`);
    }
    if (parsed.protocol !== `https:`) {
        throw new Error(`Image URLs must use https.`);
    }
    return parsed.toString();
}
