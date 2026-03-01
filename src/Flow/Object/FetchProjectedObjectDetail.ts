import { Log } from '../../Common/Log.js';
import { FetchObjectDetail } from './FetchObjectDetail.js';
import type { ObjectDetail } from './FetchObjectDetail.js';
import { ObjectProjectionRepository } from '../../Repository/GameObject/ObjectProjectionRepository.js';
import { GameObjectTemplateRepository } from '../../Repository/GameObject/GameObjectTemplateRepository.js';
import type { IObjectProjection } from '../../Domain/GameObject/Entity/Projection/IObjectProjection.js';
import type { ITemplateDisplayConfig } from '../../Domain/GameObject/Display/ITemplateDisplayConfig.js';
import type { IProjectionDisplayProfile } from '../../Domain/GameObject/Display/IProjectionDisplayProfile.js';
import type { IDisplayGroup } from '../../Domain/GameObject/Display/IDisplayGroup.js';
import type { IParameterDisplayConfig } from '../../Domain/GameObject/Display/IParameterDisplayConfig.js';

const LOG_TAG = `Flow/Object/FetchProjectedObjectDetail`;

/**
 * @brief Result of a projection aware object detail fetch
 */
export interface ProjectedObjectDetail {
    detail: ObjectDetail;
    projection: IObjectProjection;
    resolvedDisplayConfig: ITemplateDisplayConfig | undefined;
}

/**
 * @brief Fetches object detail through the lens of an organization projection
 *
 * Loads the raw ObjectDetail then replaces parameters_json with the projection known parameters
 * and resolves the full display config from the template projection display profile
 *
 * @param objectUid string Object unique identifier
 * @param organizationUid string Viewing organization identifier
 * @param includeHistory boolean Whether to include parameter history
 * @returns ProjectedObjectDetail or null when no projection exists
 */
export async function FetchProjectedObjectDetail(
    objectUid: string,
    organizationUid: string,
    includeHistory: boolean = false,
): Promise<ProjectedObjectDetail | null> {
    const projectionRepository = new ObjectProjectionRepository();

    const projection = await projectionRepository.GetByOrganizationAndObject(
        organizationUid,
        objectUid,
    );

    if (!projection) {
        return null;
    }

    const detail = await FetchObjectDetail(objectUid, includeHistory);

    if (!detail) {
        Log.warning(
            `Projection "${projection.uid}" exists but object "${objectUid}" not found in graph`,
            LOG_TAG,
        );
        return null;
    }

    const projectedParametersJson = JSON.stringify(projection.knownParameters);
    detail.properties.parameters_json = projectedParametersJson;
    detail.properties.name = projection.name;

    const resolvedDisplayConfig = await __ResolveProjectionDisplayConfig(
        projection.templateUid,
        projection.displayStyle,
    );

    return {
        detail,
        projection,
        resolvedDisplayConfig,
    };
}

/**
 * @brief Resolves a full display config from the template projection profiles
 * @param templateUid string Template identifier
 * @param displayStyle string Active display style name
 * @returns ITemplateDisplayConfig or undefined when no profile exists
 */
async function __ResolveProjectionDisplayConfig(
    templateUid: string,
    displayStyle: string,
): Promise<ITemplateDisplayConfig | undefined> {
    try {
        const templateRepository = new GameObjectTemplateRepository();
        const template = await templateRepository.GetByUid(templateUid);

        if (!template) {
            return undefined;
        }

        const configMap = template.projectionDisplayConfigs;
        if (!configMap || !configMap[displayStyle]) {
            return undefined;
        }

        const profile = configMap[displayStyle];
        const baseConfig = template.displayConfig;

        return __ResolveProfileToDisplayConfig(profile, baseConfig);
    } catch(error) {
        Log.warning(
            `Failed to resolve projection display config for template "${templateUid}": ${String(error)}`,
            LOG_TAG,
        );
        return undefined;
    }
}

/**
 * @brief Merges a projection display profile with the base config resolving linked groups
 * @param profile IProjectionDisplayProfile The projection profile to resolve
 * @param baseConfig ITemplateDisplayConfig or undefined The base template display config
 * @returns ITemplateDisplayConfig Fully resolved display config
 */
function __ResolveProfileToDisplayConfig(
    profile: IProjectionDisplayProfile,
    baseConfig: ITemplateDisplayConfig | undefined,
): ITemplateDisplayConfig {
    const resolvedGroups: IDisplayGroup[] = [];
    const resolvedParameterDisplay: IParameterDisplayConfig[] = [];

    const baseGroupMap = new Map<string, IDisplayGroup>();
    const baseParamsByGroup = new Map<string, IParameterDisplayConfig[]>();

    if (baseConfig) {
        for (const group of baseConfig.groups) {
            baseGroupMap.set(group.key, group);
        }
        for (const paramDisplay of baseConfig.parameterDisplay) {
            const groupKey = paramDisplay.group ?? `__ungrouped`;
            const existing = baseParamsByGroup.get(groupKey) ?? [];
            existing.push(paramDisplay);
            baseParamsByGroup.set(groupKey, existing);
        }
    }

    for (const entry of profile.groups) {
        if (entry.linked) {
            const baseGroup = baseGroupMap.get(entry.key);
            if (baseGroup) {
                resolvedGroups.push(baseGroup);
                const baseParams = baseParamsByGroup.get(entry.key) ?? [];
                resolvedParameterDisplay.push(...baseParams);
            }
        } else {
            resolvedGroups.push({
                key: entry.key,
                label: entry.label ?? entry.key,
                iconUrl: entry.iconUrl,
                sortOrder: entry.sortOrder ?? resolvedGroups.length,
            });
            if (entry.parameterDisplay) {
                resolvedParameterDisplay.push(...entry.parameterDisplay);
            }
        }
    }

    return {
        groups: resolvedGroups,
        parameterDisplay: resolvedParameterDisplay,
        charts: profile.charts ?? baseConfig?.charts,
        styleConfig: profile.styleConfig ?? baseConfig?.styleConfig,
    };
}
