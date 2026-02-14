import type { ObjectDetail, ObjectRelationship } from '../../Flow/Object/FetchObjectDetail.js';
import type { ObjectViewPage, ObjectViewSelectOption } from '../ObjectViewTypes.js';
import { FormatRelationshipType } from '../DetailFormatters/FormatRelationshipType.js';
import { SplitIntoPages } from '../DetailPageUtils/SplitIntoPages.js';
import { DistributeSelectOptions } from '../DetailPageUtils/DistributeSelectOptions.js';

/**
 * Build pages listing all relationships with target references
 * Automatically splits across multiple pages when content is large
 * Attaches selectOptions to each page for interactive navigation
 * Returns empty array when no relationships exist
 *
 * @param detail ObjectDetail Full detail payload
 * @param title string Page title for relationship pages
 * @returns ObjectViewPage[] Formatted relationship pages
 */
export function BuildRelationshipsPages(
    detail: ObjectDetail,
    title: string,
): ObjectViewPage[] {
    if (detail.relationships.length === 0) {
        return [];
    }

    const lines: string[] = [];
    const allSelectOptions: ObjectViewSelectOption[] = [];
    const grouped = new Map<string, ObjectRelationship[]>();

    for (const relationship of detail.relationships) {
        const groupKey = `${relationship.direction}:${relationship.relationshipType}`;
        if (!grouped.has(groupKey)) {
            grouped.set(groupKey, []);
        }
        grouped.get(groupKey)!.push(relationship);
    }

    for (const [groupKey, relationships] of grouped) {
        const [direction, relType] = groupKey.split(`:`);
        const arrow = direction === `outgoing` ? `→` : `←`;
        const readableType = FormatRelationshipType(relType);
        lines.push(`**${arrow} ${readableType}**`);

        for (const relationship of relationships) {
            const targetLabel = relationship.targetLabels
                .filter((label: string) => { return label !== `Entity` && label !== `Node` && !label.startsWith(`DB`); })
                .join(`, `) || `Node`;
            lines.push(`  \`${relationship.targetUid}\` ${relationship.targetName} _(${targetLabel})_`);

            allSelectOptions.push({
                label: (relationship.targetName || relationship.targetUid).slice(0, 100),
                value: relationship.targetUid,
                description: `${targetLabel} (${readableType})`.slice(0, 100),
            });
        }
        lines.push(``);
    }

    const pages = SplitIntoPages(lines, title);

    // Distribute select options across pages proportionally
    DistributeSelectOptions(pages, allSelectOptions);

    return pages;
}
