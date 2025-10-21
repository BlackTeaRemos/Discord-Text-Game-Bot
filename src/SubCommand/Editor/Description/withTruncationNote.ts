export function WithTruncationNote(content: string, truncated: boolean) {
    return truncated
        ? `${content}\n
-- Preview truncated due to size --`
        : content;
}
