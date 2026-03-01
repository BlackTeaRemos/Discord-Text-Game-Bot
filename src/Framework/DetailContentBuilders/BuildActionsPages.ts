import type { ObjectAction } from '../../Flow/Object/ResolveObjectActions.js';
import type { ObjectViewPage } from '../ObjectView/ObjectViewTypes.js';
import { SplitIntoPages } from '../DetailPageUtils/SplitIntoPages.js';

/**
 * Build pages listing available slash commands for this object
 * Splits across pages when many actions exist
 * Returns empty array when no actions exist
 *
 * @param actions ObjectAction[] Available slash commands
 * @param title string Page title for action pages
 * @returns ObjectViewPage[] Formatted action pages
 */
export function BuildActionsPages(
    actions: ObjectAction[],
    title: string,
): ObjectViewPage[] {
    if (actions.length === 0) {
        return [];
    }

    const lines = actions.map(action => {
        return `\`${action.command}\`\n-# ${action.description}`;
    });

    return SplitIntoPages(lines, title, `\n\n`, `actions`);
}
