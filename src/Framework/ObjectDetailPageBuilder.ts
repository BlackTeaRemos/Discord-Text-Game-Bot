import type { ObjectDetail } from '../Flow/Object/FetchObjectDetail.js';
import type { ObjectAction } from '../Flow/Object/ResolveObjectActions.js';
import type { ObjectViewPage, ObjectViewModel } from './ObjectViewTypes.js';
import { BuildPropertyLines } from './DetailContentBuilders/BuildPropertyLines.js';
import { BuildRelationshipsPages } from './DetailContentBuilders/BuildRelationshipsPages.js';
import { BuildActionsPages } from './DetailContentBuilders/BuildActionsPages.js';
import { SplitIntoPages } from './DetailPageUtils/SplitIntoPages.js';
import { CompressPages } from './DetailPageUtils/CompressPages.js';
import { MAX_PAGE_LENGTH } from './DetailPageUtils/Constants.js';

/**
 * Options for building a detailed multi-page object view
 * @property detail ObjectDetail Full detail payload from FetchObjectDetail
 * @property objectType string Type discriminator for theming
 * @property description string | null Scoped description text
 * @property organizationName string | null Display name of the resolved org scope
 * @property actions ObjectAction[] Available slash commands for this object
 * @property noDescriptionLabel string Fallback text when description is absent
 * @property overviewLabels OverviewLabels Translated label strings for the overview page
 */
export interface BuildDetailPagesOptions {
    detail: ObjectDetail;
    objectType: string;
    description: string | null;
    organizationName: string | null;
    actions: ObjectAction[];
    noDescriptionLabel: string;
    overviewLabels: OverviewLabels;
    locale?: string;
}

/**
 * Translated label strings for the overview page fields
 * @property type string Label for type field
 * @property organization string Label for org field
 * @property createdAt string Label for creation date field
 * @property updatedAt string Label for last updated field
 * @property owner string Label for owner field
 * @property userScope string Fallback when no org is set
 * @property propertiesTitle string Title for properties page
 * @property relationshipsTitle string Title for relationships page
 * @property actionsTitle string Title for actions page
 */
export interface OverviewLabels {
    type: string;
    organization: string;
    createdAt: string;
    updatedAt: string;
    owner: string;
    userScope: string;
    propertiesTitle: string;
    relationshipsTitle: string;
    actionsTitle: string;
}

/**
 * Build a multi-page ObjectViewModel from raw object detail
 * Pages: Overview, Properties (if any), Relationships, Info (pre-last), Actions (last)
 *
 * @param options BuildDetailPagesOptions All data and labels needed
 * @returns ObjectViewModel Ready to pass to ObjectViewRenderer
 *
 * @example
 * const model = BuildDetailPages({ detail, objectType: 'game', ... });
 * await renderer.RenderInitial(interaction, model);
 */
export function BuildDetailPages(options: BuildDetailPagesOptions): ObjectViewModel {
    const { detail, objectType, description, organizationName, actions, noDescriptionLabel, overviewLabels, locale = `en` } = options;
    const displayName = String(detail.properties.friendly_name ?? detail.properties.name ?? detail.uid);

    const overviewPage = __BuildOverviewPage(detail, description, noDescriptionLabel);
    const propertyLines = BuildPropertyLines(detail, locale);
    const relationshipPages = BuildRelationshipsPages(detail, overviewLabels.relationshipsTitle);
    const infoPage = __BuildInfoPage(detail, objectType, organizationName, overviewLabels);
    const actionPages = BuildActionsPages(actions, overviewLabels.actionsTitle);

    // Inline properties into overview when they fit
    if (propertyLines.length > 0) {
        const propertiesText = propertyLines.join(`\n`);
        const combinedLength = (overviewPage.description?.length ?? 0) + propertiesText.length + 4;
        if (combinedLength <= MAX_PAGE_LENGTH) {
            overviewPage.description = `${overviewPage.description}\n\n${propertiesText}`;
        } else {
            const propertyPages = SplitIntoPages(propertyLines, overviewLabels.propertiesTitle, `\n`, `properties`);
            relationshipPages.unshift(...propertyPages);
        }
    }

    // Order: overview > relationships > info (pre-last) > actions (last)
    const allSections = [overviewPage, ...relationshipPages, infoPage, ...actionPages];
    const pages = CompressPages(allSections);

    return {
        id: detail.uid,
        objectType,
        name: displayName,
        friendlyName: detail.properties.friendly_name !== detail.properties.name
            ? String(detail.properties.friendly_name ?? ``)
            : undefined,
        thumbnailUrl: detail.properties.image ? String(detail.properties.image) : undefined,
        pages,
    };
}
/**
 * Build the overview page with description and uid only
 */
function __BuildOverviewPage(
    detail: ObjectDetail,
    description: string | null,
    noDescriptionLabel: string,
): ObjectViewPage {
    const descriptionBody = description?.slice(0, 1800) ?? noDescriptionLabel;
    const descriptionWithUid = `${descriptionBody}\n-# \`${detail.uid}\``;

    return {
        title: ``,
        description: descriptionWithUid,
        section: `overview`,
    };
}

/**
 * Build the information page with type, organization, timestamps and owner
 * Placed as pre-last page in the final view
 */
function __BuildInfoPage(
    detail: ObjectDetail,
    objectType: string,
    organizationName: string | null,
    labels: OverviewLabels,
): ObjectViewPage {
    const fields = [
        { name: labels.type, value: objectType, inline: true },
        { name: labels.organization, value: organizationName || labels.userScope, inline: true },
    ];

    if (detail.createdAt) {
        fields.push({
            name: labels.createdAt,
            value: `<t:${Math.floor(detail.createdAt / 1000)}:R>`,
            inline: true,
        });
    }

    if (detail.updatedAt) {
        fields.push({
            name: labels.updatedAt,
            value: `<t:${Math.floor(detail.updatedAt / 1000)}:R>`,
            inline: true,
        });
    }

    const ownerUserId = detail.properties.owner_user_id ?? detail.properties.ownerUserId;
    if (ownerUserId) {
        fields.push({
            name: labels.owner,
            value: `<@${String(ownerUserId)}>`,
            inline: true,
        });
    }

    return {
        title: labels.type,
        description: ``,
        fields,
        section: `info`,
    };
}
