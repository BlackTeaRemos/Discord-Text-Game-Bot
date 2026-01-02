import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import type { DescriptionScope } from '../Scope/Types.js';

/**
 * Custom ID prefix for scope selector interactions.
 */
export const SCOPE_SELECTOR_CUSTOM_ID = `description_scope_select`;

/**
 * Build a select menu component for choosing description scope.
 * @param scopes DescriptionScope[] Available scopes to display as options.
 * @param selectedScopeUid string | null Currently selected scope uid for default value.
 * @returns ActionRowBuilder<StringSelectMenuBuilder> Component row with select menu.
 * @example const row = BuildScopeSelectorComponent(scopes, 'org_123');
 */
export function BuildScopeSelectorComponent(
    scopes: DescriptionScope[],
    selectedScopeUid: string | null,
): ActionRowBuilder<StringSelectMenuBuilder> {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(SCOPE_SELECTOR_CUSTOM_ID)
        .setPlaceholder(`Select description scope`)
        .setMinValues(1)
        .setMaxValues(1);

    for (const scope of scopes) {
        const optionValue = scope.scopeUid ?? `__global__`;
        const isDefault = optionValue === (selectedScopeUid ?? `__global__`);

        selectMenu.addOptions({
            label: scope.label,
            value: optionValue,
            description: BuildScopeDescription(scope),
            default: isDefault,
        });
    }

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
}

/**
 * Generate description text for a scope option.
 * @param scope DescriptionScope Scope to describe.
 * @returns string Short description for select menu option.
 */
function BuildScopeDescription(scope: DescriptionScope): string {
    switch (scope.scopeType) {
        case `global`:
            return `Visible to everyone`;
        case `organization`:
            return `Visible to organization members`;
        case `user`:
            return `Visible only to you`;
        default:
            return `Custom scope`;
    }
}

/**
 * Resolve scope from select menu value.
 * @param scopes DescriptionScope[] Available scopes to search.
 * @param selectedValue string Value from select menu interaction.
 * @returns DescriptionScope | null Matching scope or null if not found.
 */
export function ResolveScopeFromSelection(
    scopes: DescriptionScope[],
    selectedValue: string,
): DescriptionScope | null {
    const normalizedValue = selectedValue === `__global__` ? null : selectedValue;

    for (const scope of scopes) {
        if (scope.scopeUid === normalizedValue) {
            return scope;
        }
    }

    return null;
}
