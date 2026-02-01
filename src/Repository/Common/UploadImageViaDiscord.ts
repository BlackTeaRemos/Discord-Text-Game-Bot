/**
 * @deprecated Images are now referenced directly from user-provided URLs or attachments.
 * This helper is retained only for backward compatibility and should not be used.
 */
export async function UploadImageViaDiscord(): Promise<string> {
    throw new Error(`UploadImageViaDiscord is deprecated. Use direct attachment URLs instead.`);
}
