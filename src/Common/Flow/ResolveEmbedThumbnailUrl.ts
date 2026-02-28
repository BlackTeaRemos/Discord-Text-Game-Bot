/**
 * @brief Resolve a thumbnail URL suitable for Discord embeds requiring HTTPS
 * @param url string or null or undefined Primary candidate URL
 * @param fallback string or null or undefined Secondary URL used when the primary is invalid
 * @returns string or undefined Sanitized HTTPS URL when available
 */
export function ResolveEmbedThumbnailUrl(url?: string | null, fallback?: string | null): string | undefined {
    const candidates = [url, fallback];
    for (const candidate of candidates) {
        const resolved = resolveCandidate(candidate);
        if (resolved) {
            return resolved;
        }
    }
    return undefined;
}

function resolveCandidate(candidate?: string | null): string | undefined {
    const trimmed = typeof candidate === `string` ? candidate.trim() : ``;
    if (!trimmed) {
        return undefined;
    }
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== `https:`) {
            return undefined;
        }
        return trimmed;
    } catch {
        return undefined;
    }
}
