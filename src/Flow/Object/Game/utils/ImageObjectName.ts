/**
 * @deprecated Object name generation is no longer required because images are stored via direct URLs.
 * The function is retained for backward compatibility and will throw if invoked.
 */
export function GenerateGameImageObjectName(): string {
    throw new Error(`GenerateGameImageObjectName is deprecated.`);
}
