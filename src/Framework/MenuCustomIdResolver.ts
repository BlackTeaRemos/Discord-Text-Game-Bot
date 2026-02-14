/**
 * Generates and resolves custom IDs for menu component interactions
 * Encapsulates the prefix:action:target format convention
 */
export class MenuCustomIdResolver {
    private readonly _prefix: string;

    /**
     * @param prefix string Custom ID prefix for namespacing. Example: 'menu'
     *
     * @example
     * const resolver = new MenuCustomIdResolver('settings_menu');
     */
    constructor(prefix: string) {
        this._prefix = prefix;
    }

    /**
     * Build a custom ID for navigating to a child node
     *
     * @param childId string Child node identifier. Example: 'audio'
     * @returns string Formatted custom ID. Example: 'menu:child:audio'
     */
    public ChildId(childId: string): string {
        return `${this._prefix}:child:${childId}`;
    }

    /**
     * Build the custom ID for the back navigation button
     * @returns string Custom ID. Example: 'menu:back'
     */
    public BackId(): string {
        return `${this._prefix}:back`;
    }

    /**
     * Build the custom ID for the root navigation button
     * @returns string Custom ID. Example: 'menu:root'
     */
    public RootId(): string {
        return `${this._prefix}:root`;
    }

    /**
     * Build the custom ID for the child select dropdown
     * @returns string Custom ID. Example: 'menu:select'
     */
    public SelectId(): string {
        return `${this._prefix}:select`;
    }

    /**
     * Extract the child node ID from a child navigation custom ID
     * Returns null if the custom ID does not match the child pattern
     *
     * @param customId string Full custom ID from the interaction. Example: 'menu:child:audio'
     * @returns string | null Extracted child ID or null
     */
    public ExtractChildId(customId: string): string | null {
        const match = customId.match(`${this._prefix}:child:(.+)`);
        if (!match || match.length < 2) {
            return null;
        }
        return match[1];
    }

    /**
     * Check whether a custom ID belongs to this resolver's namespace
     *
     * @param customId string Custom ID to test. Example: 'menu:child:audio'
     * @returns boolean True if the ID starts with this resolver's prefix
     */
    public IsRelevant(customId: string): boolean {
        return customId.startsWith(this._prefix);
    }
}
