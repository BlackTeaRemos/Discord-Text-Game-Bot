/**
 * Legacy MinIO uploader kept for backward compatibility.
 * @deprecated Game preview images now use https URLs provided directly by Discord attachments or user links.
 * @param bucket Bucket name (unused)
 * @param objectName Object name (unused)
 * @param buffer Data buffer (unused)
 * @param contentType MIME type (unused)
 * @returns never
 */
export async function UploadImage(
    bucket: string,
    objectName: string,
    buffer: Buffer,
    contentType: string,
): Promise<string> {
    throw new Error(`UploadImage is deprecated. Provide an https image URL instead.`);
}
